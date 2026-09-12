<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">数量限制</a-typography-title>
    <a-typography-text>最多上传 3 个附件，一次选择 4 个文件时第 4 个应被拒绝（组件仅抛出事件，页面自行提示）</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload v-model="modelValue" :max-count="3" @exceed-max-count="handleExceed"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {message} from "@/antd-adapter";
import {ref} from "vue";

const modelValue = ref<string>('')

const handleExceed = () => {
  message.warning("已超出最大上传数量 3，超出部分被拒绝")
}
</script>
