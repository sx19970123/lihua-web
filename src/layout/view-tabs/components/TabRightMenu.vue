<template>
  <div class="pr-ant-xs">
    <!--  是否显示layout  -->
    <button class="ant-tabs-nav-more" @click="showHideLayout">
      <ExpandOutlined v-if="viewTabsStore.showLayout" />
      <CompressOutlined v-else />
    </button>
    <!--  更多操作  -->
    <a-dropdown :classes="{root: 'enable-glass'}">
      <button class="ant-tabs-nav-more">
        <MoreOutlined />
      </button>
      <template #popupRender>
        <a-menu @click="handleClickMenuTab">
          <!-- 菜单项必须是 a-sub-menu 的直接子节点：eventKey 只向插槽直接子级注入，
               中间隔普通 div 会使内部项 eventKey 为 undefined，与初始 activeKey(undefined) 匹配后全员挂 active -->
          <a-sub-menu class="menu-item-min-width" key="recent" popupClassName="enable-glass view-tab-popup-scroll">
            <template #title>
              <FieldTimeOutlined />
              最近使用
            </template>
            <template v-if="recentData.length > 0">
              <a-menu-item v-for="item in recentData" :key="item.path">
                <template #icon>
                  <component :is="item.icon"/>
                </template>
                <a-flex :gap="40" align="space-between" justify="space-between" >
                  <span>
                    {{item.label}}
                  </span>
                  <span>
                  {{ handleTime(item.openTime) }}
                  </span>
                </a-flex>
              </a-menu-item>
            </template>
            <a-empty v-else>
              <template #description>
                <a-typography-text>暂无数据</a-typography-text>
              </template>
            </a-empty>
          </a-sub-menu>
          <a-sub-menu class="menu-item-min-width" key="star" popupClassName="enable-glass view-tab-popup-scroll">
            <template #title>
              <StarOutlined />
              收藏夹栏
            </template>
            <a-menu-item class="menu-item-min-width" v-for="item in starData" :key="item.routerPathKey">
              <template #icon>
                <component :is="item.icon"/>
              </template>
              {{item.label}}
            </a-menu-item>
            <a-empty v-if="!(starData?.length > 0)">
              <template #description>
                <a-typography-text>暂无数据</a-typography-text>
              </template>
            </a-empty>
          </a-sub-menu>
          <a-divider style="margin: 0"/>
          <a-menu-item class="menu-item-min-width" key="close-all" danger>
            <CloseOutlined />
            关闭全部
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </div>
</template>
<script setup lang="ts">
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {ref, watch} from "vue";
import type {RecentType, StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts";
import {handleTime} from "@/utils/handle-date.ts";

const viewTabsStore = useViewTabsStore()
const emits = defineEmits(['routeSkip','cancelKeepAlive','closeTabs'])

/**
 * 处理点击菜单后执行功能
 * @param key
 */
const handleClickMenuTab = ({ key }: { key :string }) => {
  switch (key) {
    // 关闭全部（keys 上抛，动画与提交由 index.vue 统一处理）
    case "close-all": {
      const closeKeys = viewTabsStore.viewTabs.filter(tab => !tab.affix).map(tab => tab.routerPathKey)
      emits('closeTabs', closeKeys)
      break
    }
    // 清空最近使用的入口收敛至个人中心「常用页面」历史记录卡
    default: {
      emits('routeSkip', key)
    }
  }
}

/**
 * 处理最近访问记录
 */
interface RecentDataType {
  path: string,
  icon?: string,
  label: string,
  openTime: string
}
// 监听访问记录变化
const recentData = ref<RecentDataType[]>([])
watch(() => viewTabsStore.viewTabs, (value) => {
  handleRecentList(value)
},{ deep: true })

// 根据监听结果进行数据处理
const handleRecentList = (viewTabs:Array<StarViewType>) => {
  const recentTabsJson = localStorage.getItem(viewTabsStore.$state.tabCacheKey)
  if (recentTabsJson) {
    const recentTabs =  JSON.parse(recentTabsJson)
    // 当前tab页有数据
    if (viewTabs && viewTabs.length > 0) {
      const actPathList = viewTabs.map(tab => tab.routerPathKey)
      recentData.value = recentTabs.filter((tab:RecentType) => {
        if (tab.path) {
          return !actPathList.includes(tab.path)
        } else {
          return false
        }
      })
    } else {
      recentData.value = recentTabs
    }
  }
}
// 第一次加载页面时的处理
handleRecentList(viewTabsStore.viewTabs)

/**
 * 处理收藏夹
 */
// 监听收藏夹变化
const starData = ref()

watch(()=> viewTabsStore.totalViewTabs,(value)=> {
  handleStarList(value)
},{deep: true})

// 根据监听结果进行数据处理
const handleStarList = (totalViewTabs: Array<StarViewType>) => {
  starData.value = totalViewTabs.filter((tab: StarViewType) => tab.star)
}
// 第一次加载页面时的处理
handleStarList(viewTabsStore.totalViewTabs)

/**
 * 控制layout显示关闭
 */
const showHideLayout = () => {
  const data =  localStorage.getItem("layout")
  if ('hide' === data) {
    localStorage.setItem("layout",'show')
  } else {
    localStorage.setItem("layout",'hide')
  }
  viewTabsStore.$state.showLayout = localStorage.getItem("layout") === 'show'
  viewTabsStore.setShowLayoutVariable()
}

/**
 * 打开标签的持久化与刷新恢复已收敛到 viewTabs store（persistViewTabs / restoreViewTabsFromCache）
 */
</script>
<style>
.ant-tabs-nav-more {
  padding: var(--ant-padding-xs) !important;
  cursor: pointer;
  border-radius: var(--ant-border-radius-lg)
}
.ant-tabs-nav-more:hover {
  color:  var(--colorPrimary) !important;
}
.menu-item-min-width {
  min-width: 120px;
}

/* 列表滚动：菜单项需为 a-sub-menu 直接子节点（eventKey 只向插槽直接子级注入），
   滚动容器只能落在弹层内层菜单上——竖排菜单自带 max-height(calc(100vh-…))+overflow-y:auto，
   这里收紧为 400px 并改细滚动条；若另包滚动容器会与它叠出双滚动条 */
.view-tab-popup-scroll .ant-dropdown-menu {
  max-height: 400px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--lihua-scrollbar-thumb-color);
}
</style>
