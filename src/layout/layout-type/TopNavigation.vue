<template>
  <a-layout class="layout">
    <div class="top-navigation-header">
      <transition :name="themeStore.routeTransition" mode="out-in">
        <a-layout-header class="top-navigation-layout-header"
                         :class="themeStore.siderTheme === 'light' ? 'background-glass' : ''"
                         v-show="props.showLayout">
          <a-flex class="top-navigation-head-inner" align="center" gap="middle">
            <!--logo-->
            <Logo/>
            <!--导航（顶部导航占用剩余空间）-->
            <a-flex class="sider" :flex="1">
              <Side class="header-menu-fill" sider-mode="horizontal" v-rollDisable="true"/>
            </a-flex>
            <!--页头-->
            <div id="lihua-layout-head"/>
          </a-flex>
        </a-layout-header>
      </transition>
      <!--多标签-->
      <view-tabs v-if="themeStore.showViewTabs" class="background-glass"/>
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
  backdrop-filter: var(--lihua-backdrop-filter-lg);
  position: relative;
  z-index: 10;
}
.top-navigation-layout-header {
  position: relative;
  z-index: 10;
  padding: 0;
  height: var(--lihua-layout-height);
  line-height: var(--lihua-layout-height);
  box-shadow: var(--lihua-layout-box-shadow);
}

.top-navigation-head-inner {
  padding: 0 var(--lihua-layout-head-space);
}

.sider {
  min-width: 0;
}
</style>

<style>
[head-affix = enable] {
  .top-navigation-header {
    position: sticky;
    top: 0;
  }
}
</style>
