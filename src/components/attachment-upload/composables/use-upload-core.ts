import {message, Upload, type UploadFile, type UploadRequestOption, type VcFile} from "@/antd-adapter"
import {ref} from "vue"
import {existsAttachmentByMd5, fastUpload, uploadAttachment} from "@/api/system/attachment/attachment-storage.ts"
import type {AttachmentUploadVO} from "@/api/system/attachment/type/attachment-upload-vo.ts"
import type {ChunkUploadApi, UploadContext} from "./types.ts"
import type {UploadState} from "./use-upload-state.ts"
import {UPLOAD_MODE} from "./constants.ts"
import {joinAttachmentIds} from "./model-value.ts"

/**
 * 上传核心：上传前置校验、一般上传（axios 管线）/秒传分流、双向绑定回写与失败收尾
 */
export const useUploadCore = (ctx: UploadContext & {
  uploadState: UploadState
  lastModelValue: { value: string | undefined }
  maxCount: number
  maxSize: number
  uploadType: string[]
  chunk: boolean
}) => {
  const {emits, fileList, sysAttachment, buildSysAttachment, uploadState, lastModelValue, maxCount, maxSize, uploadType, chunk} = ctx

  // 分片链路后于本 composable 创建（其回调依赖此处产物），入口经晚绑定注入
  let chunkApi: ChunkUploadApi | undefined
  const bindChunkApi = (api: ChunkUploadApi) => {
    chunkApi = api
  }

  // 秒传等待「文件进入列表」change 事件的信号：事件驱动，替代定时轮询
  const awaitHandleFile = ref<boolean>(false)
  let notifyFileListChanged: (() => void) | undefined
  const waitFileListChanged = () => awaitHandleFile.value
      ? new Promise<void>(resolve => { notifyFileListChanged = resolve })
      : Promise.resolve()

  // 附件上传前检验，同时进行不同上传逻辑的区分（beforeUpload 实参为 VcFile：原生 File + uid）
  const beforeUpload = async (file: VcFile, currentFileList: VcFile[]) => {
    // 获取附件数据异常
    if (!file || !file.name || !file.size) {
      message.error("获取附件数据异常")
      return Upload.LIST_IGNORE;
    }

    // 验证附件大小和类型
    if (!checkSize(file.size) || !checkType(file.name)) {
      return Upload.LIST_IGNORE;
    }

    // 控制附件上传最大数（currentFileList 已包含本次进入的文件；数量约束由本组件判定，
    // 不透传给 a-upload 的 maxCount——其整批截断策略会丢弃全部文件而非仅拒收超量部分）
    if (currentFileList.length > maxCount) {
      emits("exceedMaxCount", file)
      return Upload.LIST_IGNORE;
    }

    if (chunk) {
      // 分片上传
      chunkApi?.startChunkUpload(file).then(() => {})
      return false;
    } else {
      // 一般上传
      return await startUpload(file)
    }
  }

  // 检查附件大小（字节直接比较：Math.ceil 会把 1 字节文件按 1MB 判定）
  const checkSize = (size: number): boolean => {
    const flag = maxSize * 1024 * 1024 >= size
    if (!flag) {
      message.error("仅允许上传" + maxSize + "MB以内的附件")
    }
    return flag;
  }

  // 检查附件类型
  const checkType = (fileName: string): boolean => {
    const split = fileName.split(".")
    // 附件没有后缀（split 结果恒非空，无后缀时为单元素）
    if (split.length === 1) {
      message.error("未知的附件类型")
      return false;
    }
    // 可上传的附件类型为空不进行限制
    if (uploadType.length === 0) {
      return true;
    }
    // 判断附件后缀
    if (!uploadType.includes("." + split[split.length - 1])) {
      message.error("仅支持上传 " + uploadType.join(" ") + " 附件");
      return false;
    }
    return true;
  }

  // 处理更新双向绑定
  const handleModelValue = (file: UploadFile, fileList: Array<UploadFile>) => {
    // 通过fileList获取双向绑定值
    const modelValueList = fileList.filter(item => item.status === "done").map(item => {
      // 有url的直接返回（url内容为附件表id）
      if (item.url) {
        return item.url
      }
      // 有response数据获取统一 VO 的 id。code不为200调用上传失败
      if (item.response) {
        const resp = item.response as {code: number, msg: string, data?: AttachmentUploadVO}
        if (resp.code === 200) {
          const id = resp.data?.id
          // 向fileList赋值URL
          fileList.forEach(item => {
            if (item.uid === file.uid) {
              item.url = id
            }
          })
          return id
        } else {
          // 后端返回非200，标记为上传失败
          fileList.forEach(item => {
            if (item.uid === file.uid) {
              item.status = "error"
            }
          })
          emits("uploadError", file)
        }
      }
    })

    const modelValue = joinAttachmentIds(modelValueList)
    lastModelValue.value = modelValue
    // 处理双向绑定
    emits("update:modelValue", modelValue)
  }

  // 处理附件上传变化（uploading：上传中 done：上传成功 error：上传失败 removed：已删除）
  const handleChange = ({file, fileList}: {file: UploadFile, fileList: Array<UploadFile>}) => {
    // 唤醒等待本次 change 的秒传流程
    awaitHandleFile.value = false
    notifyFileListChanged?.()
    notifyFileListChanged = undefined

    if (!file.status || file.status === "uploading") {
      return
    }

    // 附件上传失败
    if (file.status === "error") {
      emits("uploadError", file)
    }

    // 附件上传成功
    if (file.status === "done") {
      emits("uploadSuccess", {file, fileList});
    }

    // 附件删除回调
    if (file.status === "removed") {
      emits("remove", file)
    }

    // 处理双向绑定
    handleModelValue(file, fileList)
  }

  // 一般附件上传管线（axios 统一携带凭证，响应挂到 file.response 供 handleChange/handleModelValue 消费）
  const handleCustomRequest = async (options: UploadRequestOption) => {
    const file = options.file as VcFile
    try {
      // 业务附件恒私密：public 不传（服务端默认 false）；业务标签取 startUpload 阶段构建的附件对象
      const resp = await uploadAttachment(file as unknown as File, {
        businessCode: sysAttachment.value.businessCode,
        businessName: sysAttachment.value.businessName
      })
      options.onSuccess?.(resp, file)
    } catch (e) {
      options.onError?.(e as Error, file)
    }
  }

  // 一般附件上传前置：返回 true 交由 a-upload 走 handleCustomRequest，返回 false 执行附件秒传逻辑
  const startUpload = (file: VcFile) => {
    return new Promise(async (resolve) => {

      // 1. 获取附件md5（失败时终止本次上传并标记错误，不让异常逃逸到 a-upload）
      let md5: string
      try {
        md5 = await chunkApi?.handleCalculateHash(file) as string
      } catch {
        handleUploadError(file, "附件哈希计算失败")
        resolve(false)
        return
      }
      // 2. 根据md5向后端查询数据库，判断附件是否需要上传
      const resp = await existsAttachmentByMd5(md5)
      if (resp.code === 200) {
        if (resp.data) {
          awaitHandleFile.value = true
          resolve(false)
          // 附件存在，无需上传，执行附件秒传逻辑
          handleFastUpload(file, md5)
        } else {
          // 构建附件对象
          buildSysAttachment(file, md5)
          resolve(true)
        }
      } else {
        // 服务器返回可控制的错误时，继续上传附件
        buildSysAttachment(file, md5)
        resolve(true)
        console.error(resp.msg, "为业务正常进行，继续上传附件")
      }
    })
  }

  // 处理附件秒传（uploaded 显式判定：未命中=附件在 exists 与秒传之间被移除的竞态）
  const handleFastUpload = (file: UploadFile, md5: string) => {
    // 构建 sysAttachment
    buildSysAttachment(file, md5, UPLOAD_MODE.FAST)
    fastUpload(sysAttachment.value).then(async (resp) => {
      // 等待「文件进入列表」change 事件处理完成（秒传响应先到时保证回写顺序）
      await waitFileListChanged()
      if (resp.code === 200 && resp.data?.uploaded) {
        const id = resp.data.id
        fileList.value.forEach(item => {
          if (item.uid === file.uid) {
            item.url = id
            item.status = "done"
          }
        })
        // 处理双向绑定
        handleModelValue(file, fileList.value)
        emits("uploadSuccess", {file, fileList: fileList.value})
        uploadState.uploading = false
      } else {
        handleUploadError(file, resp.code === 200 ? "附件秒传未命中，请重新上传" : resp.msg)
      }
    })
  }

  // 处理附件上传失败
  const handleUploadError = (file: UploadFile, errorMsg: string) => {
    fileList.value.forEach(item => {
      if (item.uid === file.uid) {
        item.status = "error"
      }
    })
    uploadState.uploading = false
    emits("uploadError", file, errorMsg)
  }

  return {
    bindChunkApi,
    beforeUpload,
    handleChange,
    handleCustomRequest,
    handleFastUpload,
    handleModelValue,
    handleUploadError
  }
}
