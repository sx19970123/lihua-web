<template>
  <a-dropdown :trigger="['contextmenu']" :classes="{root: 'enable-glass'}">
    <!-- 触发区域的 class 必须挂在触发元素上：Dropdown 底层渲染 Fragment 根，组件上的 class 无法落到触发元素 -->
    <a-space class="view-tab-dropdown">
      <component :is="tabPane.tab.icon" class="m-0"/>
      {{ tabPane.tab.label }}
      <ReloadOutlined v-if="tabPane.tab.routerPathKey === viewTabsStore.$state.activeKey"
                      class="view-tab-icon"
                      @click="handleReload"
                      :spin="reloading"
      />
      <CloseOutlined v-if="!tabPane.tab.affix"
                     class="view-tab-icon"
                     @click="(event: MouseEvent) => handleCloseTab(event, tabPane.tab.routerPathKey)"
      />
    </a-space>
    <template #popupRender>
      <a-menu @click="handleClickMenuTab">
        <a-menu-item key="newPage">
          <ImportOutlined class="rotate-180"/>
          新页打开
        </a-menu-item>
        <a-menu-item key="miniWindow" v-if="usableMiniWindow">
          <PicRightOutlined />
          小窗打开
        </a-menu-item>
        <a-menu-divider/>
        <a-menu-item key="close-left" :disabled="tabPane.index === 0">
          <VerticalRightOutlined />
          关闭左侧
        </a-menu-item>
        <a-menu-item key="close-right" :disabled="tabPane.index === viewTabsStore.viewTabs.length - 1">
          <VerticalLeftOutlined />
          关闭右侧
        </a-menu-item>
        <a-menu-item key="close-other" :disabled="viewTabsStore.viewTabs.length === 1">
          <CloseCircleOutlined />
          关闭其他
        </a-menu-item>
        <a-menu-divider v-if="!tabPane.tab.static"/>
        <a-menu-item key="star" v-if="!tabPane.tab.star && !tabPane.tab.static">
          <StarOutlined />
          添加收藏
        </a-menu-item>
        <a-menu-item key="un-star" v-if="tabPane.tab.star && !tabPane.tab.static">
          <StarFilled />
          取消收藏
        </a-menu-item>
        <a-menu-item key="affix" v-if="!tabPane.tab.affix && !tabPane.tab.static">
          <PushpinOutlined />
          固定页面
        </a-menu-item>
        <a-menu-item key="un-affix" v-if="tabPane.tab.affix && !tabPane.tab.static">
          <PushpinFilled />
          取消固定
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {viewTab} from "@/api/system/view-tab/view-tab.ts";
import {message} from "@/antd-adapter";
import {PushpinFilled, PushpinOutlined, StarFilled, StarOutlined} from '@antdv-next/icons';
import {ref} from "vue";
import type {ResponseType} from "@/api/global/type.ts";
import type {StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts";

const viewTabsStore = useViewTabsStore()
const tabPane = defineProps(['tab','index'])
const emits = defineEmits(['routeSkip','cancelKeepAlive','closeViewTab','closeTabs'])
const usableMiniWindow = window.location.origin.startsWith("http://localhost") || window.location.origin.startsWith("https")
const reloading = ref<boolean>(false);
// 处理点击菜单
const handleClickMenuTab = ({ key }:{ key :string }) => {
  const tab = tabPane.tab
  switch (key) {
    case "newPage": {
      window.open(tab.routerPathKey)
      break
    }
    case "miniWindow": {
      createMiniWindow(tab.routerPathKey, tab.affix)
      break
    }
    case "close-left": {
      handleCloseLeft(tab)
      break
    }
    case "close-right": {
      handleCloseRight(tab)
      break
    }
    case "close-other": {
      handleCloseOther(tab)
      break
    }
    case "star": {
      handleStar(tab)
      break
    }
    case "un-star": {
      handleUnStar(tab)
      break
    }
    case "affix": {
      handleAffix(tab)
      break
    }
    case "un-affix": {
      handleUnAffix(tab)
      break
    }
    default: {
      console.error("错误的菜单类型")
    }
  }
}

// 处理刷新
const handleReload = () => {
  viewTabsStore.regenerateComponentKey()
  reloading.value = true
  setTimeout(()=>{reloading.value = false}, 1000)
}

// 处理关闭tab
const handleCloseTab = (event: MouseEvent, routerPathKey: string) => {
  event.stopPropagation()
  emits('closeViewTab', routerPathKey)
}

// 初始化小窗相关，全局搜索：miniWindow=true 可查看ui小窗判定代码
const initMiniWindow = () => {
  let currentAffix: boolean = false
  let currentUrl: string = ''
  // 创建小窗
  const createMiniWindow = async (url: string, affix: boolean) => {
    currentAffix = affix
    currentUrl = url
    try {
      // 创建小窗
      const miniWindow = await window.documentPictureInPicture.requestWindow({width: 439, height: 661})
      miniWindow.document.body.innerHTML = `<iframe src="${url.includes("?") ? url + "&miniWindow=true" : url + "?miniWindow=true"}" style="min-height: calc(100vh); width: 100%; min-width: 439px; border: 0;margin: 0;padding: 0"/>`
      miniWindow.document.body.style.margin = '0'
      miniWindow.document.body.style.overflowY = 'hidden'
      miniWindow.document.body.style.overflowX = 'auto'
      // 关闭当前窗口
      if (!affix) emits("closeViewTab", url)
      // 处理监听器
      handleListener(miniWindow)
    } catch (err) {
      message.error("当前浏览器不支持小窗模式，请使用Chrome、Edge等现代浏览器升级至最新版本")
      console.error("miniWindow创建失败", err)
    }
  }

  // 监听关闭小窗
  const handleListener = (miniWindow: Window) => {
    miniWindow.removeEventListener("pagehide", handleCloseMiniWindow)
    miniWindow.addEventListener("pagehide", handleCloseMiniWindow)
  }

  // 处理关闭小窗，当活动的viewTab不存在时，将路由添加到viewTab
  const handleCloseMiniWindow = () => {
    if (!currentAffix && viewTabsStore.viewTabs.findIndex(tab => tab.routerPathKey === currentUrl) === -1) {
      const viewTab = viewTabsStore.totalViewTabs.filter(tab => tab.routerPathKey === currentUrl)
      if (viewTab && viewTab.length > 0) {
        viewTabsStore.addViewTab(viewTab[0])
      }
    }
  }
  return {
    createMiniWindow
  }
}

const { createMiniWindow } = initMiniWindow()

// 处理关闭左侧（keys 与回退页上抛，动画与提交由 index.vue 统一处理）
const handleCloseLeft = (tab: StarViewType) => {
  const index = viewTabsStore.getIndex(tab.routerPathKey)
  const closeKeys = viewTabsStore.viewTabs.slice(0, index).filter(item => !item.affix).map(item => item.routerPathKey)
  emits('closeTabs', closeKeys, tab.routerPathKey)
}

// 处理关闭右侧
const handleCloseRight = (tab: StarViewType) => {
  const index = viewTabsStore.getIndex(tab.routerPathKey)
  const closeKeys = viewTabsStore.viewTabs.slice(index + 1).filter(item => !item.affix).map(item => item.routerPathKey)
  emits('closeTabs', closeKeys, tab.routerPathKey)
}

// 处理关闭其他
const handleCloseOther = (tab: StarViewType) => {
  const closeKeys = viewTabsStore.viewTabs.filter(item => item.routerPathKey !== tab.routerPathKey && !item.affix).map(item => item.routerPathKey)
  emits('closeTabs', closeKeys, tab.routerPathKey)
}

// 处理star
const handleStar = (tab: StarViewType) => {
  if (!tab.menuId) return

  viewTab(tab.menuId, tab.affix, true).then((resp: ResponseType<StarViewType>) => {
    if (resp.code === 200) {
      viewTabsStore.replaceByKey(resp.data)
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  }).catch(() => {
    message.error('添加收藏失败')
  })
}

// 处理unstar
const handleUnStar = (tab: StarViewType) => {
  if (!tab.menuId) return

  viewTab(tab.menuId, tab.affix, false).then((resp: ResponseType<StarViewType>) => {
    if (resp.code === 200) {
      viewTabsStore.replaceByKey(resp.data)
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  }).catch(() => {
    message.error('取消收藏失败')
  })
}

// 处理固定
const handleAffix = (tab: StarViewType) => {
  if (!tab.menuId) return

  viewTab(tab.menuId, true, tab.star).then((resp: ResponseType<StarViewType>) => {
    if (resp.code === 200) {
      viewTabsStore.affix(resp.data)
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  }).catch(() => {
    message.error('固定页面失败')
  })
}

// 处理取消固定
const handleUnAffix = (tab: StarViewType) => {
  if (!tab.menuId) return

  viewTab(tab.menuId, false, tab.star).then((resp: ResponseType<StarViewType>) => {
    if (resp.code === 200) {
      viewTabsStore.unAffix(resp.data)
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  }).catch(() => {
    message.error('取消固定失败')
  })
}
</script>
<style lang="scss">
/* 下拉菜单触发面积增大，与原卡片保持一致 */
.view-tab-dropdown {
  padding: 6px var(--ant-padding);
}

/* tabs图标 */
.view-tab-icon {
  margin: 0 !important;
  font-size: var(--ant-font-size-sm)
}
</style>