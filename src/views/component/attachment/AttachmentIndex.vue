<template>
  <a-flex vertical :gap="16">
    <a-alert message="最大上传数量为10，一般上传最大允许10M附件，分片上传最大允许上传100M附件，每晚定时任务会将已上传的附件清除，演示环境文件服务为本地文件。"/>
    <a-card>
      <template #title>
        <a-typography-link :href="baseDocApi + '2.0/doc-web/components/attachment-upload'" target="_blank">组件文档</a-typography-link>
      </template>
      <a-flex vertical :gap="16" style="margin-top: var(--ant-margin)">
        <demo1/>
        <demo2/>
        <demo3/>
        <demo4/>
        <demo5/>
        <demo6/>
        <demo7/>
        <demo8/>
        <demo9/>
        <demo10/>
        <demo11/>
        <demo12/>
      </a-flex>
    </a-card>
  </a-flex>
</template>

<script setup lang="ts">
import Demo1 from './Demo1.vue'
import Demo2 from './Demo2.vue'
import Demo3 from './Demo3.vue'
import Demo4 from './Demo4.vue'
import Demo5 from './Demo5.vue'
import Demo6 from './Demo6.vue'
import Demo7 from './Demo7.vue'
import Demo8 from './Demo8.vue'
import Demo9 from './Demo9.vue'
import Demo10 from './Demo10.vue'
import Demo11 from './Demo11.vue'
import Demo12 from './Demo12.vue'

const baseDocApi = import.meta.env.VITE_APP_DOC_API
</script>