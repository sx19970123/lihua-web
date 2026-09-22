<template>
  <!-- description 容器随内容收缩，不设最小宽度时进度条会缩到与文案同宽 -->
  <a-spin :spinning="uploadState.uploading" :styles="{description: {minWidth: '200px', textAlign: 'center'}}">
    <!--  分片进度条loading  -->
    <template #description>
      <!--   计算md5   -->
      <div v-if="uploadState.status === 'MD5'">
        <div class="mb-ant-xxs">正在处理</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="uploadState.progress"/>
      </div>
      <!--   上传   -->
      <div v-if="uploadState.status === 'UPDATE'">
        <div class="mb-ant-xxs">正在上传</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="uploadState.progress"/>
      </div>
      <!--   合并   -->
      <div v-if="uploadState.status === 'MERGE'">
        <div class="mb-ant-xxs">正在合并</div>
        <a-progress :stroke-color="themeStore.getColorPrimary()" status="active" :show-info="false" :percent="100"/>
      </div>
    </template>

    <a-upload v-if="mode === 'button' || mode === 'picture'"
              v-model:file-list="fileList"
              :list-type="mode === 'picture' ? 'picture-card' : 'text'"
              :before-upload="beforeUpload"
              :custom-request="handleCustomRequest"
              :directory="chunk ? false : directory"
              :multiple="chunk ? false : multiple"
              :isImageUrl="handleShowThumbImage"
              @preview="handlePreview"
              @change="handleChange"
              @remove="handleRemove"
    >
      <!--      picture 模式预览图标按文件类型切换；动作按钮外框（text 型小按钮 + item-action hover 样式）与预览点击由 UploadList 统一渲染，插槽只提供图标-->
      <template #previewIcon="data">
        <CloudDownloadOutlined v-if="![imageExtensions, videoExtensions].some(list => list.includes(data.file.name.toLowerCase().split('.').pop() ?? ''))"/>
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
                      :before-upload="beforeUpload"
                      :custom-request="handleCustomRequest"
                      :directory="chunk ? false : directory"
                      :multiple="chunk ? false : multiple"
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
import {message, type UploadFile, type VcFile} from "@/antd-adapter";
import {ref, watch} from "vue";
import {useRoute} from "vue-router";
import {queryAttachmentInfoByIds} from "@/api/system/attachment/attachment-storage.ts";
import type {SysAttachment} from "@/api/system/attachment/type/sys-attachment.ts";
import {useThemeStore} from "@/stores/theme.ts";
import {imageExtensions, UPLOAD_MODE, videoExtensions} from "./composables/constants.ts";
import type {AttachmentEmitFn} from "./composables/types.ts";
import {splitAttachmentIds} from "./composables/model-value.ts";
import {useUploadState} from "./composables/use-upload-state.ts";
import {useUploadCore} from "./composables/use-upload-core.ts";
import {useChunkUpload} from "./composables/use-chunk-upload.ts";
import {useUploadPreview} from "./composables/use-upload-preview.ts";
import {useAttachmentRemove} from "./composables/use-attachment-remove.ts";

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
  remove: [payload: UploadFile | { id: string, status: string }],
}>()

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
// 外部连续变更双向绑定时的乱序防护：仅最新一次变更的响应允许回写
let initVModelVersion = 0
// 初始化双向绑定
const initVModel = async () => {
  const version = ++initVModelVersion
  const ids = splitAttachmentIds(modelValue)
  if (ids && ids.length > 0) {
    // 初次加载数据时根据双向绑定内容请求附件信息
    const resp = await queryAttachmentInfoByIds(ids)
    if (version !== initVModelVersion) {
      return
    }
    if (resp.code === 200) {
      // 组合fileList
      // 数据回显：缩略图走 info 按行选链的 url（公开=永久链，私密=时效签名链）
      fileList.value = resp.data.map(item => {
        const id = item.id
        const uploadFile: UploadFile = {
          uid: id ? id : '',
          name: item.originalName ? item.originalName : '',
          // info 只回成功行；失败值（附件丢失占位行）按 error 态展示
          status: item.status === "1" ? 'error' : 'done',
          url: id,
          thumbUrl: handleThumbUrl(item.url)
        }
        return uploadFile;
      })
    } else {
      message.error(resp.msg)
    }
  }
}

// 上传链路状态机（loading、分片阶段、进度；上传核心与分片链路共享）
const {uploadState, resetUploadState} = useUploadState()

// 四段式装配：上传核心先建（分片链路依赖其回调），分片入口经晚绑定注入核心
const uploadContext = {
  emits: emits as AttachmentEmitFn,
  fileList,
  sysAttachment,
  buildSysAttachment: handleSysAttachment
}
const core = useUploadCore({
  ...uploadContext,
  uploadState,
  lastModelValue,
  maxCount,
  maxSize,
  uploadType,
  chunk
})
const chunkApi = useChunkUpload({
  ...uploadContext,
  uploadState,
  resetUploadState,
  core,
  chunkSize,
  chunkUploadCount
})
core.bindChunkApi(chunkApi)
const {beforeUpload, handleChange, handleCustomRequest} = core

const {previewVisible, previewTitle, previewURL, previewType, handlePreview, handleCancel, handleShowThumbImage, handleThumbUrl} = useUploadPreview({fileList})
const {handleRemove, businessRemove} = useAttachmentRemove({emits: emits as AttachmentEmitFn, autoRemove, cancelUpload: chunkApi.cancelUpload})

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
