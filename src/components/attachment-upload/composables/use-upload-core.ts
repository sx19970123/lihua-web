import {message, Upload, type UploadFile, type UploadRequestOption, type VcFile} from "@/antd-adapter"
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
  // 公开附件模式：上传公开附件，双向绑定回写附件 path（对象键）而非附件 id
  const isPublicMode = ctx.public

  // 分片链路后于本 composable 创建（其回调依赖此处产物），入口经晚绑定注入
  let chunkApi: ChunkUploadApi | undefined
  const bindChunkApi = (api: ChunkUploadApi) => {
    chunkApi = api
  }

  // 秒传等待「文件进入列表」change 事件的信号（per-uid：多文件并发秒传各自等自己的 change，
  // 互不覆盖、也不被无关文件的 change 误唤醒——全局单信号在并发下会丢等待者）
  const pendingFileChanges = new Set<string>()
  const fileChangeNotifiers = new Map<string, () => void>()
  const markFileChangePending = (uid: string) => pendingFileChanges.add(uid)
  const waitFileListChanged = (uid: string) => new Promise<void>(resolve => {
    if (!pendingFileChanges.has(uid)) {
      return resolve()
    }
    fileChangeNotifiers.set(uid, resolve)
  })

  // 本批已接受但尚未进入列表的文件（配额在途计数：文件经 change 入列表后由 fileList 承担，届时对账移除）
  const batchAcceptedUids = new Set<string>()

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

    // 控制附件上传最大数（数量约束由本组件判定，不透传给 a-upload 的 maxCount——其整批截断
    // 策略无超量事件，与组件 exceed 契约不符）。判定基数不能取 currentFileList（它是本批全量，
    // 批内兄弟文件会被重复计入）：已入列表的由 fileList 计数，本批已接受未入列的由 batchAcceptedUids 计数
    if (fileList.value.length + batchAcceptedUids.size + 1 > maxCount) {
      emits("exceedMaxCount", file)
      return Upload.LIST_IGNORE;
    }
    batchAcceptedUids.add(file.uid)

    if (chunk) {
      // 分片上传（链路内部全量兜底异常，此处 fire-and-forget）
      chunkApi?.startChunkUpload(file)
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
    // 判断附件后缀（大小写不敏感，与预览侧的后缀判定对齐）
    if (!uploadType.includes("." + split[split.length - 1].toLowerCase())) {
      message.error("仅支持上传 " + uploadType.join(" ") + " 附件");
      return false;
    }
    return true;
  }

  // 处理更新双向绑定
  const handleModelValue = (file: UploadFile, fileList: Array<UploadFile>) => {
    // 通过fileList获取双向绑定值
    const modelValueList = fileList.filter(item => item.status === "done").map(item => {
      // 有url的直接返回（url内容为附件表id；公开附件模式下为附件 path）
      if (item.url) {
        return item.url
      }
      // 有response数据获取统一 VO 的回写值（公开附件模式取 path，其余取 id；onSuccess 仅在业务码 200 时调用，此处 resp 必为成功）
      if (item.response) {
        const resp = item.response as {code: number, msg: string, data?: AttachmentUploadVO}
        const value = isPublicMode ? resp.data?.path : resp.data?.id
        // 向fileList赋值URL
        fileList.forEach(item => {
          if (item.uid === file.uid) {
            item.url = value
          }
        })
        return value
      }
    })

    const modelValue = joinAttachmentIds(modelValueList)
    lastModelValue.value = modelValue
    // 处理双向绑定
    emits("update:modelValue", modelValue)
  }

  // 处理附件上传变化（uploading：上传中 done：上传成功 error：上传失败 removed：已删除）
  const handleChange = ({file, fileList}: {file: UploadFile, fileList: Array<UploadFile>}) => {
    // 文件已进入列表：从在途计数移除（配额改由 fileList 承担）；置于状态分支前，任意首个状态都会对账
    batchAcceptedUids.delete(file.uid)

    // 唤醒等待该文件 change 的秒传流程（per-uid 匹配，无关文件的 change 不影响其他等待者）
    if (pendingFileChanges.delete(file.uid)) {
      fileChangeNotifiers.get(file.uid)?.()
      fileChangeNotifiers.delete(file.uid)
    }

    if (!file.status || file.status === "uploading") {
      // 入列前已判失败的文件（md5 计算失败/断网 worker 加载失败等：失败发生在 antd 把文件放入
      // 列表之前，error 标记落不到条目）：首个 change 到达时补标 error，条目呈红色失败态可手动移除
      // （否则为无状态黑色文本残留）。注意：beforeUpload 返回 false 的场景下 change 的 file 是
      // vnext onBatchStart 构造的 File/Blob 复制品而非列表条目本体，补标必须落在渲染列表的条目上
      if (failedBeforeListed.delete(file.uid)) {
        fileList.forEach(item => {
          if (item.uid === file.uid) {
            item.status = "error"
          }
        })
        emits("uploadError", file)
      }
      return
    }

    // 附件上传失败（onError 路径的业务错误信息挂在 file.error；此处补全局提示——
    // 业务码非 200 拦截器不提示，组件是该层提示的责任方）
    if (file.status === "error") {
      message.error(file.error?.message ?? "附件上传失败")
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
      // 业务附件恒私密（public 不传，服务端默认 false），公开附件模式显式传 true；
      // 业务标签取 startUpload 阶段构建的附件对象。
      // 业务码非 200 走 onError：文件直接落 error 态（onSuccess 会让 antd 置 done → 先发 uploadSuccess
      // 再由回写改判 error 的事件矛盾），业务失败提示由全局拦截器/上传失败事件承担
      const resp = await uploadAttachment(file as unknown as File, {
        public: isPublicMode,
        businessCode: sysAttachment.value.businessCode,
        businessName: sysAttachment.value.businessName
      })
      if (resp.code === 200) {
        options.onSuccess?.(resp, file)
      } else {
        options.onError?.(new Error(resp.msg), file)
      }
    } catch (e) {
      options.onError?.(e as Error, file)
    }
  }

  // 一般附件上传前置：返回 true 交由 a-upload 走 handleCustomRequest，返回 false 执行附件秒传逻辑
  const startUpload = async (file: VcFile): Promise<boolean> => {
    // 1. 获取附件md5（失败时终止本次上传并标记错误，不让异常逃逸到 a-upload）
    let md5: string
    try {
      // 非空断言：chunkApi 在组件装配期经晚绑定注入，beforeUpload 触发时必已就位
      md5 = await chunkApi!.handleCalculateHash(file)
    } catch {
      handleUploadError(file, "附件哈希计算失败")
      return false
    }
    // 2. 根据md5向后端查询数据库，判断附件是否需要上传（网络异常终止：文件未入列，
    // 须主动回收在途配额，否则 uid 幽灵占用 maxCount；失败收口负责提示与入列后标红）
    let resp: Awaited<ReturnType<typeof existsAttachmentByMd5>>
    try {
      resp = await existsAttachmentByMd5(md5)
    } catch {
      batchAcceptedUids.delete(file.uid)
      handleUploadError(file, "附件秒传校验失败，请重试")
      return false
    }
    if (resp.code === 200) {
      if (resp.data) {
        markFileChangePending(file.uid)
        // 附件存在，无需上传，执行附件秒传逻辑
        handleFastUpload(file, md5)
        return false
      }
      // 构建附件对象
      buildSysAttachment(file, md5)
      return true
    }
    // 服务器返回可控制的错误时，继续上传附件
    buildSysAttachment(file, md5)
    console.error(resp.msg, "为业务正常进行，继续上传附件")
    return true
  }

  // 处理附件秒传（uploaded 显式判定：未命中=附件在 exists 与秒传之间被移除的竞态）
  const handleFastUpload = (file: UploadFile, md5: string) => {
    // 构建 sysAttachment
    buildSysAttachment(file, md5, UPLOAD_MODE.FAST)
    fastUpload(sysAttachment.value).then(async (resp) => {
      // 等待该文件「进入列表」的 change 事件处理完成（秒传响应先到时保证回写顺序）
      await waitFileListChanged(file.uid)
      if (resp.code === 200 && resp.data?.uploaded) {
        // 公开附件模式回写 path，其余回写附件表 id
        const value = isPublicMode ? resp.data.path : resp.data.id
        fileList.value.forEach(item => {
          if (item.uid === file.uid) {
            item.url = value
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

  // 处理附件上传失败（统一收口：全局提示 + 列表条目标 error + 事件；error 文案必传——
  // 网络类异常（ResponseError）拦截器已提示过，调用方传泛文案避免重复弹）
  const failedBeforeListed = new Set<string>()
  const handleUploadError = (file: UploadFile, errorMsg: string) => {
    message.error(errorMsg)
    fileList.value.forEach(item => {
      if (item.uid === file.uid) {
        item.status = "error"
      }
    })
    // 文件尚未入列（beforeUpload 阶段失败）时登记，由 handleChange 首个 change 补标
    failedBeforeListed.add(file.uid)
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
