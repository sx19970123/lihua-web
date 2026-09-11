<template>
  <!-- description 容器随内容收缩，不设最小宽度时进度条会缩到与文案同宽 -->
  <a-spin :spinning="uploading" :styles="{description: {minWidth: '200px', textAlign: 'center'}}">
    <!--  分片进度条loading  -->
    <template #description>
      <!--   计算md5   -->
      <div v-if="status === 'MD5'">
        <div class="mb-ant-xxs">正在处理</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="progress"/>
      </div>
      <!--   上传   -->
      <div v-if="status === 'UPDATE'">
        <div class="mb-ant-xxs">正在上传</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="progress"/>
      </div>
      <!--   合并   -->
      <div v-if="status === 'MERGE'">
        <div class="mb-ant-xxs">正在合并</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="100"/>
      </div>
    </template>
    
    <a-upload v-if="mode === 'button' || mode === 'picture'"
              v-model:file-list="fileList"
              :action="uploadURL"
              :headers="{Authorization: authorization}"
              :data="sysAttachment"
              :list-type="mode === 'picture' ? 'picture-card' : 'text'"
              :before-upload="beforeUpload"
              :directory="chunk ? false : directory"
              :multiple="chunk ? false : multiple"
              :max-count="maxCount"
              :isImageUrl="handleShowThumbImage"
              @preview="handlePreview"
              @change="handleChange"
              @remove="handleRemove"
    >
      <!--      picture 模式预览图标按文件类型切换；动作按钮外框（text 型小按钮 + item-action hover 样式）与预览点击由 UploadList 统一渲染，插槽只提供图标-->
      <template #previewIcon="data">
        <CloudDownloadOutlined v-if="!imageExtensions.includes(data.file.name.toLowerCase().split('.').pop()) &&
                                     !videoExtensions.includes(data.file.name.toLowerCase().split('.').pop())"/>
        <EyeOutlined v-else/>
      </template>
      <!--    按钮上传-->
      <a-button v-if="mode === 'button'">
        <component :is="icon ? icon : 'upload-outlined'"></component>
        {{text ? text : '点击上传'}}
      </a-button>
      <!--    图片上传-->
      <div v-if="mode === 'picture'">
        <component :is="icon ? icon : 'plus-outlined'"></component>
        <div style="margin-top: var(--ant-margin-xs)">{{text ? text : '点击上传'}}</div>
      </div>
    </a-upload>
    <!--    拖拽上传-->
    <a-upload-dragger v-else
                      v-model:file-list="fileList"
                      :action="uploadURL"
                      :headers="{Authorization: authorization}"
                      :before-upload="beforeUpload"
                      :data="sysAttachment"
                      :directory="chunk ? false : directory"
                      :multiple="chunk ? false : multiple"
                      :max-count="maxCount"
                      @preview="handlePreview"
                      @change="handleChange"
                      @remove="handleRemove"
    >
      <p class="ant-upload-drag-icon">
        <component :is="icon ? icon : 'inbox-outlined'"></component>
      </p>
      <p class="ant-upload-text">{{text ? text : '点击或拖拽上传'}}</p>
      <p class="ant-upload-hint">{{description}}</p>
    </a-upload-dragger>
    <!--    图片/视频预览-->
    <a-modal :open="previewVisible" :title="previewTitle" :footer="null" @cancel="handleCancel" destroyOnClose>
      <a-image style="border-radius: var(--ant-border-radius-lg)" :preview="{maskClassName: 'attachment-upload-preview-mask'}" :src="previewURL" v-if="previewType === 'image'"/>
      <video style="width: 100%;border-radius: var(--ant-border-radius-lg)" controls preload="auto" :src="previewURL" v-if="previewType === 'video'"/>
    </a-modal>
  </a-spin>
</template>

<script setup lang="ts">
import {message, Modal, Upload, type UploadFile, type VcFile} from "@/antd-adapter";
import {h, onUnmounted, ref, watch} from "vue";
import {useRoute} from "vue-router";
import token from "@/helpers/token.ts";
import {
  CHUNK_MD5_QUERY,
  chunksMerge,
  chunksUpload,
  chunksUploadedIndex,
  chunksUploadStart,
  deleteFromBusiness,
  existsAttachmentByMd5,
  fastUpload,
  queryAttachmentInfoByIds
} from "@/api/system/attachment/attachment-storage.ts";
import {getDownloadURL} from "@/api/system/attachment/attachment.ts";
import {ResponseError} from "@/api/global/type.ts";
import {currentRequests} from "@/utils/request.ts";
import type {SysAttachment} from "@/api/system/attachment/type/sys-attachment.ts";
import {download} from "@/utils/attachment-download.ts";
import {ExclamationCircleOutlined} from '@antdv-next/icons';
import {useThemeStore} from "@/stores/theme.ts";

const { getToken } = token

const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]
const videoExtensions = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"]
const baseAPI = import.meta.env.VITE_APP_BASE_API
const uploadURL = `${baseAPI}/system/attachment/storage/upload`
const chunk_upload_prefix = "upload-record-"
// 上传方式字典 sys_attachment_upload_mode 的值域（0=一般上传 1=分片 2=秒传）
const UPLOAD_MODE = {COMMON: "0", CHUNK: "1", FAST: "2"} as const
// hash 计算的读取分片大小（MB）：仅为 web worker 流式读取，与上传分片大小（chunkSize）无关
const HASH_CHUNK_SIZE_MB = 10
const authorization = 'Bearer ' + getToken()
const router = useRoute()
const themeStore = useThemeStore()
const lastModelValue = ref<string>()

// 参数
const {mode = 'button', icon, text, uploadType = [], description, maxCount = 10, maxSize = 10, multiple = true, directory = false, modelValue = "", businessCode, businessName, chunk = false, chunkSize = 20, chunkUploadCount = 3, fileName, autoRemove = false} = defineProps<{
  // 模式：按钮/图片/拖拽
  mode?: 'button' | 'picture' | 'dragger',
  // 图标
  icon?: string,
  // 文本描述
  text?: string,
  // 可上传的附件类型
  uploadType?: string[],
  // 详细说明（仅支持拖拽上传）
  description?: string,
  // 最大上传数量
  maxCount?: number,
  // 最大上传大小（mb）
  maxSize?: number,
  // 是否支持多附件上传
  multiple?: boolean,
  // 是否支持附件夹上传
  directory?: boolean,
  // 双向绑定
  modelValue?: string,
  // 业务编码
  businessCode?: string,
  // 业务名称
  businessName?: string,
  // 是否分片上传
  chunk?: boolean,
  // 最大分片片段大小
  chunkSize?: number,
  // 分片上传同时上传数量
  chunkUploadCount?: number,
  // 附件名称
  fileName?: string,
  // 自动删除（点击删除按钮是否自动进行业务删除）
  autoRemove?: boolean,
}>()

// 双向绑定空值容错：null/undefined 按空串处理，调用方初始化缺陷以 console 暴露（throw 会击穿整页渲染）
if (modelValue === null || modelValue === undefined) {
  console.error("附件双向绑定值为 null/undefined，已按空串处理；如无初值请赋值为 ''")
}

// 方法
const emits = defineEmits<{
  // v-model 双向绑定回写（逗号分隔的附件 id）
  'update:modelValue': [value: string],
  // 上传失败（errorMsg 有无取决于失败环节）
  uploadError: [file: UploadFile, errorMsg?: string],
  // 上传成功
  uploadSuccess: [payload: { file: UploadFile, fileList: UploadFile[] }],
  // 超出最大上传数被拒收
  exceedMaxCount: [file: VcFile],
  // 附件移除：列表内移除回调整文件对象；autoRemove 确认删除回传业务结果
  remove: [payload: UploadFile | { id: string, status: string }]
}>()

// 轮询类定时器登记：异常路径统一在组件卸载时兜底清理
const pendingTimers = new Set<ReturnType<typeof setInterval>>()
const registerInterval = (id: ReturnType<typeof setInterval>) => {
  pendingTimers.add(id)
  return id
}
const clearRegisteredInterval = (id: ReturnType<typeof setInterval>) => {
  pendingTimers.delete(id)
  clearInterval(id)
}
onUnmounted(() => {
  pendingTimers.forEach(id => clearInterval(id))
  pendingTimers.clear()
})

// 附件对象
const sysAttachment = ref<SysAttachment>({})

// 处理附件对象
const handleSysAttachment = (file: UploadFile, md5: string, uploadMode?: string) => {
  sysAttachment.value = {
    businessCode: businessCode ?? router.name?.toString(),
    businessName: businessName ?? router.meta.label as string,
    uploadMode: uploadMode ?? UPLOAD_MODE.COMMON,
    // 组件中是否指定了附件名称，指定的情况下使用指定名称 + 原附件类型
    originalName: fileName ? fileName + getAttachmentExpandedName(file) : file.name,
    size: file.size? file.size.toString() : "",
    type: file.type,
    md5: md5
  }
}

// 获取附件扩展名
const getAttachmentExpandedName = (file: UploadFile) => {
  const split = file.name.split(".")
  let expandedName = ""
  if (split.length !== 1) {
    expandedName = '.' + split[split.length - 1]
  }
  return expandedName;
}

// 附件列表
const fileList = ref<UploadFile[]>([])
// 附件秒传轮询等待变量
const awaitHandleFile = ref<boolean>(false)
// 外部连续变更双向绑定时的乱序防护：仅最新一次变更的响应允许回写
let initVModelVersion = 0
// 初始化双向绑定
const initVModel = async () => {
  const version = ++initVModelVersion
  const ids = (modelValue ?? "").split(",").filter(Boolean)
  if (ids && ids.length > 0) {
    // 初次加载数据时根据双向绑定内容请求附件信息
    const resp = await queryAttachmentInfoByIds(ids)
    if (version !== initVModelVersion) {
      return
    }
    if (resp.code === 200) {
      // 组合fileList
      // 数据回显
      fileList.value = resp.data.map(item => {
        const id = item.id
        const uploadFile: UploadFile = {
          uid: id ? id : '',
          name: item.originalName ? item.originalName : '',
          status: item.status === 'error' ? 'error' : 'done',
          url: id,
          thumbUrl: handleThumbUrl(item.path)
        }
        return uploadFile;
      })
    } else {
      message.error(resp.msg)
    }
  }
}

// 初始化附件上传
const initUpload = () => {
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

    // 控制附件上传最大数（currentFileList 已包含本次进入的文件）
    if (currentFileList.length > maxCount) {
      emits("exceedMaxCount", file)
      return Upload.LIST_IGNORE;
    }

    if (chunk) {
      // 分片上传
      startChunkUpload(file).then(() => {})
      return false;
    } else {
      // 一般上传
      return await startUpload(file)
    }
  };

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
      // 有response数据获取对应的data。code不为200调用上传失败
      if (item.response) {
        const resp = item.response
        if (resp.code === 200) {
          const url = resp.data
          // 向fileList赋值URL
          fileList.forEach(item => {
            if (item.uid === file.uid) {
              item.url = url
            }
          })
          return url
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

    const modelValue = modelValueList.join(",")
    lastModelValue.value = modelValue
    // 处理双向绑定
    emits("update:modelValue", modelValue)
  }

  // 处理附件上传变化（uploading：上传中 done：上传成功 error：上传失败 removed：已删除）
  const handleChange = ({file, fileList}: {file: UploadFile, fileList: Array<UploadFile>}) => {
    // 重置轮询等待状态
    awaitHandleFile.value = false

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

  // 一般附件上传，返回true由a-upload进行上传，返回false执行附件秒传逻辑
  const startUpload = (file: VcFile) => {
    return new Promise(async (resolve) => {

      // 1. 获取附件md5（失败时终止本次上传并标记错误，不让异常逃逸到 a-upload）
      let md5: string
      try {
        md5 = await handleCalculateHash(file) as string
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
          handleSysAttachment(file, md5)
          resolve(true)
        }
      } else {
        // 服务器返回可控制的错误时，继续上传附件
        handleSysAttachment(file, md5)
        resolve(true)
        console.error(resp.msg, "为业务正常进行，继续上传附件")
      }
    })
  }

  // 处理附件秒传
  const handleFastUpload = (file: UploadFile, md5: string) => {
    // 构建 sysAttachment
    handleSysAttachment(file, md5, UPLOAD_MODE.FAST)
    fastUpload(sysAttachment.value).then((resp) => {
      // 轮询等待awaitHandleFile值变化（100ms 高频：秒传响应先到、handleChange 复位信号紧随其后）
      const checkInterval = registerInterval(setInterval(() => {
        if (!awaitHandleFile.value) {
          // 清除轮询
          clearRegisteredInterval(checkInterval)
          if (resp.code === 200) {
            const id = resp.data
            if (id) {
              fileList.value.forEach(item => {
                if (item.uid === file.uid) {
                  item.url = id
                  item.status = "done"
                }
              })
              // 处理双向绑定
              handleModelValue(file, fileList.value)
              emits("uploadSuccess", {file, fileList: fileList.value})
              uploading.value = false
            } else {
              handleUploadError(file, resp.msg)
            }
          } else {
            handleUploadError(file, resp.msg)
          }
        }
      }, 100))
    })
  }

  // 处理附件上传失败
  const handleUploadError = (file: UploadFile, errorMsg: string) => {
    fileList.value.forEach(item => {
      if (item.uid === file.uid) {
        item.status = "error"
      }
    })
    uploading.value = false
    emits("uploadError", file, errorMsg)
  }
  return {
    beforeUpload,
    handleChange,
    handleFastUpload,
    handleModelValue,
    handleUploadError
  }
}
const { beforeUpload, handleChange, handleFastUpload, handleModelValue, handleUploadError } = initUpload()

// 初始化分片上传
const initChunkUpload = () => {
  // 上传loading
  const uploading = ref<boolean>(false)
  // 进度
  const progress = ref<number>(0)
  // 状态，在计算md5 ｜ 正在上传 | 分片合并
  const status = ref<'MD5'|'UPDATE'|'MERGE'>();
  // 分片上传记录类型
  type UploadRecordType = {
    uploadId: string,
    status: "in_progress" | "completed",
    uploadedChunkSize: number,
    totalSize: number,
    chunkSize: number,
    attachmentId?: string,
  }

  // 开始进行分片上传
  const startChunkUpload = async (file: VcFile) => {
    uploading.value = true
    // 1. 获取附件md5值（失败时终止本次上传，handleUploadError 内复位 loading）
    let md5: string
    try {
      md5 = await handleCalculateHash(file) as string
    } catch {
      handleUploadError(file, "附件哈希计算失败")
      return
    }
    // 2. 判断是否进行附件上传
    let allow = await allowUpload(file, md5);
    // 允许上传附件
    if (allow) {
      // 3. 处理分片上传逻辑
      await handleChunkUpload(file, md5)
    } else {
      // 3 不允许分片上传 包含两种情况：1 同一附件有正在执行的上传任务；2 附件已上传完毕
      handleSyncChunkUploadStatus(file, md5)
    }
  }

  // 处理分片上传逻辑
  const handleChunkUpload = async (file: VcFile, md5: string) => {
    status.value = "UPDATE"
    progress.value = 0
    // 获取浏览器缓存中记录的分片上传信息
    const record = localStorage.getItem(chunk_upload_prefix + md5)
    if (!record) { return }
    const recordObj: UploadRecordType = JSON.parse(record)

    // 1. 对附件进行分片
    const chunks = handleChunk(file, chunkSize).map((chunk, index) => ({index: index + 1, chunk}));
    // 2. 获取已上传的分片索引
    const uploadedIndexResp = await chunksUploadedIndex(recordObj.uploadId);
    if (uploadedIndexResp.code !== 200) {
      handleUploadError(file, uploadedIndexResp.msg)
      return
    }
    recordObj.chunkSize = chunks.length
    const uploadedIndexList = uploadedIndexResp.data

    // 3. 获取到需要上传的分片附件，并构建分片对象
    const needUploadChunks = chunks.filter((item) => !uploadedIndexList.includes(item.index)).map((item) => ({
      index: item.index,
      chunk: item.chunk,
      status: "pending", // 状态：等待中
    }))
    // 4. 创建各种计数器
    // 分片上传计数器
    let uploadedChunkNum = 0
    // 已上传大小计数器（按分片实际大小累计：尾片不足整片大小）
    let uploadedChunkSize = uploadedIndexList.reduce((sum, index) => sum + (chunks[index - 1]?.chunk.size ?? 0), 0)
    // 分片维度的已上传字节（进度回调的 bytes 为该分片内累积值，跨回调直接累加会重复计数）
    const chunkUploadedBytes = new Map<number, number>()

    // 没有需要上传的情况，直接调用合并
    if (needUploadChunks.length === 0) {
      handleChunksMerge(file, recordObj, md5)
      return
    }

    // 5. 分片上传主体方法
    const uploadChunk = async (i: number) => {
      if (i >= needUploadChunks.length) return;
      // 状态改为进行中
      const {chunk, index} = needUploadChunks[i]
      needUploadChunks[i].status = "in_progress"
      try {
        // 调用分片上传接口
        const resp = await chunksUpload(chunk, recordObj.uploadId, md5, index, (bytes: number) => {
          // 上传状态显示，并实时更新上传进度（bytes 为该分片内累积值，取增量累加）
          const last = chunkUploadedBytes.get(index) ?? 0
          chunkUploadedBytes.set(index, bytes)
          uploadedChunkSize += bytes - last
          recordObj.uploadedChunkSize = Math.trunc(uploadedChunkSize / 1024 / 1024)
          recordObj.totalSize = Math.trunc(file.size ? file.size / 1024 / 1024 : 0 )
          localStorage.setItem(chunk_upload_prefix + md5, JSON.stringify(recordObj))
          progress.value = recordObj.totalSize ? Math.trunc(recordObj.uploadedChunkSize / recordObj.totalSize * 100) : 0
        })
        if (resp.code === 200) {
          // 分片完成按实际大小结算，消除进度回调可能漏报的尾差
          uploadedChunkSize += chunk.size - (chunkUploadedBytes.get(index) ?? 0)
          chunkUploadedBytes.set(index, chunk.size)
          // 修改状态为已上传
          needUploadChunks[i].status = "completed"
          // 计数器 + 1
          uploadedChunkNum++
          // 所有分片上传完成
          if (uploadedChunkNum == needUploadChunks.length) {
            // 处理分片合并
            handleChunksMerge(file, recordObj, md5)
          } else {
            // 7. 获取下一个等待中状态的数据进行上传
            const nextIndex = needUploadChunks.findIndex(item => item.status === "pending")
            if (nextIndex !== -1) {
              await uploadChunk(nextIndex)
            }
          }
        } else {
          message.error(resp.msg)
        }
      } catch (e) {
        if (e instanceof ResponseError) {
          message.error(e.msg)
        }
        handleUploadError(file, "分片上传失败")
      }
    }

    // 6. 初始化chunkUploadCount个上传任务
    const queue: Promise<any>[] = [];
    for (let i = 0; i < Math.min(chunkUploadCount, needUploadChunks.length); i++) {
      queue.push(uploadChunk(i));
    }

    await Promise.all(queue).catch((e) => {
      if (e instanceof ResponseError) {
        handleUploadError(file, e.msg)
      } else {
        handleUploadError(file, "分片上传失败")
        console.error(e)
      }
    })
  }

  // 同步分片上传状态
  const handleSyncChunkUploadStatus = (file: UploadFile, md5: string) => {
    const recordKey = chunk_upload_prefix + md5
    if (localStorage.getItem(recordKey)) {
      // 1000ms 低频：断点续传状态由其他上传方推进 localStorage，同步进度即可
      const interval = registerInterval(setInterval(() => {
        // 每次重读记录：进度由并发上传方推进，闭包快照会恒为旧值导致轮询永不结束
        const record = localStorage.getItem(recordKey)
        if (!record) {
          clearRegisteredInterval(interval)
          return
        }
        const recordObj: UploadRecordType = JSON.parse(record)
        progress.value = recordObj.totalSize ? Math.trunc(recordObj.uploadedChunkSize / recordObj.totalSize * 100) : 0
        // 检测到上传状态为completed时，执行附件秒传获取数据
        if (recordObj.status === "completed") {
          clearRegisteredInterval(interval)
          handleFastUpload(file, md5)
        }
      }, 1000))
    } else {
      // 没有本地记录直接调用附件秒传
      handleFastUpload(file, md5)
    }
  }

  // 处理分片
  const handleChunk = (file: VcFile, size: number): Blob[] => {
    const chunks:Blob[] = []
    if (file.size) {
      size = size * 1024 * 1024
      for (let i = 0; i < file.size; i = size + i) {
        chunks.push(file.slice(i, size + i))
      }
    }
    return chunks;
  }

  // 计算附件哈希
  const handleCalculateHash = (file: VcFile) => {
    status.value = "MD5"
    progress.value = 0

    const chunks = handleChunk(file, HASH_CHUNK_SIZE_MB)
    return new Promise((resolve, reject) => {
      // 通过webWorker后台处理hash计算，防止ui阻塞
      const worker = new Worker(new URL("./hash-worker.ts", import.meta.url), {type: "module"})
      // worker 加载/运行异常兜底：不处理则 promise 永不落定、上传流程永久卡死
      worker.onerror = () => {
        reject(new Error("附件哈希计算失败"))
        worker.terminate()
      }
      // 接收hash计算完成后的结果
      worker.onmessage = (event) => {
        const resp = event.data
        if (typeof resp === "string") {
          resolve(resp)
          worker.terminate()
        } else if (typeof resp === "number") {
          progress.value = resp
        } else if (resp && typeof resp === "object" && resp.type === "error") {
          // worker 内分片读取失败的主动上报（协议：{type: 'error', message}）
          reject(new Error(resp.message ?? "附件哈希计算失败"))
          worker.terminate()
        }
      }
      worker.postMessage(chunks)
    })
  }

  // 是否允许上传
  const allowUpload = async (file: UploadFile, md5: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const record = localStorage.getItem(chunk_upload_prefix + md5)
      let needFetch = false
      if (record) {
        const uploadRecord: UploadRecordType = JSON.parse(record)
        // 缓存对象为上传中状态，检查当前正在进行的请求，post:开头，包含md5是否存在，存在即处于正在上传状态，不存在即为中途断开状态
        if (uploadRecord.status === "in_progress") {
          resolve(![... currentRequests].some(url => url.startsWith("post:") && url.includes("?" + CHUNK_MD5_QUERY + md5)))
        } else {
          // 已完成上传，从数据库查询对应信息
          needFetch = true
        }
      } else {
        // 记录不存在，从数据库查询对应信息
        needFetch = true
      }

      if (needFetch) {
        // 根据md5 查询数据库数据
        existsAttachmentByMd5(md5).then(async resp => {
          if (resp.code === 200) {
            // 数据存在，返回false
            if (resp.data) {
              resolve(false)
            } else {
              await _initChunkUploadStorage()
              resolve(true)
            }
          } else {
            await _initChunkUploadStorage()
            resolve(true)
            console.error(resp.msg, "为业务正常进行，继续上传附件")
          }
        }).catch(e => {
          reject(e)
        })
        // 新建localStorage缓存数据
        async function _initChunkUploadStorage() {
          handleSysAttachment(file, md5, UPLOAD_MODE.CHUNK)
          // 从后端获取updateId
          const resp = await chunksUploadStart(sysAttachment.value)
          if (resp.code === 200) {
            const data = resp.data
            localStorage.setItem(chunk_upload_prefix + md5, JSON.stringify({
              uploadId: data.uploadId,
              attachmentId: data.attachmentId,
              status: "in_progress",
              uploadedChunkSize: 0,
              totalSize: 0,
              chunkSize: 0
            } as UploadRecordType))
          } else {
            message.error(resp.msg)
            handleUploadError(file, resp.msg)
          }
        }
      }
    })
  }

  // 处理附件合并
  const handleChunksMerge = (file: UploadFile, recordObj: UploadRecordType, md5: string) => {
    status.value = "MERGE"
    // 进入合并前把本地记录置为 completed（分片已全部就绪）：合并期间会话中断（刷新/关闭）后，
    // 重传会经 existsAttachmentByMd5 命中秒传闭环，而非把已消费的 uploadId 当全新任务全量重传
    recordObj.status = "completed"
    localStorage.setItem(chunk_upload_prefix + md5, JSON.stringify(recordObj))
    chunksMerge({id: recordObj.attachmentId, originalName: file.name, md5: md5, uploadId:  recordObj.uploadId}, recordObj.chunkSize).then((resp) => {
      if (resp.code === 200) {
        // 上传成功后删除浏览器缓存记录
        localStorage.removeItem(chunk_upload_prefix + md5)
        // fileList重新赋值
        fileList.value.forEach(item => {
          if (item.uid === file.uid) {
            item.url = resp.data
            item.status = "done"
          }
        })
        // 处理双向绑定
        handleModelValue(file, fileList.value)
        emits("uploadSuccess", {file, fileList: fileList.value})
      } else {
        handleUploadError(file, resp.msg)
      }
    }).catch((e) => {
      if (e instanceof ResponseError) {
        handleUploadError(file, e.msg)
      } else {
        handleUploadError(file, "附件合并失败")
        console.error(e)
      }
    }).finally(() => {
      status.value = undefined
      progress.value = 0
      uploading.value = false
    })
  }
  return {
    uploading,
    progress,
    status,
    handleCalculateHash,
    startChunkUpload
  }
}
const { uploading, progress, status, handleCalculateHash, startChunkUpload } = initChunkUpload()

// 初始化预览
const initPreview = () => {
  const previewType = ref<'image' | 'video' | 'other'>()
  // 预览model
  const previewVisible = ref<boolean>(false)
  // 预览title
  const previewTitle = ref<string>()
  // 预览url
  const previewURL = ref<string>()
  // 处理预览
  const handlePreview = async (file: UploadFile) => {
    if (file.status === "error") {
      message.error("附件异常，无法预览或下载")
      return
    }
    if (file.type || file.name) {
      // 获取附件后缀名
      const extension = file.name.split('.').pop()?.toLowerCase() || ""
      // 获取组件返回的附件类型
      const type = file.type?.split("/")[0] || ""
      // 通过组件返回类型和附件后缀联合判断附件类型
      if (type === "image" || imageExtensions.includes(extension)) {
        previewType.value = "image"
      } else if (type === "video" || videoExtensions.includes(extension)) {
        previewType.value = "video"
      } else {
        previewType.value = 'other'
      }
    } else {
      previewType.value = 'other'
    }
    // 获取url
    let url = file.thumbUrl
    if (!url?.startsWith(baseAPI)) {
      const resp = await getDownloadURL(file.url as string)
      if (resp.code === 200) {
        url = handleThumbUrl(resp.data)
        // 为fileList中thumbUrl赋值
        fileList.value.forEach(item => {
          if (item.url === file.url) {
            item.thumbUrl = url
          }
        })
      }
    }
    // 图片视频进行弹窗预览
    if (previewType.value === 'image' || previewType.value === 'video') {
      previewVisible.value = true
      previewTitle.value = file.name
      previewURL.value = url
    } else {
      // 其他类型直接下载
      if (url) {
        download(url, file.name)
      }
    }
  }

  // 关闭预览
  const handleCancel = () => {
    previewVisible.value = false
  }

  // 处理显示缩略图显示
  const handleShowThumbImage = (file: UploadFile) => {
    // 获取附件后缀名
    const extension = file.name.split('.').pop()?.toLowerCase() || ""
    return imageExtensions.includes(extension);
  }

  // 处理预览URL
  const handleThumbUrl = (thumbUrl?: string): string => {
    if (!thumbUrl) {
      return "";
    }
    // 由http或baseAPI开头直接返回
    if (thumbUrl.startsWith("http") || thumbUrl?.startsWith(baseAPI)) {
      return thumbUrl;
    }
    // 最后拼接 baseAPI
    return baseAPI + thumbUrl;
  }
  return {
    previewVisible,
    previewTitle,
    previewURL,
    previewType,
    handlePreview,
    handleCancel,
    handleShowThumbImage,
    handleThumbUrl
  }
}
const { previewVisible, previewTitle, previewURL, previewType, handlePreview, handleCancel, handleShowThumbImage, handleThumbUrl } = initPreview()

const initRemove = () => {
  const removeIds: string[] = []
  // 处理附件删除
  const handleRemove = async (file: UploadFile) => {
    return new Promise( (resolve, reject) => {
      if (file && file.url) {
        const id = file.url
        if (autoRemove) {
          Modal.confirm({
            title: '附件删除',
            icon: h(ExclamationCircleOutlined),
            content: '删除后无法恢复，是否删除？',
            // 确认删除
            onOk: async () => {
              const resp = await deleteFromBusiness([id])
              if (resp.code === 200) {
                emits("remove", {id: id, status: "success"})
                resolve({})
              } else {
                reject()
                emits("remove", {id: id, status: "error"})
              }
            },
            // 取消删除
            onCancel: () => {
              reject()
            }
          })
        } else {
          removeIds.push(id)
          resolve({})
        }
      } else {
        message.error("附件id不存在")
        reject()
      }
    })
  }

  // 处理业务删除
  const businessRemove = async () => {
    return new Promise((resolve, reject) => {
      if (removeIds.length === 0) {
        reject({msg: '附件id不存在'})
        return
      }
      deleteFromBusiness(removeIds)
          .then(resp => {
            if (resp.code === 200) {
              removeIds.length = 0
            }
            resolve(resp)
          })
          .catch(err => reject(err))
    })
  }

  return {
    handleRemove,
    businessRemove
  }
}

const {handleRemove, businessRemove} = initRemove()

// 监听双向绑定
watch(() => modelValue, (value) => {
  if (lastModelValue.value !== value) {
    initVModel()
  }
}, {immediate: true})

// 抛出函数
defineExpose({
  businessRemove
})
</script>

<style>
.attachment-upload-preview-mask {
  border-radius: var(--ant-border-radius-lg);
}
</style>
