<template>
  <a-layout class="layout">
    <div class="top-navigation-header background-glass"
         :class="{ 'affix-header': themeStore.affixHead,
                   'dark-header': themeStore.siderTheme === 'dark' && !themeStore.isSmallWindow }">
      <transition :name="themeStore.routeTransition" mode="out-in">
        <a-layout-header class="top-navigation-layout-header"
                         :class="{'top-navigation-header-transparent': themeStore.siderTheme !== 'dark'}"
                         v-show="props.showLayout">
          <a-flex class="top-navigation-head-inner" align="center" gap="middle">
            <!--logo-->
            <Logo/>
            <!--导航（顶部导航占用剩余空间）-->
            <a-flex class="sider" :flex="1">
              <Side class="header-menu-fill" sider-mode="horizontal"/>
            </a-flex>
            <!--页头-->
            <div id="lihua-layout-head"/>
          </a-flex>
        </a-layout-header>
      </transition>
      <!--多标签-->
      <view-tabs v-if="themeStore.showViewTabs"/>
    </div>
    <a-layout-content>
      <!--内容-->
      <div id="lihua-layout-content" class="layout-content" />
    </a-layout-content>
    <!--页脚-->
    <a-layout-footer class="layout-footer" v-if="themeStore.$state.showFooter">
      <page-footer/>
    </a-layout-footer>
  </a-layout>
</template>

<script setup lang="ts">
import ViewTabs from "@/layout/view-tabs/index.vue";
import Side from "@/layout/sider/index.vue";
import PageFooter from "@/layout/footer/index.vue";
import Logo from "@/layout/logo/index.vue";
import {useThemeStore} from "@/stores/theme";

const themeStore = useThemeStore()
const props = defineProps<{showLayout: boolean }>()
</script>

<style scoped>
.top-navigation-header {
  position: relative;
  z-index: 10;
}
.affix-header {
  position: sticky;
  top: 0;
}
.top-navigation-layout-header {
  position: relative;
  z-index: 10;
  padding: 0;
  height: var(--lihua-layout-height);
  line-height: var(--lihua-layout-height);
  box-shadow: var(--ant-box-shadow-tertiary);
}
/* 浅色导航压掉 Layout.Header 默认深色底、让外层容器的玻璃底透出；
   深色导航保留默认底——菜单根背景为透明、文字是深色主题浅色字，需要深色底衬托 */
.top-navigation-header-transparent {
  background: transparent;
}

.top-navigation-head-inner {
  padding: 0 var(--lihua-layout-head-space);
}

.sider {
  min-width: 0;
}
</style>
