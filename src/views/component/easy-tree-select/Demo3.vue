<template>
  <a-typography-title :level="4">自定义插槽</a-typography-title>
  <a-typography-text>选中的值：{{value}}</a-typography-text>
  <easy-tree-select style="width: 300px" v-if="test_tree.length > 0" :tree-data="test_tree" v-model="value">
    <template #title="{id,segments}">
      <span v-for="(segment, index) in segments" :key="index"
            :style="segment.hit ? {color: themeStore.getColorPrimary()} : undefined">{{segment.text}}</span>
      {{' [' + id + ']'}}
    </template>
  </easy-tree-select>
</template>
<script setup lang="ts">
import EasyTreeSelect from '@/components/easy-tree-select/index.vue'
import {initDict} from "@/helpers/dict.ts"
import {ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
const {test_tree} = initDict("test_tree")
const value = ref<string[]>([])
</script>
