<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">类型限制</a-typography-title>
    <a-typography-text>仅允许上传 .jpg / .png 类型附件，其余类型应被拒绝</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload v-model="modelValue" :upload-type="['.jpg', '.png']" text="点击上传（仅 jpg/png）"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {ref} from "vue";

const modelValue = ref<string>('')
</script>
