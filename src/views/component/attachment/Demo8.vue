<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">单文件与指定附件名</a-typography-title>
    <a-typography-text>单文件模式，附件名固定为「演示合同 + 原扩展名」，业务编码 AttachmentDemo / 业务名称 附件演示</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload v-model="modelValue" :multiple="false" file-name="演示合同"
                       business-code="AttachmentDemo" business-name="附件演示" text="点击上传（单文件）"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {ref} from "vue";

const modelValue = ref<string>('')
</script>
