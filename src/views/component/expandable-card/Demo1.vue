<template>
  <a-typography-title :level="4">基础用法</a-typography-title>
  <expandable-card :expanded-height="600" :expanded-width="600">
    <template #overview>
      <div style="height: 108px; padding: var(--ant-padding-lg); box-sizing: border-box">
        <a-typography-title>这里是封面</a-typography-title>
      </div>
    </template>
    <template #detail>
      <div style="height: 108px; padding: var(--ant-padding-lg); box-sizing: border-box">
        <a-typography-title>这里是展开</a-typography-title>
      </div>
    </template>
  </expandable-card>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
</script>