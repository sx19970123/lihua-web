<template>
  <a-typography-title :level="4">异步加载</a-typography-title>
  <a-typography-paragraph type="secondary">
    auto-complete 关闭后由 is-complete 控制内容就绪。左卡模拟 250ms 响应：等待层先出现，数据在展开动画（340ms）结束前就绪，飞行途中即换上详情——动画播完时内容已就位；右卡模拟 1.5s 响应：动画播完后停在等待层，并透传 loading 插槽自定义等待内容（默认为居中 a-spin）。
  </a-typography-paragraph>
  <a-flex :gap="16" wrap="wrap" align="flex-start">
    <div>
      <expandable-card style="width: 300px"
                       :expanded-width="600"
                       :expanded-height="400"
                       :auto-complete="false"
                       :is-complete="earlySuccess"
                       @before-card-expand="loadEarly"
                       @after-card-close="resetEarly"
      >
        <template #overview>
          <!-- 渐变数据卡：指标名 + 大数字 + 趋势，配色跟随主题主色 -->
          <div class="stat-card" :style="{background: gradient}">
            <div class="stat-card-name">今日订单</div>
            <div class="stat-card-value">3,128</div>
            <div class="stat-card-trend">较昨日 <span class="stat-card-up">&uarr; 8.2%</span></div>
          </div>
        </template>
        <template #detail>
          <div class="scrollbar" style="padding: var(--ant-padding-lg)">
            <a-typography-title :level="4">今日订单概览</a-typography-title>
            <a-flex :gap="32" wrap="wrap" style="margin-top: var(--ant-margin)">
              <a-statistic title="订单总数" :value="3128"/>
              <a-statistic title="待发货" :value="127"/>
              <a-statistic title="已完成" :value="2861" :value-style="{color: themeStore.getColorPrimary()}"/>
              <a-statistic title="退款" :value="140"/>
            </a-flex>
            <a-alert style="margin-top: var(--ant-margin-lg)" type="success" show-icon
                     message="数据在展开动画结束前返回：等待层先出现、飞行途中换上详情，动画播完时内容已就位"/>
          </div>
        </template>
      </expandable-card>
      <a-typography-text type="secondary" :style="{display: 'block', marginTop: '8px'}">数据先于动画完成 · 无等待层</a-typography-text>
    </div>

    <div>
      <expandable-card style="width: 300px"
                       :expanded-width="600"
                       :expanded-height="400"
                       :auto-complete="false"
                       :is-complete="lateSuccess"
                       @before-card-expand="loadLate"
                       @after-card-close="resetLate"
      >
        <template #overview>
          <div class="stat-card" :style="{background: gradient}">
            <div class="stat-card-name">当前在线</div>
            <div class="stat-card-value">87</div>
            <div class="stat-card-trend">峰值 120 · 最低 41</div>
          </div>
        </template>
        <template #detail>
          <div class="scrollbar" style="padding: var(--ant-padding-lg)">
            <a-typography-title :level="4">在线用户</a-typography-title>
            <a-table :columns="columns" :data-source="dataSource" :pagination="false" size="middle"/>
          </div>
        </template>
        <!-- 自定义等待层：不传该插槽时默认居中展示 a-spin -->
        <template #loading>
          <a-flex vertical align="center" :gap="12">
            <a-spin size="large"/>
            <a-typography-text type="secondary">正在加载喵…</a-typography-text>
          </a-flex>
        </template>
      </expandable-card>
      <a-typography-text type="secondary" :style="{display: 'block', marginTop: '8px'}">数据晚于动画完成 · 自定义 loading</a-typography-text>
    </div>
  </a-flex>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
import {computed, ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()
// 渐变跟随主题主色，深色端点加深（明暗两套主题下文字都保持可读）
const gradient = computed(() => {
  const primary = themeStore.getColorPrimary()
  return `linear-gradient(135deg, ${primary}, color-mix(in srgb, ${primary} 45%, #101018))`
})

const columns = [
  {title: '用户', dataIndex: 'name', key: 'name'},
  {title: '部门', dataIndex: 'dept', key: 'dept'},
  {title: '登录时间', dataIndex: 'time', key: 'time'},
  {title: '状态', dataIndex: 'state', key: 'state', align: 'right'},
]

const dataSource = [
  {key: '1', name: 'admin', dept: '研发部', time: '09:02', state: '在线'},
  {key: '2', name: 'yukino', dept: '研发部', time: '09:14', state: '在线'},
  {key: '3', name: 'lihua', dept: '运维部', time: '09:31', state: '在线'},
  {key: '4', name: 'zhangsan', dept: '市场部', time: '10:05', state: '离开'},
  {key: '5', name: 'lisi', dept: '市场部', time: '10:47', state: '在线'},
]

// 左卡：50ms —— 早于 340ms 的展开动画完成，等待层不出现
const earlySuccess = ref<boolean>(false)
const loadEarly = () => {
  setTimeout(() => {
    earlySuccess.value = true
  }, 50)
}
const resetEarly = () => {
  earlySuccess.value = false
}

// 右卡：1500ms —— 晚于展开动画完成，等待层可见
const lateSuccess = ref<boolean>(false)
const loadLate = () => {
  setTimeout(() => {
    lateSuccess.value = true
  }, 1500)
}
const resetLate = () => {
  lateSuccess.value = false
}
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

.stat-card-up {
  font-weight: 600;
}
</style>
