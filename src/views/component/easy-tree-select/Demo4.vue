<template>
  <a-typography-title :level="4">虚拟滚动</a-typography-title>
  <a-typography-text>共 {{nodeCount}} 个节点，设置 height 启用虚拟滚动，仅渲染可视区域节点；选中的值：{{value}}</a-typography-text>
  <easy-tree-select style="width: 300px" :tree-data="mockTree" v-model="value" :height="400" :default-expand-all="true"/>
</template>
<script setup lang="ts">
import EasyTreeSelect from '@/components/easy-tree-select/index.vue'
import {computed, ref} from "vue";

// 模拟大树：100 个分组 × 每组 10 个子节点
const mockTree = ref<Array<Record<string, any>>>(Array.from({length: 100}, (_, groupIndex) => ({
  id: `g-${groupIndex + 1}`,
  label: `分组 ${groupIndex + 1}`,
  children: Array.from({length: 10}, (_, itemIndex) => ({
    id: `g-${groupIndex + 1}-${itemIndex + 1}`,
    label: `节点 ${groupIndex + 1}-${itemIndex + 1}`
  }))
})))

// 节点总数（分组 + 子节点）
const nodeCount = computed(() => mockTree.value.reduce((count, group) => count + 1 + group.children.length, 0))

const value = ref<string[]>([])
</script>
