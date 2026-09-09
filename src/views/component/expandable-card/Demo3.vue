<template>
  <a-typography-title :level="4">外观定制</a-typography-title>
  <a-typography-paragraph type="secondary">
    右卡通过 isDetailVisible 关闭展开能力，elevated 默认跟随——静态卡自动去掉阴影与悬停上浮，显式传 :elevated 可解耦；底色/圆角/边框/阴影恒走主题 token。
  </a-typography-paragraph>
  <a-flex :gap="16" wrap="wrap" align="flex-start">
    <div>
      <expandable-card class="w-[300px]"
                       :expanded-width="600"
                       :expanded-height="400"
      >
        <template #overview>
          <div class="stat-card" :style="{background: gradient}">
            <div class="stat-card-name">磁盘吞吐</div>
            <div class="stat-card-value">312 MB/s</div>
            <div class="stat-card-trend">较昨日 &darr; 4.1%</div>
          </div>
        </template>
        <template #detail>
          <div class="scrollbar p-ant-lg">
            <a-typography-title :level="4">磁盘吞吐明细</a-typography-title>
            <a-timeline style="margin-top: var(--ant-margin)">
              <a-timeline-item>00:00 - 06:00 峰值 388 MB/s（定时备份）</a-timeline-item>
              <a-timeline-item>06:00 - 12:00 均值 265 MB/s</a-timeline-item>
              <a-timeline-item>12:00 - 18:00 均值 291 MB/s</a-timeline-item>
              <a-timeline-item color="red">18:23 异常抖动 45 MB/s（已恢复）</a-timeline-item>
            </a-timeline>
          </div>
        </template>
      </expandable-card>
      <a-typography-text type="secondary" :styles="{root: {display: 'block', marginTop: '8px'}}">可展开 · 悬停上浮</a-typography-text>
    </div>
    <div>
      <expandable-card class="w-[300px]" :is-detail-visible="false">
        <template #overview>
          <div class="face">
            <div class="min-w-0">
              <a-typography-title :level="4" ellipsis>系统版本</a-typography-title>
              <a-typography-text ellipsis type="secondary">点击无效 · 悬停无反馈 · 无阴影</a-typography-text>
            </div>
            <dashboard-outlined class="face-icon" :style="{color: themeStore.getColorPrimary()}"/>
          </div>
        </template>
        <!-- 静态卡没有 detail：不配置 expanded 尺寸，也不会展开 -->
      </expandable-card>
      <a-typography-text type="secondary" :styles="{root: {display: 'block', marginTop: '8px'}}">静态卡 · 平面呈现</a-typography-text>
    </div>
  </a-flex>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
import {computed} from "vue";
import {DashboardOutlined} from '@antdv-next/icons'
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()
const gradient = computed(() => {
  const primary = themeStore.getColorPrimary()
  return `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 45%, #101018))`
})
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

.face {
  height: 108px;
  padding: var(--ant-padding-lg);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ant-padding);
}

.face-icon {
  font-size: 36px;
  opacity: .85;
  flex-shrink: 0;
}
</style>
