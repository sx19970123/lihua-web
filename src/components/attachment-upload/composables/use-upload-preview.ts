import {message, type UploadFile} from "@/antd-adapter"
import {ref, type Ref} from "vue"
import {getDownloadURL} from "@/api/system/attachment/attachment.ts"
import {download} from "@/utils/attachment-download.ts"
import {baseAPI, imageExtensions, videoExtensions} from "./constants.ts"

/**
 * 上传后预览：图片/视频弹窗预览、其他类型直接下载；缩略图 URL 组装
 */
export const useUploadPreview = (ctx: {
  fileList: Ref<UploadFile[]>
}) => {
  const {fileList} = ctx
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
