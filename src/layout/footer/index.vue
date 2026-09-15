<template>
  <a-typography-text type="secondary" class="unselectable">{{ copyrightText }}</a-typography-text>
</template>
<script setup lang="ts">
import dayjs from "dayjs"
import appInfo from "@/app-info.ts"

// 版权文案中的 {{year}} 关键字替换为当前年份（元信息保持纯静态字符串，年份在消费组件内展开）
const copyrightText = appInfo.copyright.replace(/\{\{year\}\}/g, String(dayjs().year()))
</script>
