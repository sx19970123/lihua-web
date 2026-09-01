<template>
  <expandable-card
             style="width: 100%"
             @card-click="handleClick"
             :is-detail-visible="false"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div style="height: 124px; padding: var(--ant-padding-lg); box-sizing: border-box">
        <a-typography-title :level="4" ellipsis>
          <img src="https://gitee.com/static/images/logo.svg?t=158106664" alt="" style="height: 40px" v-if="themeStore.isDarkTheme">
          <img src="https://gitee.com/static/images/logo-black.svg?t=158106664" alt="" style="height: 40px" v-else>
          码云主页
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
<style scoped>

</style>
