<template>
  <a-layout class="layout">
    <!--   左侧导航   -->
    <transition :name="themeStore.routeTransition" mode="out-in">
      <a-layout-sider :class="themeStore.siderTheme === 'light' ? 'background-glass' : ''"
                      class="side-navigation-sider top-0 h-screen z-11 shadow-ant-ter"
                      v-show="props.showLayout"
                      :theme="themeStore.siderTheme"
                      :trigger="null"
                      :width="themeStore.siderWith"
                      v-model:collapsed="permissionStore.collapsed"
                      collapsible
                      breakpoint="xl"
      >
        <Logo class="py-ant-xs px-ant-base" :show-title="!permissionStore.collapsed"/>
        <!-- 侧边栏-->
        <div class="h-[calc(100vh-var(--lihua-layout-height))] sider-scrollbar"
             :class="{ 'sider-scrollbar-dark': themeStore.siderTheme === 'dark' }">
          <Side sider-mode="inline"/>
        </div>
      </a-layout-sider>
    </transition>
    <!--   右侧head和content   -->
    <a-layout>
      <a-layout-header class="side-navigation-header background-glass z-10"
                       :class="{ 'sticky top-0': themeStore.affixHead }">
        <transition :name="themeStore.routeTransition" mode="out-in">
          <!--    菜单收缩-->
          <a-flex class="side-navigation-head layout-soft-shadow" justify="space-between" v-show="props.showLayout">
            <a-flex align="center" :gap="16">
              <!--菜单开关-->
              <HeadCollapsed/>
              <!--面包屑 宽度不足时隐藏-->
              <Breadcrumb/>
            </a-flex>
            <!-- 右侧头部-->
            <div id="lihua-layout-head"/>
          </a-flex>
        </transition>
        <view-tabs v-if="themeStore.showViewTabs && !themeStore.isMiniWindow"/>
      </a-layout-header>
      <a-layout-content>
        <!--内容-->
        <div id="lihua-layout-content" class="layout-content" />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import ViewTabs from "@/layout/view-tabs/index.vue";
import Side from "@/layout/sider/index.vue";
import Logo from "@/layout/logo/index.vue";
import {usePermissionStore} from "@/stores/permission";
import {useThemeStore} from "@/stores/theme";
import HeadCollapsed from "@/layout/head/components/collapsed/index.vue";
import Breadcrumb from "@/layout/head/components/breadcrumb/index.vue";

const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
const props = defineProps<{showLayout: boolean}>()
</script>

<style scoped>
/* height/padding/line-height 需压过 .ant-layout-header 根级 cssinjs 声明，故留 scoped（z-index 已迁工具类） */
.side-navigation-header {
  height: auto;
  padding: 0;
  line-height: var(--lihua-layout-height);
}

/* padding 需压过 .ant-flex 根级显式 padding:0，故留 scoped（box-shadow 已迁工具类） */
.side-navigation-head {
  padding-left: var(--ant-padding);
  padding-right: var(--lihua-layout-head-space);
}

/* position 需压过 .ant-layout-sider 根级 position:relative，故留 scoped（top/height/z-index/box-shadow 已迁工具类） */
.side-navigation-sider {
  position: sticky;
}
</style>

