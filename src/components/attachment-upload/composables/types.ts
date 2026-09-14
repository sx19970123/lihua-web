import type {Ref} from "vue"
import type {UploadFile, VcFile} from "@/antd-adapter"
import type {SysAttachment} from "@/api/system/attachment/type/sys-attachment.ts"

// 组件 emits 契约（结构与 index.vue defineEmits 保持一致）
export interface AttachmentEmitFn {
  (e: "update:modelValue", value: string): void
  (e: "uploadError", file: UploadFile, errorMsg?: string): void
  (e: "uploadSuccess", payload: { file: UploadFile, fileList: UploadFile[] }): void
  (e: "exceedMaxCount", file: VcFile): void
  (e: "remove", payload: UploadFile | { id: string, status: string }): void
}

// 断点续传的浏览器本地记录（key = CHUNK_UPLOAD_RECORD_PREFIX + md5）
export type UploadRecordType = {
  uploadId: string
  status: "in_progress" | "completed"
  uploadedChunkSize: number
  totalSize: number
  chunkSize: number
  attachmentId?: string
}

// 四个 composable 共享的组件 setup 产物
export interface UploadContext {
  emits: AttachmentEmitFn
  fileList: Ref<UploadFile[]>
  sysAttachment: Ref<SysAttachment>
  buildSysAttachment: (file: UploadFile, md5: string, uploadMode?: string) => void
}

// 分片链路对上传核心暴露的入口（beforeUpload/秒传判定依赖；晚绑定注入）
export interface ChunkUploadApi {
  startChunkUpload: (file: VcFile) => Promise<void>
  handleCalculateHash: (file: VcFile) => Promise<string>
}

// 上传核心对分片链路暴露的回调（失败收尾/秒传/双向绑定回写）
export interface UploadCoreApi {
  handleUploadError: (file: UploadFile, errorMsg: string) => void
  handleFastUpload: (file: UploadFile, md5: string) => void
  handleModelValue: (file: UploadFile, fileList: Array<UploadFile>) => void
}
