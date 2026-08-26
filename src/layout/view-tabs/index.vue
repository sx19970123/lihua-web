<template>
  <DragDropProvider :sensors="sensors" :modifiers="trackModifiers"
                    @drag-start="onDragStart" @drag-end="onDragEnd">
    <a-tabs :activeKey="activeKey"
            class="unselectable tab-none-padding enable-glass"
            style="padding: var(--lihua-space-sm) var(--lihua-space-sm) 0;"
            type="card"
            size="small"
            hide-add
            :items="tabItems"
            @edit="closeTab"
            @change="routeSkip"
    >
      <!--每个tab的下拉菜单：label 由 #labelRender 插槽自定义渲染，SortableTabLabel 内注册 dnd-kit sortable（中键关闭也在其内拦截）-->
      <template #labelRender="{ item, index }">
        <sortable-tab-label :item="item"
                            :index="index"
                            @route-skip="routeSkip"
                            @cancel-keep-alive="cancelKeepAliveCache"
                            @close-view-tab="closeTab"
        />
      </template>
      <!--view-tabs 右侧下拉菜单-->
      <template #rightExtra>
        <a-space :size="0">
          <tab-right-menu ref="tabRightMenuRef" @route-skip="routeSkip" @cancel-keep-alive="cancelKeepAliveCache"/>
        </a-space>
      </template>
    </a-tabs>
  </DragDropProvider>
</template>

<script lang="ts" setup>
import SortableTabLabel from "@/layout/view-tabs/components/SortableTabLabel.vue";
import TabRightMenu from "@/layout/view-tabs/components/TabRightMenu.vue";
import {type ComponentPublicInstance, computed, onMounted, useTemplateRef, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {isMobile} from 'is-mobile'
import type {DragEndEvent, DragStartEvent} from '@dnd-kit/vue'
import {DragDropProvider, KeyboardSensor, PointerSensor} from '@dnd-kit/vue'
import {PointerActivationConstraints} from '@dnd-kit/dom'
import {isSortable} from '@dnd-kit/vue/sortable'
import {resetTrackBounds, snapshotTrackBounds, trackModifiers} from "@/layout/view-tabs/composables/useTrackModifiers";

const tabRightMenuRef = useTemplateRef<typeof TabRightMenu>('tabRightMenuRef')
const viewTabsStore = useViewTabsStore()
const route = useRoute()
const router = useRouter()

/**
 * 初始化数据及变量
 */
const init = () => {
  viewTabsStore.init(route)
  // 选中tab页
  const activeKey = computed(() => viewTabsStore.activeKey)
  return {
    activeKey
  }
}
const {activeKey} = init()

/** tabs 的 items：key 为路由路径键，label 为必填占位（实际渲染走 #labelRender 插槽）；Tabs 会把 item.icon 原生渲染成 tab 前置内容（字符串按文本渲染），故剔除 icon 后经 raw 透传原始 tab 供插槽使用 */
const tabItems = computed(() => viewTabsStore.viewTabs.map(tab => {
  const {icon, ...rest} = tab
  return {...rest, key: tab.routerPathKey, label: tab.label, raw: tab}
}))

/**
 * 删除标签，根据情况进行路由切换
 * @param key
 */
const closeTab = (key: string) => {
  if (key === activeKey.value) {
    const index = viewTabsStore.getIndex(key)
    // 删除的第一个元素，跳转到下一个
    let tab
    if (index === 0) {
      tab = viewTabsStore.getTabByIndex(index + 1)
    }
    // 删除的不是第一个元素，跳转到前一个
    else {
      tab = viewTabsStore.getTabByIndex(index - 1)
    }
    // 返回元素不为空则跳转路由
    if (tab) {
      routeSkip(tab.routerPathKey, tab.query)
    }
  }
  // 关闭标签
  viewTabsStore.closeViewTab(key)
  // 卸载组件
  cancelKeepAliveCache([key])
};

/**
 * 添加keep-alive 缓存（当前路由）
 */
const addKeepAliveCache = () => {
  if (route?.meta?.cache && route?.name) {
    viewTabsStore.setComponentsKeepAlive(route?.name as string)
  }
}

/**
 * 取消keep-alive 缓存
 * @param keys
 */
const cancelKeepAliveCache = (keys: Array<string>) => {
  const closeTabRoutes = router.getRoutes().filter(route => keys.includes(route.path))
  closeTabRoutes?.forEach(closeTabRoute => {
    if (closeTabRoute?.meta?.cache && closeTabRoute?.name) {
      viewTabsStore.removeComponentsKeepAlive(closeTabRoute?.name as string)
    }
  })
}

/**
 * 路由跳转
 */
const routeSkip = (path: string, query?: string) => {
  if (query) {
    router.push({path: path, query: JSON.parse(query)})
  } else {
    router.push(path)
  }
}

/**
 * 拖拽排序（@dnd-kit/vue，替代原 vue-draggable-plus 对 .ant-tabs-nav-list 的直挂）
 */
/** 拖拽传感器：4px 距离激活，避免点击/右键/中键误触拖拽；移动端不启用拖拽 */
const sensors = isMobile() ? [] : [
  PointerSensor.configure({activationConstraints: [new PointerActivationConstraints.Distance({value: 4})]}),
  KeyboardSensor,
]

/** 取消拖拽时回滚用的 key 序列快照 */
let snapshotKeys: Array<string> = []
/** 拖拽期间冻结轨道滚轮：nav-list 依靠 transform 平移滚动，拖拽中滚动会与让位/碰撞互相干扰 */
let frozenWheelTarget: HTMLElement | undefined
const freezeWheel = (event: Event) => event.preventDefault()

const onDragStart = (event: DragStartEvent) => {
  const tabEl = event.operation.source?.element as HTMLElement | undefined
  if (tabEl) {
    // 快照轨道边界（水平 clamp 依据）
    snapshotTrackBounds(tabEl)
    frozenWheelTarget = tabEl.closest<HTMLElement>('.ant-tabs-nav-wrap') ?? undefined
    frozenWheelTarget?.addEventListener('wheel', freezeWheel, {capture: true, passive: false})
  }
  snapshotKeys = viewTabsStore.viewTabs.map(tab => tab.routerPathKey)
}

const onDragEnd = (event: DragEndEvent) => {
  frozenWheelTarget?.removeEventListener('wheel', freezeWheel, {capture: true})
  frozenWheelTarget = undefined
  resetTrackBounds()
  if (event.canceled) {
    // 乐观排序已物理重排 DOM，取消时按快照重建数据，强制视图与数据对齐
    viewTabsStore.resetViewTabsByPathKeys(snapshotKeys)
    return
  }
  const {source} = event.operation
  if (!isSortable(source)) {
    return
  }
  const {initialIndex, index} = source
  if (initialIndex !== index) {
    // 修改store中viewTabs中的位置
    viewTabsStore.move(initialIndex, index)
    // 子组件刷新缓存
    if (tabRightMenuRef.value) {
      tabRightMenuRef.value.setCache()
    }
  }
}

onMounted(() => {
  // 调用子组件方法
  if (tabRightMenuRef.value) {
    tabRightMenuRef.value.checkCache()
  }
})

/**
 * 监听路由变化进行切换 tab
 */
watch(() => route.path,() => {
  // 切换tab
  viewTabsStore.init(route)
  // 添加keepalive缓存
  addKeepAliveCache()
  // 子组件刷新缓存
  if (tabRightMenuRef.value) {
    tabRightMenuRef.value.setCache()
  }
})

</script>
<style>
.ant-tabs-nav {
  margin-bottom: var(--lihua-space-sm) !important;
}

/* 拖拽中的页签：本体直接跟随（move 模式）。
注意：Feedback 插件会把本体 popover 化提进顶层（脱离 nav-wrap 裁剪），其 @layer dnd-kit 样式会
unset 掉 background/border/margin/padding/color——被破坏的外观按实测清单在此恢复（背景/边框间距用组件库 token）*/
.ant-tabs-tab.view-tab-dragging {
  position: relative;
  z-index: 10;
  background: var(--ant-tabs-card-bg);
  border: var(--ant-line-width) var(--ant-line-type) var(--ant-color-border-secondary);
  color: var(--ant-tabs-item-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 拖拽中的选中页签：active 背景与主色文字 */
.ant-tabs-tab.view-tab-dragging.ant-tabs-tab-active {
  background: var(--ant-color-bg-container);
  color: var(--ant-tabs-item-selected-color);
}

/* 拖「首位页签」的布局抖动修复：Feedback 将本体 popover 化（脱离布局）后，占位克隆插在本体 DOM 之后，
   会命中 .ant-tabs-tab + .ant-tabs-tab 相邻选择器获得 2px 间距——而本体 popover 化前作为首位无间距，
   克隆实际顶替首位布局，凭空多出的 2px 使整个列表右移（抖动），并连环触发 tabs 位置重测 → scrollToTab 跳转。
   仅在「首位页签被拖（popover 化）」时，把紧随其后的克隆间距清零，恢复与拖拽前一致的布局 */
.ant-tabs-nav-list > .ant-tabs-tab:first-child[popover] + .ant-tabs-tab {
  margin-inline-start: 0 !important;
}

.tab-none-padding {
  .ant-tabs-tab {
    padding: 0 !important;
  }

}
</style>
