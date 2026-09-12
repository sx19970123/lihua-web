<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">契约探针（一般 / 秒传 / 分片）</a-typography-title>
    <a-typography-text>
      上传成功后展示后端响应 VO 与组件回写结果，用于核对上传契约（id / path / isPublic / url 签名链 / originalName / type）。
      同一文件在实例一重复上传可触发秒传分支；实例二为 1MB 分片。
    </a-typography-text>
    <a-typography-title :level="5">实例一：一般上传 / 秒传</a-typography-title>
    <attachment-upload v-model="modelValue1" text="点击上传（一般/秒传）"
                       @upload-success="logCommonSuccess" @upload-error="logCommonError"/>
    <a-typography-text>实例一绑定数据：{{modelValue1}}</a-typography-text>
    <a-typography-title :level="5">实例二：分片上传（1MB/片）</a-typography-title>
    <attachment-upload v-model="modelValue2" text="点击上传（分片）" chunk :chunk-size="1" :max-size="100"
                       @upload-success="logChunkSuccess" @upload-error="logChunkError"/>
    <a-typography-text>实例二绑定数据：{{modelValue2}}</a-typography-text>
    <pre v-if="logs" class="probe-log">{{logs}}</pre>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import type {UploadFile} from "@/antd-adapter";
import {ref} from "vue";

const modelValue1 = ref<string>('')
const modelValue2 = ref<string>('')
const logs = ref<string>('')

type SuccessPayload = { file: UploadFile, fileList: UploadFile[] }

// 一般上传的响应在 file.response；秒传/分片由组件内部完成，结果回写在 fileList 对应项的 url
const extractPayload = (payload: SuccessPayload) => {
  const target = payload.fileList.find(item => item.uid === payload.file.uid) ?? payload.file
  return {
    fileName: payload.file.name,
    response: payload.file.response ?? null,
    boundUrl: target.url ?? null,
    boundStatus: target.status ?? null
  }
}

const appendLog = (entry: string) => {
  const time = new Date().toLocaleTimeString()
  logs.value = logs.value ? `${logs.value}\n\n[${time}] ${entry}` : `[${time}] ${entry}`
}

const logCommonSuccess = (payload: SuccessPayload) => {
  appendLog(`common uploadSuccess\n${JSON.stringify(extractPayload(payload), null, 2)}`)
}

const logChunkSuccess = (payload: SuccessPayload) => {
  appendLog(`chunk uploadSuccess\n${JSON.stringify(extractPayload(payload), null, 2)}`)
}

const logCommonError = (file: UploadFile, errorMsg?: string) => {
  appendLog(`common uploadError ${file.name} ${errorMsg ?? ""}\n${JSON.stringify({fileName: file.name, errorMsg: errorMsg ?? null, response: file.response ?? null}, null, 2)}`)
}

const logChunkError = (file: UploadFile, errorMsg?: string) => {
  appendLog(`chunk uploadError ${file.name} ${errorMsg ?? ""}\n${JSON.stringify({fileName: file.name, errorMsg: errorMsg ?? null, response: file.response ?? null}, null, 2)}`)
}
</script>

<style scoped>
.probe-log {
  max-height: 320px;
  overflow: auto;
  margin: 0;
  padding: 8px 12px;
  background-color: rgba(128, 128, 128, 0.08);
  border-radius: var(--ant-border-radius-lg);
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
