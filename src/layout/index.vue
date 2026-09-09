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
      // 头部块（head 行 + 多任务栏的包裹元素，四布局统一 id）高度实测随行
      observeHeaderHeight()
    })
  }

  return {
    headContainer,
    contentContainer,
    loadTeleportContainer
  }
}

const {headContainer, contentContainer, loadTeleportContainer} = initTeleport()

/**
 * 内容区可用高度供给：观察布局头部块（#lihua-layout-header，含 head 行与多任务栏）高度
 * 写入 --layout-header-height，variable.css 组合出 --content-height 供满高列表页消费。
 * 头部块在内容区上方、高度只随 head/多任务栏显隐与布局形态变化，与页面内容无关——
 * 无反馈回路；显隐开关经 ResizeObserver 自动捕获无需 watch，布局切换更换元素随
 * loadTeleportContainer 重挂；observe 首次回调在首次绘制前送达，无需公式初值
 */
const initHeaderObserve = () => {
  let headerResizeObserver: ResizeObserver | undefined
  let observedHeaderEl: HTMLElement | undefined

  const syncHeaderHeight = () => {
    if (!observedHeaderEl) {
      return
    }
    document.documentElement.style.setProperty('--layout-header-height', `${Math.floor(observedHeaderEl.offsetHeight)}px`)
  }

  // 观察头部块高度（布局切换更换元素时可重复调用，幂等：同一元素不重挂）
  const observeHeaderHeight = () => {
    const headerEl = document.getElementById('lihua-layout-header')
    if (!headerEl || headerEl === observedHeaderEl) {
      return
    }
    headerResizeObserver?.disconnect()
    observedHeaderEl = headerEl
    headerResizeObserver = new ResizeObserver(syncHeaderHeight)
    headerResizeObserver.observe(headerEl)
    syncHeaderHeight()
  }

  return {
    observeHeaderHeight,
    disconnect: () => headerResizeObserver?.disconnect()
  }
}
const {observeHeaderHeight, disconnect: disconnectHeaderObserve} = initHeaderObserve()

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
  window.removeEventListener("resize", debounceResize);
  disconnectHeaderObserve()
})
</script>
