<template>
  <!--  ellipsis 单行省略：小屏收缩后版权文案自动截尾不折行（footer 定高 32px，折行会溢出），
        宽屏文案放得下时完整显示；省略类走 cssinjs 全局注入，无 a-typography-text 不传父 scopeId 的问题  -->
  <a-typography-text type="secondary" class="unselectable" ellipsis>{{ copyrightText }}</a-typography-text>
</template>
<script setup lang="ts">
import dayjs from "dayjs"
import appInfo from "@/app-info.ts"

// 版权文案中的 {{year}} 关键字替换为当前年份（元信息保持纯静态字符串，年份在消费组件内展开）
const copyrightText = appInfo.copyright.replace(/\{\{year\}\}/g, String(dayjs().year()))
</script>
