<template>
  <section>
    <router-view v-slot="{ Component, route}">
      <!-- zoom： 变焦 pop：弹入 fade：浮现 blur：模糊 slide-right：右滑 slide-left：左滑 slide-up：上滑 slide-down：下滑-->
      <transition :name="themeStore.routeTransition" mode="out-in" @enter="onContentEnter">
        <keep-alive :include = "viewTabsStore.$state.componentAlive" :max="aliveCacheMax">
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
import {useRoute} from "vue-router";
import {useThemeStore} from "@/stores/theme";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {restorePageScroll} from "@/utils/scrollbar.ts";
import PageFooter from "@/layout/footer/index.vue";

const route = useRoute()
const themeStore = useThemeStore()
const viewTabsStore = useViewTabsStore()

/* keep-alive 页签缓存上限：按设备内存分档（≥8G 或读不到→20 / 4G→10 / ≤2G→5；Safari/Firefox 无 deviceMemory 取高档） */
const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
const aliveCacheMax = !deviceMemory || deviceMemory >= 8 ? 20 : deviceMemory >= 4 ? 10 : 5

/* 新页签进场时恢复其滚动位置。必须挂 @enter 而非 @before-enter：Vue 渲染器顺序为
   beforeEnter→insert→enter，且 mode=out-in 下新组件进场时旧组件已移除——before-enter 时
   文档只剩布局骨架（≈一屏高），scrollTo(保存值) 被暂态高度钳到 0，组件插入后停在顶部
   （「永远回顶」根因）；@enter 在插入后同 flush 触发（keep-alive 缓存子树同步恢复、高度
   立即正确）， scrollTo 精确且先于首帧绘制不可见。机制见 utils/scrollbar.ts 对应节 */
const onContentEnter = () => restorePageScroll(route.path)
</script>

<style scoped>
/* 以 flex item 身份撑满 .layout-content（flex:1 传播不依赖高度 definiteness，父级已改 flex column，
   见 layout.css），页脚 margin-top:auto 才有自由空间钉底 */
section {
  display: flex;
  flex-direction: column;
  flex: 1;
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
