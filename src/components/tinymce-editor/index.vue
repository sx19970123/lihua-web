<template>
  <a-spin :spinning="spinning" description="正在加载编辑器...">
    <div :style="{height: height}" class="lihua-editor-container">
      <Editor :init="editorConfig"
              :key="editKey"
              v-model="content"
              licenseKey='gpl'
              tinymceScriptSrc="/tinymce/tinymce.min.js"
      />
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref, watch} from 'vue'
import Editor from '@tinymce/tinymce-vue'
import type {Editor as TinyMceEditor} from 'tinymce'
import {useThemeStore} from "@/stores/theme.ts";
import {v4 as uuidv4} from "uuid";
import {useRoute} from "vue-router";
import {publicUpload} from "@/api/system/attachment/attachment-storage.ts";
import type {SysAttachmentUrl} from "@/api/system/attachment/type/sys-attachment-url.ts";
import {message} from "@/antd-adapter";
import {attachmentUrl} from "@/utils/attachment-url.ts";

const themeStore = useThemeStore();
const route = useRoute()
// 上传默认大小
const defaultSize = 1024 * 1024 * 2
const {modelValue, autoDownloadPasteImg = true, height = '50vh', businessCode, imageType = [], mediaType = [], fileType = [], imageMaxSize = defaultSize, mediaMaxSize = defaultSize, fileMaxSize = defaultSize} = defineProps<{
  // 双向绑定
  modelValue?: string,
  // 编辑器高度
  height?: string | number,
  // 自动下载剪贴板中的图片
  autoDownloadPasteImg?: boolean,
  // 业务编码
  businessCode?: string,
  // 图片后缀及最大尺寸
  imageType?: string[],
  imageMaxSize?: number
  // 媒体后缀及最大尺寸
  mediaType?: string[],
  mediaMaxSize?: number
  // 文件后缀及最大尺寸
  fileType?: string[],
  fileMaxSize?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value?: string]
}>()

// 附件业务编码（computed：未显式传 businessCode 时跟随当前路由名，keep-alive 复用切路由后不过期）
const bCode = computed(() => businessCode ?? route.name?.toString())

// 切换主题重新加载组件
const editKey = ref<string>(uuidv4())
// 加载中
const spinning = ref<boolean>(true)

// 加载失败兜底：tinymce-vue 的 ScriptLoader 只监听 load 无 error 通道（dist 源码实证），
// 引擎脚本加载失败须自行在捕获阶段监听（资源错误不冒泡）；超时兜底其余未预期失败，防 spin 永久转圈
const loadingFailed = () => {
  spinning.value = false
  message.error("编辑器加载失败，请刷新重试")
  cleanupLoadingGuards()
}
const handleScriptError = (event: ErrorEvent) => {
  if (event.target instanceof HTMLScriptElement && event.target.src.includes('/tinymce/')) {
    loadingFailed()
  }
}
const loadingTimeout = window.setTimeout(loadingFailed, 20000)
const cleanupLoadingGuards = () => {
  window.clearTimeout(loadingTimeout)
  window.removeEventListener('error', handleScriptError, true)
}
window.addEventListener('error', handleScriptError, true)
onUnmounted(cleanupLoadingGuards)

// 附件上传回调类型
type FilePickerCallback = (url: string, meta?: { title?: string; text?: string; alt?: string }) => void
type FilePickerMeta = { filetype: 'file' | 'image' | 'media' }

// 编辑器配置
const editorConfig = computed(() => ({
  // 语言设置（需从官网下载语言包，下载完成后复制到public/tinymce/langs/下）
  language: 'zh_CN',
  // 编辑器高度
  height: height,
  // 隐藏顶部菜单
  menubar: false,
  // 隐藏默认logo
  branding: false,
  promotion: false,
  // 亮色｜暗色模式切换
  // 主题可在：https://skin.tiny.cloud/t5/ 进行编辑，之后复制到public/tinymce/skins/ui/
  skin: themeStore.isDarkTheme ? 'custom-dark' : 'custom',
  content_css: themeStore.isDarkTheme ? 'dark' : 'default',
  // 自定义编辑区背景颜色
  content_style: themeStore.isDarkTheme ? "body {background-color: #1f1f1f !important;}" : 'body {background-color: #fff !important;}',
  // 免费插件
  plugins: 'link image media table lists code emoticons fullscreen preview searchreplace',
  // 工具栏配置
  toolbar: [
    'undo redo | bold italic underline strikethrough | forecolor backcolor fontfamily fontsize | alignleft aligncenter alignright alignjustify',
    'bullist numlist outdent indent | link image media emoticons table | blockquote code | removeformat fullscreen preview searchreplace'
  ],
  // 禁止编辑器给我处理路径
  convert_urls: false,
  relative_urls: false,
  remove_script_host: false,
  // 附件上传类型，file-链接 image-图片 media-视频
  file_picker_types: 'file image media',
  /**
   * 编辑器加载完成
   */
  init_instance_callback: () => {
    spinning.value = false
    cleanupLoadingGuards()
  },
  /**
   * 附件上传，拿到附件后进行处理，处理完成后调用callback
   */
  file_picker_callback: (callback: FilePickerCallback, value: string, meta: FilePickerMeta) => {
    // 创建文件上传框并点击
    const input = document.createElement('input')
    input.type = 'file'
    // 根据 meta.filetype 限制类型
    if (meta.filetype === 'image') {
      input.accept = imageType?.join(",") || 'image/*'
    } else if (meta.filetype === 'media') {
      input.accept = mediaType?.join(",") || 'audio/*,video/*'
    } else {
      input.accept = fileType?.join(",") || '*'
    }

    // 点击调用附件选择器
    input.click()

    // 附件上传
    input.onchange = async () => {
      const resp = await handleUpload(input?.files, meta.filetype)
      if (resp) {
        callback(resp.url, {text: resp.name, alt: resp.name, title: resp.name})
      }
    }
  },
  /**
   * 处理粘贴的文本
   * 过滤img标签拿到url将图片保存到服务器
   */
  paste_postprocess: async (editor: TinyMceEditor, args: { node: HTMLElement }) => {
    if (!autoDownloadPasteImg) return;

    const notif = editor.notificationManager.open({
      text: '正在处理粘贴内容...',
      type: 'info',
      timeout: 0
    });

    try {
      // 拿到全部img标签
      const pastedImgs = Array.from(args.node.querySelectorAll('img'));
      if (!pastedImgs.length) return;

      // 事务包裹，保证一次 undo
      editor.undoManager.transact(async () => {
        for (const img of pastedImgs) {
          // 拿到src后上传图片
          const resp = await handleLinkImageUpload(img.getAttribute('src') || undefined);
          if (resp) {
            // 在编辑器文档中查找所有匹配 originalSrc 的 img 并替换 src
            const editorImgs = editor.dom.select('img');
            for (const eImg of editorImgs) {
              // 注意比较时要按原始字符串比较，避免部分匹配误替换
              if (eImg.getAttribute('src') === resp.originalURL) {
                editor.dom.setAttrib(eImg, 'src', resp.url);
              }
            }
          }
        }
      });
    } catch {
      // TinyMCE 不 await async 处理器，异常须自行收口，否则通知不关且成为未处理 rejection
      message.error("粘贴内容处理失败")
    } finally {
      notif.close();
    }
  }
}))

// 双向绑定
const content = ref<string | undefined>(modelValue)

/**
 * 处理链接图片上传
 * @param url
 */
const handleLinkImageUpload = async (url?: string): Promise<SysAttachmentUrl | false> => {
  if (!url) {
    return false
  }
  // 拿到url对应的二进制附件；外链图片可能跨域拒绝或已失效，失败提示后放弃转存（保留原 src）
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const file = new File([blob], `editor_${uuidv4()}.png`, {type: blob.type})
    const fileResp = await handleUpload(file, 'image');
    if (fileResp) {
      return {
        url: fileResp.url,
        originalURL: url
      }
    }
    return false;
  } catch {
    message.error("粘贴图片转存失败")
    return false
  }
}

/**
 * 处理附件上传
 */
const handleUpload = async (files: FileList | File | null, type: "file" | "image" | "media") => {
  // 附件类型
  const fileTypes: string[] = []
  // 附件大小
  let maxSize: number
  if (type === 'image') {
    fileTypes.push(...imageType)
    maxSize = imageMaxSize
  } else if (type === 'media') {
    fileTypes.push(...mediaType)
    maxSize = mediaMaxSize
  } else {
    fileTypes.push(...fileType)
    maxSize = fileMaxSize
  }

  // 获取file
  let file: File | null = null
  if (files instanceof FileList) {
    file = files?.item(0)
  }
  if (files instanceof File) {
    file = files
  }
  // 附件不存在
  if (!file) {
    message.error("附件不存在")
    return false
  }

  // 附件类型不匹配（后缀白名单忽略大小写，.PNG 与 .png 等价）
  const lowerName = file.name.toLowerCase()
  const filter = fileTypes.filter(type => lowerName.endsWith(type.toLowerCase()))
  if (filter.length === 0 && fileTypes.length > 0) {
    message.error("附件类型不匹配")
    return false
  }

  // 附件过大
  if (file.size > maxSize) {
    message.error("超过文件大小限制")
    return false
  }

  // 业务参数不存在
  if (!bCode.value) {
    message.error("业务编码不存在")
    return false
  }

  try {
    // 进行附件上传
    const resp = await publicUpload(file, bCode.value)
    // 上传成功
    if (resp.code === 200) {
      return {
        url: attachmentUrl(resp.data),
        name: file.name,
      }
    } else {
      message.error(resp.msg)
      return false
    }
  } catch {
    message.error("附件上传失败")
    return false
  }
}

// 切换暗色模式后重新载入编辑器
watch(() => themeStore.isDarkTheme, () => {
  editKey.value = uuidv4()
})
// 双向绑定
watch(() => content.value, () => {
  emit("update:modelValue", content.value)
})
// 监听外部组件变化
watch(() => modelValue, () => {
  content.value = modelValue
})
</script>
<style lang="scss">
/* 覆盖dialog遮罩颜色*/
.tox .tox-dialog-wrap__backdrop {
  background-color: rgba(0, 0, 0, 0.3) !important;
}
/* 覆盖dialog阴影*/
.tox .tox-dialog {
  box-shadow: var(--ant-box-shadow-tertiary)!important;
}
/* 覆盖源码预览，高度撑满容器*/
.tox .tox-textarea-wrap {
  height: 100% !important;
  textarea {
    height: 100% !important;
  }
}
/* 隐藏编辑器未加载完成时的textarea */
.lihua-editor-container {
  textarea {
    display: none;
  }
}
</style>