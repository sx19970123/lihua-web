<template>
  <div>
    <!--  小窗口导航-->
    <drawer-navigation v-if="themeStore.isSmallWindow" :show-layout="!themeStore.isMiniWindow && viewTabsStore.$state.showLayout"/>
    <!--  正常导航（小窗强制侧边导航：形态由消费层派生，不写入 layoutType 用户配置）-->
    <template v-else>
      <!--  侧边导航-->
      <side-navigation v-if="effectiveLayoutType === 'side-navigation'" :show-layout="!themeStore.isMiniWindow && viewTabsStore.$state.showLayout"/>
      <!--  混合导航-->
      <mix-navigation v-if="effectiveLayoutType === 'mix-navigation'" :show-layout="!themeStore.isMiniWindow && viewTabsStore.$state.showLayout"/>
      <!--  顶部导航-->
      <top-navigation v-if="effectiveLayoutType === 'top-navigation'" :show-layout="!themeStore.isMiniWindow && viewTabsStore.$state.showLayout"/>
    </template>

    <!--  使用传送组件重新加载头部内容，避免刷新组件造成的重复请求  -->
    <Teleport :to="headContainer" v-if="headContainer !== null">
      <Head/>
    </Teleport>

    <!--  使用传送组件重新加载内容，避免刷新组件造成的重复请求  -->
    <Teleport :to="contentContainer" v-if="headContainer !== null">
      <Content/>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import MixNavigation from "@/layout/layout-type/MixNavigation.vue"
import SideNavigation from "@/layout/layout-type/SideNavigation.vue"
import TopNavigation from "@/layout/layout-type/TopNavigation.vue"
import DrawerNavigation from "@/layout/layout-type/DrawerNavigation.vue"
import Content from "@/layout/content/index.vue"
import Head from "@/layout/head/index.vue"
import {useThemeStore} from "@/stores/theme"
import {useViewTabsStore} from "@/stores/view-tabs.ts"
import {usePermissionStore} from "@/stores/permission.ts"
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from "vue"
import {debounce} from "lodash-es"
import settings from "@/settings.ts"

const themeStore = useThemeStore()
const viewTabsStore = useViewTabsStore()
const permissionStore = usePermissionStore()

// 小窗形态的布局选择（仅展示层，用户配置的 layoutType 不被覆盖）
const effectiveLayoutType = computed(() => themeStore.isMiniWindow ? 'side-navigation' : themeStore.layoutType)


/**
 * 初始化传送组件相关
 */
const initTeleport = () => {
  const headContainer = ref<HTMLElement | null>(null)
  const contentContainer = ref<HTMLElement | null>(null)

  // 加载传送组件容器
  const loadTeleportContainer = () => {
    nextTick(() => {
      // 头部组件容器
      headContainer.value = document.getElementById('lihua-layout-head')
      // 内容组件容器
      contentContainer.value = document.getElementById('lihua-layout-content')
    })
  }

  return {
    headContainer,
    contentContainer,
    loadTeleportContainer
  }
}

const {headContainer, contentContainer, loadTeleportContainer} = initTeleport()

// 组件切换时重新加载菜单，刷新分组导航
watch(() =>[themeStore.isSmallWindow, themeStore.layoutType], () => {
  // 离开小窗模式时恢复侧栏展开态与宽度：小窗抽屉自动关闭会把 collapsed 置 true、siderWith 折到 80，
  // 而 Sider 重新挂载时只读不写 collapsed、breakpoint 也只在挂载期间跨界才触发，不复位会以收起态渲染
  if (!themeStore.isSmallWindow) {
    permissionStore.collapsed = false
    themeStore.unfoldSiderWidth()
  }
  if (themeStore.siderGroup) {
    permissionStore.reloadMenu()
  }
  // 重新加载传送组件
  loadTeleportContainer()
})

// 处理窗口拖动
const handleResize = () => {
  themeStore.$state.isSmallWindow = document.body.offsetWidth < settings.menuToggleWidth
}

// 函数防抖
const debounceResize = debounce(handleResize, 50)

onMounted(() => {
  loadTeleportContainer()
  handleResize()
  window.addEventListener("resize", debounceResize)
})

onUnmounted(() => {
  window.removeEventListener("resize", debounceResize)
})
</script>
