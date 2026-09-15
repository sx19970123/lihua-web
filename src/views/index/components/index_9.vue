<template>
  <expandable-card
             class="w-full"
             @card-click="handleClick"
             :is-detail-visible="false"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="h-[124px] p-ant-lg box-border">
        <a-typography-title :level="4" ellipsis>
          <img src="https://gitee.com/static/images/logo.svg?t=158106664" alt="" class="h-10" v-if="themeStore.isDarkTheme">
          <img src="https://gitee.com/static/images/logo-black.svg?t=158106664" alt="" class="h-10" v-else>
          仓库
        </a-typography-title>
        <a-typography-text type="secondary" ellipsis>Yukino/lihua & lihua-cloud</a-typography-text>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
const handleClick = () => {
  window.open('https://gitee.com/yukino_git')
}
</script>
