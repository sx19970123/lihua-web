<template>
  <a-typography-title :level="4">标签变体</a-typography-title>
  <a-typography>默认 outlined（有边框，2.x 基线）</a-typography>
  <dict-tag dict-data-value="0" :dict-data-option="sys_status"/>
  <a-typography>filled（无边框填充底）</a-typography>
  <dict-tag dict-data-value="0" :dict-data-option="sys_status" variant="filled"/>
  <a-typography>solid（实心底白字，深色业务色对比最佳）</a-typography>
  <dict-tag dict-data-value="0" :dict-data-option="sys_status" variant="solid"/>
</template>

<script setup lang="ts">
import DictTag from "@/components/dict-tag/index.vue"
import {initDict} from "@/helpers/dict.ts"

const {sys_status} = initDict("sys_status")
</script>
