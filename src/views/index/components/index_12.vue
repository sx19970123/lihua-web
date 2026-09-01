<template>
  <div>
    <expandable-card
        style="width: 100%"
        :expanded-width="600"
        :expanded-height="610"
    >
      <template #overview>
        <div class="card-background" style="height: 124px; padding: var(--ant-padding-lg); box-sizing: border-box">
          <a-typography-title :level="4" ellipsis style="margin-bottom: 10px">免费开源</a-typography-title>
          <a-typography-text ellipsis type="secondary">
            <a-typography-text type="secondary">基于</a-typography-text>
            <a-typography-text :style="{color:themeStore.getColorPrimary()}">MIT</a-typography-text>
            <a-typography-text type="secondary">开源协议</a-typography-text>
          </a-typography-text>
        </div>
      </template>
      <template #detail>
        <div class="scrollbar card-background" style="padding: var(--ant-padding-lg)">
          <a-typography-title :level="4" ellipsis>免费开源</a-typography-title>
          <a-typography-text ellipsis type="secondary">
            <a-typography-text type="secondary">基于</a-typography-text>
            <a-typography-text :style="{color:themeStore.getColorPrimary()}">MIT</a-typography-text>
            <a-typography-text type="secondary">开源协议</a-typography-text>
          </a-typography-text>
          <br/>
          <div class="scrollbar dark-overlay" style="height: 484px;margin-top: var(--ant-margin-xs)">
            <a-typography-text type="secondary">免费全开源且可商用，无版权问题</a-typography-text>
            <img src="../static/bq.png" style="width: 100%;border-radius: var(--ant-border-radius-lg);margin-top: var(--ant-margin-xs)" alt=""/>
          </div>
        </div>
      </template>
    </expandable-card>
  </div>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
</script>
<style scoped>
.card-background {
  background-position-y: 10px; /* 增加10像素间距 */
  background-position-x: calc(100% - 10px); /* 保持右对齐 */
  background-repeat: no-repeat;
  background-size: 36px 36px;
}
</style>
