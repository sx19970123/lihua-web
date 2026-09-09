<template>
  <expandable-card
             class="w-full"
             :is-detail-visible="false"
             :expanded-width="600"
             @card-click="handleClick"
             :expanded-height="610"
  >
    <template #overview>
      <div class="h-[124px] p-ant-lg box-border">
        <a-typography-title :level="4" ellipsis>开发文档</a-typography-title>
        <a-typography-text type="secondary" ellipsis>前端 后端 移动端</a-typography-text>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";

const handleClick = () => {
  window.open(import.meta.env.VITE_APP_DOC_API,"_blank");
}
</script>
