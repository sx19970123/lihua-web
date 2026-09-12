<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">附件回显</a-typography-title>
    <a-typography-text>输入已上传的附件 id（逗号分隔），组件按 id 批量查询并回显附件列表（info 契约链路）</a-typography-text>
    <a-input v-model:value="modelValue" placeholder="填写附件 id，多个以英文逗号分隔" allow-clear/>
    <attachment-upload v-model="modelValue"/>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {ref} from "vue";

const modelValue = ref<string>('')
</script>
