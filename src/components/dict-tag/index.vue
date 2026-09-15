<template>
  <template v-for="item in dictDataOption">
<!--    label标签-->
    <a-tag v-if="item.value === dictDataValue"
           class="w-fit"
           :styles="styles"
           :color="item.tagStyle"
           :variant="variant">
      <template v-if="fullTreeNode">
<!--       rootTreeNodePrefix 以分割符开头情况下，去除首位分割符 -->
        <template v-if="rootTreeNodePrefix.startsWith(fullTreeSeparator)">
          {{ rootTreeNodePrefix.substring(fullTreeSeparator.length) + fullTreeSeparator + item.label }}
        </template>
<!--       自定义 rootTreeNodePrefix 的情况下保留 rootTreeNodePrefix -->
        <template v-else>
          {{ rootTreeNodePrefix + fullTreeSeparator + item.label }}
        </template>
      </template>
      <template v-else>
        {{ item.label }}
      </template>
    </a-tag>
<!--    递归调用组件-->
    <dict-tag v-else-if="item.children"
              class="w-fit"
              :dict-data-value="dictDataValue"
              :dict-data-option="item.children"
              :variant="variant"
              :full-tree-node="fullTreeNode"
              :root-tree-node-prefix="rootTreeNodePrefix === '' ? fullTreeSeparator + item.label : rootTreeNodePrefix + fullTreeSeparator + item.label"
    />
  </template>
</template>

<script setup lang="ts">
import dictTag from "@/components/dict-tag/index.vue"
import type {SysDictDataType} from "@/api/system/dict/type/sys-dict-data-type.ts";
import type {TagStylesType} from "@/antd-adapter";

// 从父组件接收参数
const {dictDataOption, dictDataValue, variant = 'outlined', styles = {root: {marginRight: 0}},
  fullTreeNode = false, fullTreeSeparator = '/', rootTreeNodePrefix = ''} = defineProps<{
  // 字典data集合
  dictDataOption: Array<SysDictDataType>,
  // 被翻译的字典值（空值/未命中渲染为空，是列表数据的合法形态，不视为配置错误）
  dictDataValue: string,
  // 标签变体（透传 a-tag variant，默认 outlined 保持 2.x 有边框基线）
  variant?: 'outlined' | 'filled' | 'solid',
  // 标签语义化自定义样式（透传 a-tag styles；默认压掉全局补回的相邻 tag 右边距）
  styles?: TagStylesType,
  // 展示树型结构全路径
  fullTreeNode?: boolean,
  // 树型结构分隔符
  fullTreeSeparator?: string,
  // 树型根节点前缀
  rootTreeNodePrefix?: string
}>()
</script>
