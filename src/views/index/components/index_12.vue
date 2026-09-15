<template>
  <expandable-card class="w-full"
      :expanded-width="600"
      :expanded-height="610"
  >
    <template #overview>
      <div class="h-[124px] p-ant-lg box-border">
        <a-typography-title :level="4" ellipsis :styles="{root: {marginBottom: '10px'}}">免费开源</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">基于</a-typography-text>
          <a-typography-text :styles="{root: {color: themeStore.getColorPrimary()}}">MIT</a-typography-text>
          <a-typography-text type="secondary">开源协议</a-typography-text>
        </a-typography-text>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis>免费开源</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">基于</a-typography-text>
          <a-typography-text :styles="{root: {color: themeStore.getColorPrimary()}}">MIT</a-typography-text>
          <a-typography-text type="secondary">开源协议</a-typography-text>
        </a-typography-text>
        <br/>
        <div class="scrollbar dark-overlay h-[484px] mt-ant-xs">
          <a-typography-text type="secondary">免费全开源且可商用，无版权问题</a-typography-text>
          <img src="../static/bq.png" class="w-full rounded-ant-lg mt-ant-xs" alt=""/>
        </div>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
</script>
