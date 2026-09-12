<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">大小限制</a-typography-title>
    <a-typography-text>仅允许上传 1MB 以内附件，超出应被拒绝</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload v-model="modelValue" :max-size="1" text="点击上传（限 1MB）"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {ref} from "vue";

const modelValue = ref<string>('')
</script>
