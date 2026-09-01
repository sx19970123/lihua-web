<template>
  <a-typography-title :level="4">数据卡片</a-typography-title>
  <expandable-card
      style="width: 300px"
      :hover-scale="1.03"
      overview-fit="four"
      :expanded-width="720"
      :expanded-height="600"
  >
    <template #overview>
      <!-- 渐变数据卡：左上角小字指标名 + 加粗大数字 -->
      <div class="stat-card" :style="{background: statGradient}">
        <div class="stat-card-name">营业额</div>
        <div class="stat-card-value">&yen; 128,430.00</div>
        <div class="stat-card-trend">较上月 <span class="stat-card-up">&uarr; 12.6%</span></div>
      </div>
    </template>
    <template #detail>
      <a-card class="scrollbar">
        <a-typography-title :level="4">营业额明细</a-typography-title>
        <a-table :columns="columns" :data-source="dataSource" :pagination="false" size="middle"/>
      </a-card>
    </template>
  </expandable-card>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
import {computed} from "vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
// 渐变跟随主题主色，深色端点加深（明暗两套主题下文字都保持可读）
const statGradient = computed(() => {
  const primary = themeStore.getColorPrimary()
  return `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 45%, #101018))`
})

const columns = [
  {title: '月份', dataIndex: 'month', key: 'month'},
  {title: '订单数', dataIndex: 'orders', key: 'orders', align: 'right'},
  {title: '营业额', dataIndex: 'amount', key: 'amount', align: 'right'},
  {title: '环比', dataIndex: 'trend', key: 'trend', align: 'right'},
]

// 页面内 mock：近八个月营业额
const dataSource = [
  {key: '1', month: '2026-01', orders: 312, amount: '¥ 86,120.00', trend: '—'},
  {key: '2', month: '2026-02', orders: 289, amount: '¥ 81,340.00', trend: '↓ 5.6%'},
  {key: '3', month: '2026-03', orders: 356, amount: '¥ 98,740.00', trend: '↑ 21.4%'},
  {key: '4', month: '2026-04', orders: 401, amount: '¥ 112,580.00', trend: '↑ 14.0%'},
  {key: '5', month: '2026-05', orders: 388, amount: '¥ 108,920.00', trend: '↓ 3.2%'},
  {key: '6', month: '2026-06', orders: 437, amount: '¥ 119,460.00', trend: '↑ 9.7%'},
  {key: '7', month: '2026-07', orders: 462, amount: '¥ 114,070.00', trend: '↓ 4.5%'},
  {key: '8', month: '2026-08', orders: 515, amount: '¥ 128,430.00', trend: '↑ 12.6%'},
]
</script>

<style scoped>
.stat-card {
  height: 110px;
  padding: var(--ant-padding);
  border-radius: var(--ant-border-radius-lg);
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
.stat-card-up {
  font-weight: 600;
}
</style>
