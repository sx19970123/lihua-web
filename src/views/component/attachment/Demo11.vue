<template>
  <a-flex vertical :gap="8">
    <a-typography-title :level="4">暂存删除与业务提交</a-typography-title>
    <a-typography-text>列表内删除仅暂存 id，点击「提交业务删除」统一调用业务删除接口（组件 expose 的 businessRemove）</a-typography-text>
    <a-typography-text>绑定数据：{{modelValue}}</a-typography-text>
    <attachment-upload ref="uploadRef" v-model="modelValue" text="点击上传（删除先暂存）"/>
    <a-button type="primary" @click="handleSubmitRemove">提交业务删除</a-button>
  </a-flex>
</template>

<script setup lang="ts">
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import {message} from "@/antd-adapter";
import {ref} from "vue";

const modelValue = ref<string>('')
const uploadRef = ref<InstanceType<typeof AttachmentUpload>>()

const handleSubmitRemove = async () => {
  try {
    const resp = await uploadRef.value?.businessRemove() as { code?: number, msg?: string } | undefined
    if (resp && resp.code === 200) {
      message.success("业务删除完成")
    } else if (resp) {
      message.error(resp.msg ?? "业务删除失败")
    }
  } catch (e) {
    message.error((e as { msg?: string })?.msg ?? "业务删除失败")
  }
}
</script>
