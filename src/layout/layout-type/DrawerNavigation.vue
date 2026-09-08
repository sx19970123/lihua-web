<template>
  <div>
    <a-layout class="layout">
      <!--   左侧导航   -->
      <transition :name="themeStore.routeTransition" mode="out-in">
        <a-layout-sider class="drawer-navigation-sider top-0 h-screen z-[101] shadow-ant-ter"
                        v-show="props.showLayout"
                        :theme="themeStore.siderTheme"
                        :trigger="permissionStore.collapsed ? null : '×'"
                        :width="siderWidth"
                        v-model:collapsed="permissionStore.collapsed"
                        :collapsedWidth="0"
                        collapsible
        >
          <Logo class="py-ant-xs px-ant-base" :show-title="!permissionStore.collapsed"/>
          <!--  侧边栏-->
          <div class="h-[calc(100vh-var(--lihua-layout-height))] sider-scrollbar"
               :class="{ 'sider-scrollbar-dark': themeStore.siderTheme === 'dark' }">
            <Side sider-mode="inline" class="small-sider-content" @route-change="closeSide"/>
          </div>
        </a-layout-sider>
      </transition>
      <!--   右侧head和content   -->
      <a-layout>
        <a-layout-header class="drawer-navigation-header background-glass z-10"
                         :class="{ 'sticky top-0': themeStore.affixHead }">
          <transition :name="themeStore.routeTransition" mode="out-in">
            <!--    菜单收缩-->
            <a-flex class="drawer-navigation-head layout-soft-shadow" justify="space-between" v-show="props.showLayout">
              <a-flex align="center" :gap="16">
                <!--菜单开关-->
                <HeadCollapsed/>
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
    <!--  小屏菜单遮罩  -->
    <Mask :show-mask="!permissionStore.collapsed" :z-index="100" @click="closeSide"/>
  </div>
</template>

<script setup lang="ts">
import ViewTabs from "@/layout/view-tabs/index.vue";
import Side from "@/layout/sider/index.vue";
import Logo from "@/layout/logo/index.vue";
import {usePermissionStore} from "@/stores/permission";
import {useThemeStore} from "@/stores/theme";
import HeadCollapsed from "@/layout/head/components/collapsed/index.vue";
import Mask from "@/components/mask/index.vue";
import {computed} from "vue";

const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
const props = defineProps<{showLayout: boolean}>()

// 抽屉展开宽度取用户配置的导航宽度（originSiderWith）：
// siderWith 会被折叠机制压到 80，直接用它抽屉只能展开 80px 窄条；
// 宽度大于当前屏幕宽度时，减少60像素，保证可正常关闭
const siderWidth = computed(() => {
  const innerWidth = window.innerWidth
  return themeStore.originSiderWith > innerWidth - 60 ? innerWidth - 60 : themeStore.originSiderWith
})

// 关闭菜单
const closeSide = () => {
  permissionStore.collapsed = true
}

closeSide()
</script>

<style scoped>
/* height/padding/line-height 需压过 .ant-layout-header 根级 cssinjs 声明，故留 scoped（z-index 已迁工具类） */
.drawer-navigation-header {
  height: auto;
  padding: 0;
  line-height: var(--lihua-layout-height);
}

/* padding 需压过 .ant-flex 根级显式 padding:0，故留 scoped（box-shadow 已迁工具类） */
.drawer-navigation-head {
  padding-left: var(--ant-padding);
  padding-right: var(--lihua-layout-head-space);
}

/* position 需压过 .ant-layout-sider 根级 position:relative，故留 scoped（top/height/z-index/box-shadow 已迁工具类） */
.drawer-navigation-sider {
  position: fixed;
}
</style>

<style lang="scss">
.ant-layout-sider-zero-width-trigger::after {
  border-radius: 0  var(--ant-border-radius-sm) var(--ant-border-radius-sm) 0;
}
</style>

