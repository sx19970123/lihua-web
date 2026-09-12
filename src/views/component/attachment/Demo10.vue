<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">自动删除</a-typography-title>
    <a-typography-text>删除列表内附件时弹出确认框，确认后调用业务删除接口</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload v-model="modelValue" auto-remove text="点击上传（删除需确认）"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {ref} from "vue";

const modelValue = ref<string>('')
</script>
