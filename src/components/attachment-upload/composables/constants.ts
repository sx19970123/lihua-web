// 附件上传组件域内常量
export const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]
export const videoExtensions = ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"]
export const baseAPI = import.meta.env.VITE_APP_BASE_API
// 断点续传记录的 localStorage key 前缀
export const CHUNK_UPLOAD_RECORD_PREFIX = "upload-record-"
// 上传方式字典 sys_attachment_upload_mode 的值域（0=一般上传 1=分片 2=秒传）
export const UPLOAD_MODE = {COMMON: "0", CHUNK: "1", FAST: "2"} as const
// hash 计算的读取分片大小（MB）：仅为 web worker 流式读取，与上传分片大小（chunkSize）无关
export const HASH_CHUNK_SIZE_MB = 10
