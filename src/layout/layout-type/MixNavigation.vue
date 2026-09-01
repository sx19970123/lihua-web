<template>
  <a-layout class="layout">
    <!--   左侧导航   -->
    <transition :name="themeStore.routeTransition" mode="out-in" v-if="showSider">
      <a-layout-sider :class="themeStore.siderTheme === 'light' ? 'background-glass' : ''"
                      class="side-navigation-sider top-0 h-screen z-11 shadow-ant-ter"
                      v-show="props.showLayout"
                      :theme="themeStore.siderTheme"
                      :width="themeStore.siderWith"
                      v-model:collapsed="permissionStore.collapsed"
                      collapsible
                      breakpoint="xl"
      >
        <Logo class="py-ant-xs px-ant-base" :show-title="!permissionStore.collapsed"/>
        <!-- 侧边栏-->
        <div class="h-[calc(100vh-var(--lihua-layout-height))] sider-scrollbar"
             :class="{ 'sider-scrollbar-dark': themeStore.siderTheme === 'dark' }">
          <Side sider-mode="inline" :menu="subMenu" ref="sideRef"/>
        </div>
      </a-layout-sider>
    </transition>
    <!--   右侧head和content   -->
    <a-layout>
      <a-layout-header class="side-navigation-header background-glass z-10"
                       :class="{ 'sticky top-0': themeStore.affixHead }">
        <transition :name="themeStore.routeTransition" mode="out-in">
          <a-flex class="side-navigation-header-inner shadow-ant-ter"
                  :style="{'padding-left': !showSider ? 'var(--lihua-layout-head-space)' : 0}"
                  align="center"
                  gap="middle"
                  v-show="props.showLayout">
            <Logo :auto-color="false" v-if="!showSider"/>
            <!--顶部导航占用剩余空间-->
            <a-flex class="min-w-0" :flex="1">
              <Side is-mix-top
                    class="header-menu-fill"
                    :menu="topMenu"
                    sider-theme="light"
                    sider-mode="horizontal"
                    @route-change="(keys: string[]) => loadSideMenu(keys[0], false)"
                    @mounted="(keys: string[]) => loadSideMenu(keys[0], false)"
                    @menu-click="(key) => loadSideMenu(key, true)"
              />
            </a-flex>
            <!-- 右侧头部-->
            <div id="lihua-layout-head"/>
          </a-flex>
        </transition>
        <view-tabs v-if="themeStore.showViewTabs"/>
      </a-layout-header>
      <a-layout-content>
        <!--内容-->
        <div id="lihua-layout-content" class="layout-content"/>
      </a-layout-content>
      <!--页脚-->
      <a-layout-footer class="layout-footer" v-if="themeStore.$state.showFooter">
        <page-footer/>
      </a-layout-footer>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import ViewTabs from "@/layout/view-tabs/index.vue";
import Side from "@/layout/sider/index.vue";
import Logo from "@/layout/logo/index.vue";
import {usePermissionStore} from "@/stores/permission";
import {useThemeStore} from "@/stores/theme";
import {cloneDeep} from 'lodash-es'
import type {ItemType} from "@/antd-adapter";
import {computed, nextTick, ref, useTemplateRef} from "vue";
import PageFooter from "@/layout/footer/index.vue";

const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
const props = defineProps<{showLayout: boolean}>()

const sideRef = useTemplateRef<InstanceType<typeof Side>>("sideRef")

/**
 * 初始化分割菜单相关
 */
const initSplitMenu = () => {
  // 分割后的左侧菜单
  const subMenu = ref<Array<ItemType>>([])

  // 处理点击菜单（顶部）
  const loadSideMenu = (key: string, autoClick: boolean) => {
    // 加载侧边菜单
    const targetMenu = permissionStore.menuRouters.filter((item) => item && 'key' in item && item.key === key)
    if (targetMenu && targetMenu.length > 0) {
      const menu = targetMenu[0]
      const children = menu && 'children' in menu ? menu.children : undefined
      subMenu.value = children || []
      // 存在子菜单并设置了自动选中，则默认跳转到第一个
      if (children && autoClick) {
        const firstChild = children[0]
        if (firstChild && 'key' in firstChild) {
          const key = firstChild.key as string
          nextTick(() => {
            if (sideRef.value) {
              sideRef.value.handleClickMenuItem({key});
            }
          })
        }
      }
    } else {
      subMenu.value = []
    }
  }

  return {
    subMenu,
    loadSideMenu
  }
}

const {subMenu, loadSideMenu} = initSplitMenu()

// 顶部一级菜单（剥离 children）：computed 缓存深拷贝结果，menuRouters 不变时保持引用稳定
const topMenu = computed(() =>
    cloneDeep(permissionStore.menuRouters).map((item: ItemType) => item && {...item, children: undefined}))

// 显示侧边栏
const showSider = computed(() => {
  return subMenu.value.length > 0
})
</script>

<style scoped>
/* height/padding/line-height 需压过 .ant-layout-header 根级 cssinjs 声明，故留 scoped（z-index 已迁工具类） */
.side-navigation-header {
  height: auto;
  padding: 0;
  line-height: var(--lihua-layout-height);
}

/* padding 需压过 .ant-flex 根级显式 padding:0，故留 scoped（box-shadow 已迁工具类） */
.side-navigation-header-inner {
  padding-right: var(--lihua-layout-head-space);
}

/* position 需压过 .ant-layout-sider 根级 position:relative，故留 scoped（top/height/z-index/box-shadow 已迁工具类） */
.side-navigation-sider {
  position: sticky;
}
</style>
