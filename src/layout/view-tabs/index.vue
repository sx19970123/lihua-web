<template>
  <DragDropProvider :sensors="sensors"
                    @drag-start="onDragStart" @drag-end="onDragEnd"
                    @drag-over="onDragOver" @drag-move="onDragMove">
    <!--右侧留出滚动条槽安全间距（layout 满幅 100vw 后滚动条悬浮于应用右缘，约 0~17px），避免 extras 按钮被覆盖/裁切-->
    <a-tabs ref="tabsRef"
            :activeKey="activeKey"
            class="unselectable tab-none-padding enable-glass"
            style="padding: var(--ant-padding-xs) 18px 0;"
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
import {computed, onMounted, onUnmounted, ref, useTemplateRef, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import type {DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent} from '@dnd-kit/vue'
import {PointerActivationConstraints} from '@dnd-kit/dom'
import {DragDropProvider, KeyboardSensor, PointerSensor} from '@dnd-kit/vue'
import {isSortable} from '@dnd-kit/vue/sortable'
import {isMobile} from 'is-mobile'
import {resetTrackBounds, snapshotTrackBounds} from "@/layout/view-tabs/composables/useTrackModifiers";
import SortableTabLabel from "@/layout/view-tabs/components/SortableTabLabel.vue";
import TabRightMenu from "@/layout/view-tabs/components/TabRightMenu.vue";

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
 * 基线分段测量：选中页签区间（相对导航条左缘）写入 nav 元素 CSS 变量 --seg-l/--seg-r，
 * 供基线 ::before 渐变在选中卡下方开透明窗。
 * 触发源收敛为对 nav-list 的 DOM 观察：选中态翻转（class）、滚轮/FLIP 位移（style transform）、
 * 增删换位（childList）——不依赖组件响应式链路，任何移动选中卡的路径都会被捕获
 */
const initBaselineSegment = () => {
  const tabsRef = useTemplateRef<{ $el: HTMLElement }>('tabsRef')

  /** 上次写入值：未变化时跳过写入，杜绝观察-测量回路自激 */
  let lastSegL = ''
  let lastSegR = ''

  const syncSegment = () => {
    const nav = tabsRef.value?.$el?.querySelector<HTMLElement>('.ant-tabs-nav')
    const active = nav?.querySelector<HTMLElement>('.ant-tabs-tab-active')
    if (!nav || !active) {
      // 中间态测不到选中页签：清除变量退回完整默认线，不留陈旧透明窗
      lastSegL = ''
      lastSegR = ''
      nav?.style.removeProperty('--seg-l')
      nav?.style.removeProperty('--seg-r')
      return
    }
    const navLeft = nav.getBoundingClientRect().left
    const activeRect = active.getBoundingClientRect()
    const segL = `${activeRect.left - navLeft}px`
    const segR = `${activeRect.right - navLeft}px`
    if (segL === lastSegL && segR === lastSegR) {
      return
    }
    lastSegL = segL
    lastSegR = segR
    nav.style.setProperty('--seg-l', segL)
    nav.style.setProperty('--seg-r', segR)
  }

  /** rAF 合并高频触发（FLIP 动画、滚轮位移均为逐帧级） */
  let scheduleRaf = 0
  const scheduleSegment = () => {
    if (scheduleRaf) {
      return
    }
    scheduleRaf = requestAnimationFrame(() => {
      scheduleRaf = 0
      syncSegment()
    })
  }

  /** 观察回调分流：离散事件（选中翻转/增删换位）同步测量——微任务阶段落值赶在同一次样式重算前，
      与选中高亮同帧生效；连续位移（FLIP/滚轮的 style transform）仍走 rAF 合并 */
  const onNavListMutation = (mutations: Array<MutationRecord>) => {
    const discrete = mutations.some(m => m.type === 'childList' || (m.type === 'attributes' && m.attributeName === 'class'))
    if (!discrete) {
      scheduleSegment()
      return
    }
    if (scheduleRaf) {
      cancelAnimationFrame(scheduleRaf)
      scheduleRaf = 0
    }
    syncSegment()
  }

  let navList: HTMLElement | undefined
  let navListMO: MutationObserver | undefined
  let navWrap: HTMLElement | undefined
  let wrapResizeObserver: ResizeObserver | undefined
  onMounted(() => {
    const root = tabsRef.value?.$el
    navList = root?.querySelector<HTMLElement>('.ant-tabs-nav-list') ?? undefined
    navWrap = root?.querySelector<HTMLElement>('.ant-tabs-nav-wrap') ?? undefined
    // 变量写在 nav 上、观察挂在 nav-list：目标自身不在观察子树内，配合写前去重双保险防自激
    if (navList) {
      navListMO = new MutationObserver(onNavListMutation)
      navListMO.observe(navList, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style']
      })
    }
    // 少数路径走原生 scrollLeft 仍会发 scroll 事件；wrap 尺寸变化（窗口伸缩、侧栏折叠）无 DOM 变更，用 RO 兜底
    navWrap?.addEventListener('scroll', scheduleSegment, {passive: true})
    if (navWrap) {
      wrapResizeObserver = new ResizeObserver(scheduleSegment)
      wrapResizeObserver.observe(navWrap)
    }
    scheduleSegment()
  })
  onUnmounted(() => {
    if (scheduleRaf) {
      cancelAnimationFrame(scheduleRaf)
    }
    navListMO?.disconnect()
    wrapResizeObserver?.disconnect()
    navWrap?.removeEventListener('scroll', scheduleSegment)
  })
}

initBaselineSegment()

/**
 * 初始化拖拽排序（@dnd-kit/vue）：集中定义拖拽相关的状态与方法，统一导出
 */
const initDrag = () => {
  /** 拖拽传感器：4px 距离激活防误触；移动端不启用 */
  const sensors = isMobile() ? [] : [
    PointerSensor.configure({activationConstraints: [new PointerActivationConstraints.Distance({value: 4})]}),
    KeyboardSensor,
  ]

  /** 拖拽中的本地顺序覆盖；null 时回落 store 顺序（拖拽期间不动 store，松手才提交） */
  const dragOrder = ref<Array<string> | null>(null)

  /** tabs 的 items：key 为路由路径键；剔除 icon（Tabs 会把它原生渲染成前置内容），raw 透传原始 tab 供 #labelRender 使用 */
  const tabItems = computed(() => {
    const items = viewTabsStore.viewTabs.map(tab => {
      const {icon, ...rest} = tab
      return {...rest, key: tab.routerPathKey, label: tab.label, raw: tab}
    })
    if (!dragOrder.value) return items
    const byKey = new Map(items.map(item => [item.key, item]))
    return dragOrder.value.map(key => byKey.get(key)).filter(item => item !== undefined)
  })

  /** 取消拖拽时回滚用的 key 序列快照（同时用于初始化 dragOrder） */
  let snapshotKeys: Array<string> = []

  /** 换位判定上下文（dragMove 缓存）：源页签元素与其轨道，供换位后的追帧重评使用 */
  let dragSourceEl: HTMLElement | undefined
  let dragNavList: HTMLElement | undefined
  let dragSourceKey = ''
  /** 拖拽期间冻结轨道滚轮：捕获阶段拦截，阻断 @v-c 的滚轮处理器（防内部 transformLeft 漂移） */
  let frozenWheelTarget: HTMLElement | undefined
  const freezeWheel = (event: Event) => {
    event.preventDefault()
    event.stopPropagation()
  }

  /** 否决库的乐观物理重排（宽度差歧义区会来回振荡），换位决策收归 onDragMove */
  const onDragOver = (event: DragOverEvent) => {
    if (isSortable(event.operation.source)) {
      event.preventDefault()
    }
  }

  const arrayMove = <T>(array: Array<T>, from: number, to: number): Array<T> => {
    const copy = array.slice()
    copy.splice(to, 0, copy.splice(from, 1)[0])
    return copy
  }

  /** 边缘换位：被拖元素同侧边缘越过紧邻页签的布局中心线才换位（盖过一半即让位），阈值随邻居宽度缩放；
   *  边缘参考在轨道钳制下仍可达窄页签中心（中心参考下宽页签中心够不着窄页签，首尾换位死区）。
   *  槽位中心取 offsetLeft/offsetWidth 布局值——不受 FLIP 让位动画 transform 影响：换位后邻居的
   *  动画中途矩形恰好落进边缘规则的死区，读视觉矩形会形成换位⇄回换振荡（中段停手抖动的根因）。
   *  每步至多换一格，换位后追帧重评至稳态——drag-move 只随指针移动触发，快速甩动后停住时
   *  未追平的换位会滞留（滞后阻尼感）；占位克隆（data-dnd-placeholder）即被拖页签的槽位 */
  const evaluateEdgeSwap = () => {
    if (!dragOrder.value || !dragSourceEl || !dragNavList || !dragSourceKey) return
    const ghostRect = dragSourceEl.getBoundingClientRect()
    const listLeft = dragNavList.getBoundingClientRect().left
    const slots: Array<{ key: string, center: number }> = []
    for (const el of dragNavList.children) {
      if (!(el instanceof HTMLElement)) continue
      let key: string | undefined
      if (el.hasAttribute('data-dnd-placeholder')) {
        key = dragSourceKey
      } else if (el !== dragSourceEl) {
        key = el.getAttribute('data-node-key') ?? undefined
      }
      if (key) {
        slots.push({key, center: listLeft + el.offsetLeft + el.offsetWidth / 2})
      }
    }
    const srcIdx = slots.findIndex(slot => slot.key === dragSourceKey)
    if (srcIdx < 0) return
    const left = slots[srcIdx - 1]
    const right = slots[srcIdx + 1]
    if (left && ghostRect.left < left.center) {
      dragOrder.value = arrayMove(dragOrder.value, srcIdx, srcIdx - 1)
    } else if (right && ghostRect.right > right.center) {
      dragOrder.value = arrayMove(dragOrder.value, srcIdx, srcIdx + 1)
    } else {
      return
    }
    requestAnimationFrame(evaluateEdgeSwap)
  }

  const onDragMove = (event: DragMoveEvent) => {
    const {source} = event.operation
    if (!source || !isSortable(source) || !dragOrder.value) return
    const sourceEl = source.element as HTMLElement | undefined
    const navList = sourceEl?.closest<HTMLElement>('.ant-tabs-nav-list')
    if (!sourceEl || !navList) return
    dragSourceEl = sourceEl
    dragNavList = navList
    dragSourceKey = String(source.id)
    evaluateEdgeSwap()
  }

  /** 拖拽期间轨道锁：MO 把 scrollToTab 的写入弹回快照并记录组件内部值；
   *  松手后宽限 350ms 盖过清理期的最后一轮跳转，期满再精确对账（内部值一步对齐视觉位置） */
  let trackLockMO: MutationObserver | undefined
  let lockedNavList: HTMLElement | undefined
  let lockedTransform = ''
  let internalTransform: number | undefined
  let trackReleaseTimer: ReturnType<typeof setTimeout> | undefined
  const TRACK_GRACE_MS = 350

  /** 解析 transform 字符串中的 x 位移值 */
  const parseTranslateX = (transform: string): number | undefined => {
    const match = /translate\((-?\d+(?:\.\d+)?)px/.exec(transform)
    return match ? Number(match[1]) : undefined
  }

  /** 宽限期満的实际释放：解冻滚轮、断开锁，并按需派发合成滚轮完成再同步 */
  const releaseTrack = () => {
    trackReleaseTimer = undefined
    frozenWheelTarget?.removeEventListener('wheel', freezeWheel, {capture: true})
    frozenWheelTarget = undefined
    trackLockMO?.disconnect()
    trackLockMO = undefined
    const navList = lockedNavList
    lockedNavList = undefined
    const finalVisual = parseTranslateX(lockedTransform)
    const internal = internalTransform
    lockedTransform = ''
    if (!navList || finalVisual === undefined || internal === undefined || internal === finalVisual) return
    const wrap = navList.closest<HTMLElement>('.ant-tabs-nav-wrap')
    if (!wrap) return
    // @v-c 滚轮语义为 transformLeft -= 主导轴delta，故 deltaX = 内部值 − 视觉值 可一步对齐且 DOM 不动
    wrap.dispatchEvent(new WheelEvent('wheel', {deltaX: internal - finalVisual, deltaY: 0, bubbles: true, cancelable: true}))
  }

  /** 拖拽开始时上锁：快照当前 transform、挂 MO 与滚轮冻结 */
  const lockTrack = (tabEl: HTMLElement) => {
    // 宽限期内的再次拖拽：取消待释放，滚动冻结解挂后按下一次快照重建
    if (trackReleaseTimer) {
      clearTimeout(trackReleaseTimer)
      trackReleaseTimer = undefined
    }
    frozenWheelTarget?.removeEventListener('wheel', freezeWheel, {capture: true})
    lockedNavList = tabEl.closest<HTMLElement>('.ant-tabs-nav-list') ?? undefined
    if (!lockedNavList) return
    lockedTransform = lockedNavList.style.transform || ''
    internalTransform = parseTranslateX(lockedTransform)
    trackLockMO = new MutationObserver(() => {
      if (!lockedNavList) return
      const attempted = lockedNavList.style.transform
      // 自己的弹回写入不处理；其余即组件（scrollToTab）写入：记录内部值并弹回
      if (attempted === lockedTransform) return
      const attemptedX = parseTranslateX(attempted)
      if (attemptedX !== undefined) internalTransform = attemptedX
      lockedNavList.style.transform = lockedTransform
    })
    trackLockMO.observe(lockedNavList, {attributes: true, attributeFilter: ['style']})
    frozenWheelTarget = tabEl.closest<HTMLElement>('.ant-tabs-nav-wrap') ?? undefined
    frozenWheelTarget?.addEventListener('wheel', freezeWheel, {capture: true, passive: false})
  }

  /** 拖拽结束时解锁：不立即释放，排一个宽限计时器 */
  const unlockTrack = () => {
    if (!lockedNavList) return
    if (trackReleaseTimer) clearTimeout(trackReleaseTimer)
    trackReleaseTimer = setTimeout(releaseTrack, TRACK_GRACE_MS)
  }

  /** 拖拽开始：快照轨道边界与 key 序列，上轨道锁 */
  const onDragStart = (event: DragStartEvent) => {
    const tabEl = event.operation.source?.element as HTMLElement | undefined
    if (tabEl) {
      // 快照轨道边界（水平 clamp 依据）
      snapshotTrackBounds(tabEl)
      lockTrack(tabEl)
    }
    snapshotKeys = viewTabsStore.viewTabs.map(tab => tab.routerPathKey)
    dragOrder.value = snapshotKeys.slice()
  }

  /** 拖拽结束：取消则视图随 dragOrder 清空自动回滚；否则按索引变化提交 store */
  const onDragEnd = (event: DragEndEvent) => {
    unlockTrack()
    resetTrackBounds()
    dragOrder.value = null
    if (event.canceled) {
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

  return {
    sensors,
    tabItems,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDragMove
  }
}
const {sensors, tabItems, onDragStart, onDragEnd, onDragOver, onDragMove} = initDrag()

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
  margin-bottom: var(--ant-margin-xs) !important;
}

/* 拖拽中的页签：Feedback popover 化会剥离外观，按组件 token 恢复 */
.ant-tabs-tab.view-tab-dragging {
  background: var(--ant-tabs-card-bg);
  border: var(--ant-line-width) var(--ant-line-type) var(--ant-color-border-secondary);
  color: var(--ant-tabs-item-color);
}

/* 拖拽中的选中页签：active 背景与主色文字 */
.ant-tabs-tab.view-tab-dragging.ant-tabs-tab-active {
  background: var(--ant-color-bg-container);
  color: var(--ant-tabs-item-selected-color);
}

/* 玻璃主题把选中页签底色置透（与轨道玻璃底融合，ground-glass.css 带 !important），
   拖拽浮层悬于任意内容之上会透底：拖拽期间以不透明容器底色压回（同 !important 下提高特异性决胜） */
.enable-glass .ant-tabs-tab.view-tab-dragging.ant-tabs-tab-active {
  background: var(--ant-color-bg-container) !important;
}

/* 拖拽中的文本色钉住：不依赖 :active/:focus 伪类（换位重渲染会打断伪类导致掉色） */
.ant-tabs-tab.view-tab-dragging .ant-tabs-tab-btn {
  color: var(--ant-tabs-item-active-color);
}

.ant-tabs-tab.view-tab-dragging.ant-tabs-tab-active .ant-tabs-tab-btn {
  color: var(--ant-tabs-item-selected-color);
}

/* 页签间距用 flex gap（2px = cardGutter）替代相邻 margin：与 DOM 相邻关系解耦，拖拽换位时间距恒定 */
.tab-none-padding .ant-tabs-nav-list {
  gap: 0 2px;
}

.tab-none-padding .ant-tabs-nav .ant-tabs-tab + .ant-tabs-tab {
  margin-left: 0 !important;
}

/* 基线分段：选中页签区间（--seg-l ~ --seg-r，由脚本按选中卡位置写入）开透明窗，
   其余保持组件默认线色；测量未就绪时窗口宽为 0，基线呈完整默认线（安全降级） */
.tab-none-padding .ant-tabs-nav::before {
  border-bottom: 0 !important;
  height: var(--ant-line-width, 1px);
  background: linear-gradient(to right,
      var(--ant-color-border-secondary) 0, var(--ant-color-border-secondary) var(--seg-l, 0px),
      transparent var(--seg-l, 0px), transparent var(--seg-r, 0px),
      var(--ant-color-border-secondary) var(--seg-r, 0px), var(--ant-color-border-secondary));
}

.tab-none-padding {
  .ant-tabs-tab {
    padding: 0 !important;
  }

}

.tab-none-padding .ant-tabs-ink-bar {
  visibility: hidden !important;
}
</style>
