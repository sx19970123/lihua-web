<template>
  <section>
    <router-view v-slot="{ Component, route}">
      <!-- zoom： 变焦 pop：弹入 fade：浮现 blur：模糊 slide-right：右滑 slide-left：左滑 slide-up：上滑 slide-down：下滑-->
      <transition :name="themeStore.routeTransition" mode="out-in">
        <keep-alive :include = "viewTabsStore.$state.componentAlive" :max="5">
          <component :is="Component" :key="route.path + viewTabsStore.$state.contentComponentKey"/>
        </keep-alive>
      </transition>
    </router-view>
    <!--  页脚：纵向 flex 末位，margin-top:auto 钉在内容区底部（短页面不上浮，长页面随内容滚动）  -->
    <footer class="layout-footer" v-if="themeStore.$state.showFooter">
      <page-footer/>
    </footer>
  </section>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import PageFooter from "@/layout/footer/index.vue";

const themeStore = useThemeStore()
const viewTabsStore = useViewTabsStore()
</script>

<style scoped>
/* 撑满内容区（高度上下文由 layout.css 的 .layout-content height:100% 提供），页脚才钉得住底 */
section {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

/* 原生 footer 元素无组件库默认样式，无需压制；显示时内容区底 padding 已被融合公式清零，本行兼任底部留白 */
.layout-footer {
  margin-top: auto;
  height: var(--footer-height);
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
