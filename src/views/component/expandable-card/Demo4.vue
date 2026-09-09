<template>
  <a-typography-title :level="4">受控展开</a-typography-title>
  <a-typography-paragraph type="secondary">
    v-model:expanded 由外部驱动开合（类似 Modal 的 open）：置 true 展开、置 false 关闭；点击/Esc/蒙版等内部触发同样会回写同步状态。
  </a-typography-paragraph>
  <a-flex :gap="16" wrap="wrap" align="flex-start">
    <expandable-card class="w-[300px]"
                     v-model:expanded="expanded"
                     :expanded-width="600"
                     :expanded-height="400"
    >
      <template #overview>
        <div class="stat-card" :style="{background: gradient}">
          <div class="stat-card-name">内存占用</div>
          <div class="stat-card-value">42%</div>
          <div class="stat-card-trend">16.8 GB / 32 GB</div>
        </div>
      </template>
      <template #detail>
        <div class="scrollbar p-ant-lg">
          <a-typography-title :level="4">内存占用详情</a-typography-title>
          <a-progress style="margin-top: var(--ant-margin)" :percent="42" :stroke-color="themeStore.getColorPrimary()"/>
          <a-descriptions style="margin-top: var(--ant-margin)" :column="1" size="small" bordered>
            <a-descriptions-item label="总计">32 GB</a-descriptions-item>
            <a-descriptions-item label="已用">16.8 GB</a-descriptions-item>
            <a-descriptions-item label="缓存">6.2 GB</a-descriptions-item>
            <a-descriptions-item label="可用">15.2 GB</a-descriptions-item>
          </a-descriptions>
        </div>
      </template>
    </expandable-card>

    <a-space direction="vertical" style="width: 200px">
      <a-tag :color="expanded ? themeStore.getColorPrimary() : undefined">expanded = {{ expanded }}</a-tag>
      <a-button type="primary" @click="expanded = true">展开</a-button>
      <a-button @click="expanded = false">关闭</a-button>
      <a-button @click="expanded = !expanded">切换</a-button>
    </a-space>
  </a-flex>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
import {computed, ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()
const gradient = computed(() => {
  const primary = themeStore.getColorPrimary()
  return `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 45%, #101018))`
})

// 受控状态：外部置 true/false 即可驱动卡片开合
const expanded = ref(false)
</script>

<style scoped>
.stat-card {
  padding: var(--ant-padding-lg);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.stat-card-name {
  font-size: var(--ant-font-size-sm);
  opacity: .85;
}

.stat-card-value {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: .5px;
}

.stat-card-trend {
  font-size: var(--ant-font-size-sm);
  opacity: .85;
}
</style>
