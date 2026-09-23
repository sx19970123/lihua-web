<template>
  <a-typography-title :level="4">树形字典回显</a-typography-title>
  <a-typography>某一节点的回显</a-typography>
  <dict-tag dict-data-value="2-2" :dict-data-option="tree"/>
  <a-typography>展示全路径</a-typography>
  <dict-tag dict-data-value="2-2-1" :dict-data-option="tree" full-tree-node/>
  <a-typography>路径前增加前缀</a-typography>
  <dict-tag dict-data-value="2-2-1" :dict-data-option="tree" full-tree-node root-tree-node-prefix="~"/>

  <a-typography-text strong>树形字典结构</a-typography-text>
  <a-tree style="padding: var(--ant-padding)"
          v-if="tree.length"
          :tree-data="tree"
          :field-names="{children:'children', title:'label', key:'id'}"
          default-expand-all/>
</template>

<script setup lang="ts">
import DictTag from "@/components/dict-tag/index.vue"
import {initDict} from "@/helpers/dict.ts"

const {tree} = initDict("tree")
</script>