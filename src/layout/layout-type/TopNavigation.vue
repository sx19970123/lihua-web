<template>
  <a-layout class="layout">
    <div class="background-glass relative z-10"
         :class="{ 'sticky top-0': themeStore.affixHead,
                   'dark-header': themeStore.siderTheme === 'dark' && !themeStore.isSmallWindow }">
      <transition :name="themeStore.routeTransition" mode="out-in">
        <a-layout-header class="top-navigation-layout-header relative z-10 layout-soft-shadow"
                         :class="{'top-navigation-header-transparent': themeStore.siderTheme !== 'dark'}"
                         v-show="props.showLayout">
          <a-flex class="top-navigation-head-inner" align="center" gap="middle">
            <!--logo-->
            <Logo/>
            <!--导航（顶部导航占用剩余空间）-->
            <a-flex class="min-w-0" :flex="1">
              <Side class="header-menu-fill" sider-mode="horizontal"/>
            </a-flex>
            <!--页头-->
            <div id="lihua-layout-head"/>
          </a-flex>
        </a-layout-header>
      </transition>
      <!--多标签-->
      <view-tabs v-if="themeStore.showViewTabs && !themeStore.isMiniWindow"/>
    </div>
    <a-layout-content>
      <!--内容-->
      <div id="lihua-layout-content" class="layout-content" />
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import ViewTabs from "@/layout/view-tabs/index.vue";
import Side from "@/layout/sider/index.vue";
import Logo from "@/layout/logo/index.vue";
import {useThemeStore} from "@/stores/theme";

const themeStore = useThemeStore()
const props = defineProps<{showLayout: boolean }>()
</script>

<style scoped>
/* padding/height/line-height 需压过 .ant-layout-header 根级 cssinjs 声明，故留 scoped（position/z-index/box-shadow 已迁工具类） */
.top-navigation-layout-header {
  padding: 0;
  height: var(--lihua-layout-height);
  line-height: var(--lihua-layout-height);
}
/* 浅色导航压掉 Layout.Header 默认深色底、让外层容器的玻璃底透出；
   深色导航保留默认底——菜单根背景为透明、文字是深色主题浅色字，需要深色底衬托 */
.top-navigation-header-transparent {
  background: transparent;
}

/* padding 需压过 .ant-flex 根级显式 padding:0，故留 scoped */
.top-navigation-head-inner {
  padding: 0 var(--lihua-layout-head-space);
}
</style>
