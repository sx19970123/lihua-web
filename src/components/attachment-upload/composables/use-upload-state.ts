import {reactive} from "vue"

// 上传链路对界面可见的状态机（单 reactive：loading、阶段、进度）
export interface UploadState {
  uploading: boolean
  progress: number
  status?: "MD5" | "UPDATE" | "MERGE"
}

export const useUploadState = () => {
  const uploadState = reactive<UploadState>({uploading: false, progress: 0})

  const resetUploadState = () => {
    uploadState.status = undefined
    uploadState.progress = 0
    uploadState.uploading = false
  }

  return {uploadState, resetUploadState}
}
