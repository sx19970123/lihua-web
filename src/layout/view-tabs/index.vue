<template>
  <DragDropProvider :manager="dndManager"
                    :sensors="sensors"
                    @drag-start="onDragStart" @drag-end="onDragEnd"
                    @drag-over="onDragOver" @drag-move="onDragMove">
    <!--右侧留出滚动条槽安全间距（layout 满幅 100vw 后滚动条悬浮于应用右缘，约 0~17px），避免 extras 按钮被覆盖/裁切-->
    <a-tabs :activeKey="activeKey"
            class="unselectable tab-none-padding enable-glass"
            :class="{'tab-boot-stagger': bootStagger}"
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
import {computed, onMounted, ref, useTemplateRef, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import type {DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent} from '@dnd-kit/vue'
import {DragDropManager, PointerActivationConstraints, Scroller} from '@dnd-kit/dom'
import {DragDropProvider, KeyboardSensor, PointerSensor} from '@dnd-kit/vue'
import {isSortable} from '@dnd-kit/vue/sortable'
import {isMobile} from 'is-mobile'
import {resetTrackBounds, snapshotTrackBounds} from "@/layout/view-tabs/composables/useTrackModifiers";
import SortableTabLabel, {activeDragKey} from "@/layout/view-tabs/components/SortableTabLabel.vue";
import TabRightMenu from "@/layout/view-tabs/components/TabRightMenu.vue";

const tabRightMenuRef = useTemplateRef<typeof TabRightMenu>('tabRightMenuRef')
const viewTabsStore = useViewTabsStore()
const route = useRoute()
const router = useRouter()

/** 启动错落窗口：挂载起短暂开启，入场动画按页签序号递进 35ms 逐张浮现（开场感）；
 *  期满移除，会话期间新增的页签零延迟直接入场 */
const bootStagger = ref(true)

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

/** 关闭标签：淡出退场后再提交——所有关闭路径（卡片按钮/中键/右键菜单）汇拢于此，
 *  先挂 view-tab-closing 播退场动画，期满再执行路由切换与 store/缓存清理；
 *  拖拽进行中、固定页签或节点解析失败（异常路径）跳过动画直接关闭 */
const closeTab = (key: string) => {
  const commitClose = () => {
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
  }
  const closable = viewTabsStore.viewTabs.some(tab => tab.routerPathKey === key && !tab.affix)
  const tabEl = document.querySelector<HTMLElement>(
      `.tab-none-padding .ant-tabs-tab[data-node-key="${CSS.escape(key)}"]`)
  if (!closable || !tabEl || document.querySelector('.tab-none-padding [data-dnd-dragging]')) {
    commitClose()
    return
  }
  // 退场动画（收宽+淡出）：起始宽度 JS 量取写入变量（纯 CSS 拿不到自身宽度），
  // 收宽驱动真实布局，右侧页签随之后连续滑动补位而非瞬跳
  tabEl.style.setProperty('--closing-w', `${tabEl.offsetWidth}px`)
  tabEl.classList.add('view-tab-closing')
  setTimeout(commitClose, 190)
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
 * 拖拽管理器：外部持有并禁用 Scroller（dnd-kit 拖拽自动滚动的执行方）——
 * 页签栏恒处视口顶部 20% 的纵向滚动意图阈值带内（dnd-kit detectScrollIntent），
 * 横向拖拽伴生的轻微纵向漂移一旦解锁 y 轴意图，页面就会被持续向上卷（左拖时尤明显）；
 * 轨道的横向跟随由组件自身的 transform/滚轮机制负责，不需要 dnd 的 autoscroll。
 * Scroller 是 CorePlugin：provider 重设插件表时不会注销它，disable 一次终身有效；
 * 驱动方 AutoScroller 依赖 scroller.scroll() 的返回值，执行方失效即整链停摆
 */
const dndManager = new DragDropManager()
dndManager.registry.plugins.get(Scroller)?.disable()

/**
 * 初始化拖拽排序（@dnd-kit/vue）：集中定义拖拽相关的状态与方法，统一导出
 */
const initDrag = () => {
  /** 拖拽传感器：4px 距离激活防误触；移动端不启用 */
  const sensors = isMobile() ? [] : [
    PointerSensor.configure({activationConstraints: [new PointerActivationConstraints.Distance({value: 4})]}),
    KeyboardSensor,
  ]

  /** 拖拽中的本地顺序覆盖；null 时回落 store 顺序（拖拽期间不动 store，松手才提交。
   *  取消拖拽的回滚即清空此值——视图随之回落 store 顺序） */
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

  /** 换位判定上下文（dragStart 一次性锚定，dragEnd 清空）：源页签元素与其轨道——
   *  keyed v-for 换位只移动节点不重建，拖拽全程稳定不变 */
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
   *  槽位中心取 offsetLeft/offsetWidth 布局值——getBoundingClientRect 含轨道平移 transform，
   *  且让位滑行中的视觉矩形恰好落进边缘规则死区（历史版换位⇄回换振荡的根机），布局值两者皆免疫。
   *  每步至多换一格，换位后追帧重评至稳态——drag-move 只随指针移动触发，快速甩动后停住时
   *  未追平的换位会滞留（滞后阻尼感）；占位克隆（data-dnd-placeholder）即被拖页签的槽位 */
  const evaluateEdgeSwap = () => {
    if (!dragOrder.value || !dragSourceEl || !dragNavList || !dragSourceKey) return
    const ghostRect = dragSourceEl.getBoundingClientRect()
    const listLeft = dragNavList.getBoundingClientRect().left
    const slots: Array<{ key: string, center: number, el: HTMLElement }> = []
    for (const el of dragNavList.children) {
      if (!(el instanceof HTMLElement)) continue
      let key: string | undefined
      if (el.hasAttribute('data-dnd-placeholder')) {
        key = dragSourceKey
      } else if (el !== dragSourceEl) {
        key = el.getAttribute('data-node-key') ?? undefined
      }
      if (key) {
        slots.push({key, center: listLeft + el.offsetLeft + el.offsetWidth / 2, el})
      }
    }
    const srcIdx = slots.findIndex(slot => slot.key === dragSourceKey)
    if (srcIdx < 0) return
    const left = slots[srcIdx - 1]
    const right = slots[srcIdx + 1]
    if (left && ghostRect.left < left.center) {
      dragOrder.value = arrayMove(dragOrder.value, srcIdx, srcIdx - 1)
      markSliding(left.el)
    } else if (right && ghostRect.right > right.center) {
      dragOrder.value = arrayMove(dragOrder.value, srcIdx, srcIdx + 1)
      markSliding(right.el)
    } else {
      return
    }
    requestAnimationFrame(evaluateEdgeSwap)
  }

  /** 熄片窗口计时按元素记账：连续换位时重置续期，末次滑行结束后恢复 */
  const slideTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

  /** 换位时点给被越邻居挂滑行标记：其缝隙分片随卡滑行会呈"线段向前渲染"（伪元素与宿主
   *  的 WAAPI transform 一体，CSS 无法解耦）——飞行窗口内由样式规则就地熄灭。
   *  只此一处：卡底边框与槽位线属随体运动（读作卡边缘/空位在挪），保留；
   *  content 不走过渡，落位复位即时、无接缝。240ms = 200ms 动画 + 起帧余量 */
  const markSliding = (el: HTMLElement) => {
    el.classList.add('view-tab-sliding')
    clearTimeout(slideTimers.get(el))
    slideTimers.set(el, setTimeout(() => {
      el.classList.remove('view-tab-sliding')
      slideTimers.delete(el)
    }, 240))
  }

  const onDragMove = (event: DragMoveEvent) => {
    const {source} = event.operation
    if (!source || !isSortable(source) || !dragOrder.value) return
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

  /** 拖拽开始：快照轨道边界、上轨道锁、一次性锚定换位上下文，初始化本地顺序覆盖。
   *  activeDragKey 置源 key：源 sortable 让位动画归零（占位克隆瞬移、槽位线不滑行），见 SortableTabLabel */
  const onDragStart = (event: DragStartEvent) => {
    const source = event.operation.source
    const tabEl = source?.element as HTMLElement | undefined
    activeDragKey.value = source?.id === undefined ? null : String(source.id)
    if (tabEl) {
      // 快照轨道边界（水平 clamp 依据）
      snapshotTrackBounds(tabEl)
      lockTrack(tabEl)
      dragSourceEl = tabEl
      dragNavList = tabEl.closest<HTMLElement>('.ant-tabs-nav-list') ?? undefined
      dragSourceKey = source?.id === undefined ? '' : String(source.id)
    }
    dragOrder.value = viewTabsStore.viewTabs.map(tab => tab.routerPathKey)
  }

  /** 拖拽结束：取消则视图随 dragOrder 清空自动回滚；否则按索引变化提交 store */
  const onDragEnd = (event: DragEndEvent) => {
    unlockTrack()
    resetTrackBounds()
    activeDragKey.value = null
    dragOrder.value = null
    dragSourceEl = undefined
    dragNavList = undefined
    dragSourceKey = ''
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
  // 错落开场窗口期满关闭（末张延迟 + 动画时长 + 余量）
  setTimeout(() => {
    bootStagger.value = false
  }, Math.min(viewTabsStore.viewTabs.length, 12) * 35 + 450)
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
/* 页签栏与内容区的间距（收紧至 8px）。必须带 .tab-none-padding 前缀：
   无前缀会波及全项目所有 a-tabs 的下边距 */
.tab-none-padding .ant-tabs-nav {
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

/* 非玻璃模式的飞行未选中卡：静止底色 cardBg 是半透明 fill token，飞行悬浮于任意
   内容之上会透底。以 bg-container 打底、同款 cardBg 渐变层叠顶——色相与静止态
   完全一致但彻底不透明（玻璃模式不命中，保留半透明+磨砂的玻璃芯片观感）。
   按 [data-dnd-dragging] 属性键控而非拖拽类：属性存续到落位，松手飞回段同样不透底 */
html:not([ground-glass='enable']) .ant-tabs-tab[data-dnd-dragging]:not(.ant-tabs-tab-active) {
  background-color: var(--ant-color-bg-container);
  background-image: linear-gradient(var(--ant-tabs-card-bg), var(--ant-tabs-card-bg));
  /* 拖起瞬间底色即挂：antd 对 background-color 有 0.3s 过渡，不禁则白底迟滞渐入 */
  transition: none !important;
}

/* 玻璃主题下飞行卡的磨砂（纯 backdrop 模糊、不动底色）在 ground-glass.css：
   以 .view-tab-dragging 类 + [data-dnd-dragging] 属性双钩子命中，存续到落位 */

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

/* 基线分片：整线退役，线只在缝隙/首尾延伸/操作区生来画，卡片正下方不画——
   普通模式不透明卡片盖线、视觉与整线时代一致；玻璃模式幽灵选中卡下方是真·空。
   线行 = 卡片 border-box 底行 == nav 底行：缝隙片挂在卡上（bottom:-1px 落进底边框行），
   首尾延伸挂 nav-list（bottom:0），越界部分由 nav-wrap overflow:hidden 裁掉正合所需 */
.tab-none-padding .ant-tabs-nav::before {
  display: none;
}

/* 相邻卡之间 2px 缝隙分片（右卡画自己左侧的缝）。
   排除"飞行中"的拖拽源（position:fixed 跟手，不排除缝会跟着卡片满天飞）；
   以 [data-dnd-dragging] 属性为准——比拖拽类存续更久，飞回落位全程排除；
   占位克隆无该属性，槽位处的缝仍由它承担 */
.tab-none-padding .ant-tabs-nav-list .ant-tabs-tab + .ant-tabs-tab:not([data-dnd-dragging])::before {
  content: "";
  position: absolute;
  right: calc(100% + 1px);
  bottom: -1px;
  width: 2px;
  height: 1px;
  background: var(--ant-color-border-secondary);
}

/* 拖拽槽位闭合线：占位克隆被 dnd-kit 设为 visibility:hidden（槽位呈空），卡被拖走后
   底行应补回基线（选中卡的窗口随卡闭合、线穿过原位置）；卡落回槽位时克隆移除、
   不透明卡自然盖线，此条随之失效。
   left/right:-1px 外扩到 border-box：克隆自身边框（与线同色，本可补位）也随 visibility
   隐形，不外扩则左右边框列下方各留一个 1px 断点 */
.tab-none-padding .ant-tabs-nav-list .ant-tabs-tab[data-dnd-placeholder]::after {
  content: "";
  position: absolute;
  left: -1px;
  right: -1px;
  bottom: -1px;
  height: 1px;
  background: var(--ant-color-border-secondary);
}

/* 让位滑行熄片：换位时唯一"自由飞行"的线片是被越卡携带的缝隙分片（伪元素随宿主的
   WAAPI 一体，CSS 无法解耦）——由 evaluateEdgeSwap 挂 view-tab-sliding 类（240ms 自摘）
   在飞行窗口内就地熄灭；卡底边框与槽位线属随体运动，保留。
   更彻底的调和方案（底边框置透+三路静态补线）见 stash（让位动画全套实验），
   因落位边框 0.3s 淡入无法与补线无缝衔接而弃用 */
.ant-tabs-tab.view-tab-sliding::before {
  content: none !important;
}

/* dnd-kit 给占位克隆设的是 visibility:hidden（槽位呈空），visibility 可继承——
   克隆携带的缝隙片与上面的槽位线都会跟着隐形，须对其伪元素显式恢复可见 */
.tab-none-padding .ant-tabs-nav-list .ant-tabs-tab[data-dnd-placeholder]::before,
.tab-none-padding .ant-tabs-nav-list .ant-tabs-tab[data-dnd-placeholder]::after {
  visibility: visible;
}

/* 落位残影抑制：克隆若在源卡落位（[data-dnd-dragging] 摘除）之后仍残留，
   其槽位线会从落定的透明选中卡下透出闪现——源卡属性已摘时克隆不再画线。
   按属性而非拖拽类判据：属性存续到落位，飞回全程槽位线都在（右端不再空缺），
   只截收尾残影 */
.tab-none-padding .ant-tabs-nav-list:not(:has([data-dnd-dragging])) .ant-tabs-tab[data-dnd-placeholder]::before,
.tab-none-padding .ant-tabs-nav-list:not(:has([data-dnd-dragging])) .ant-tabs-tab[data-dnd-placeholder]::after {
  content: none;
}

/* 首尾长延伸挂在 nav-list 自身（list 左右缘即首尾卡外缘，越界部分由 wrap 裁掉）：
   与具体卡片解耦——不随拖拽源飞行、不依赖谁是首卡/尾卡（列表末尾恒跟 ink-bar，
   :last-child 类选择器选不中卡），换位/滚轮/占位克隆全程稳定 */
.tab-none-padding .ant-tabs-nav-list::before,
.tab-none-padding .ant-tabs-nav-list::after {
  content: "";
  position: absolute;
  bottom: 0;
  height: 1px;
  width: 9999px;
  background: var(--ant-color-border-secondary);
}
.tab-none-padding .ant-tabs-nav-list::before {
  right: 100%;
}
.tab-none-padding .ant-tabs-nav-list::after {
  left: 100%;
}

/* wrap 之后两区各自补线（原整线一直画到 nav 右缘）；
   extra 需 stretch+flex 居中保持按钮竖直位置不变，同时盒子满高、线落位 nav 底行。
   operations 的 position 必须让过 hidden 态：antd 靠 -hidden 类将其 absolute 脱流，
   强设 relative 会让隐形盒子占位，其内不可见的 ::before 造成线段空缺 */
.tab-none-padding .ant-tabs-nav .ant-tabs-nav-operations:not(.ant-tabs-nav-operations-hidden),
.tab-none-padding .ant-tabs-nav .ant-tabs-extra-content {
  position: relative;
}
.tab-none-padding .ant-tabs-nav .ant-tabs-extra-content {
  align-self: stretch;
  display: flex;
  align-items: center;
}
.tab-none-padding .ant-tabs-nav .ant-tabs-nav-operations:not(.ant-tabs-nav-operations-hidden)::before,
.tab-none-padding .ant-tabs-nav .ant-tabs-extra-content::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 1px;
  background: var(--ant-color-border-secondary);
}

.tab-none-padding {
  .ant-tabs-tab {
    padding: 0 !important;
  }
}

/* 页签入场/退场动画（淡入淡出+轻位移，纯合成层不动布局）。
   位移语义：从哪儿来、回哪儿去——入场自左侧 -10px 滑入，退场向左侧 -10px 滑出（镜像反转）。
   关键约束：位移只能落在内层 .ant-tabs-tab-btn 上——antd 的溢出判定用 getBoundingClientRect
   量 .ant-tabs-tab 本体的 left/right（可见区间→"…"收纳），本体带 transform 会让测量值
   偏移（单卡也能被判出视野，且动画结束无 resize 触发重测、"…"滞留）；本体只动 opacity，
   矩形纹丝不动，antd 测量全程干净。
   入场随节点插入自动播；启动错落由根节点 tab-boot-stagger 类 + --tab-in-i 序号
   （SortableTabLabel 挂载时写入）组合出每张 35ms 递进延迟，开场窗口后根类移除 */
@keyframes view-tab-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes view-tab-in-slide {
  from {
    transform: translateX(-10px);
  }
  to {
    transform: none;
  }
}

/* 退场：收宽 + 淡出（手风琴）。宽度是布局属性——收窄驱动真实布局，右侧页签随之后
   连续滑动补位（"右边滑过来"），与基线系统天然兼容（所有线片随各自的盒连续移动）。
   终态几何精确对账：max-width 0 + 边框归零 + margin-inline -1px×2，让收完的卡在
   双侧 2px 缝隙中净占 2px——恰等于摘除后左右邻居间的缝隙，落刀零跳动。
   --closing-w 起始宽度由 closeTab 量取写入；overflow hidden 防内容在收窄中折行；
   pointer-events 隔离防动画期间重复触发；!important 压过入场播完后钉死的内联值 */
@keyframes view-tab-out {
  from {
    opacity: 1;
    max-width: var(--closing-w, 200px);
    margin-inline: 0;
    border-inline-width: 1px;
  }
  to {
    opacity: 0;
    max-width: 0;
    margin-inline: -1px;
    border-inline-width: 0;
  }
}

.tab-none-padding .ant-tabs-tab.view-tab-closing {
  animation: view-tab-out 180ms ease-in both !important;
  overflow: hidden;
  pointer-events: none;
}

.tab-none-padding .ant-tabs-tab {
  animation: view-tab-in 200ms ease-out both;
}

.tab-none-padding .ant-tabs-tab > .ant-tabs-tab-btn {
  animation: view-tab-in-slide 200ms ease-out both;
}

.tab-none-padding.tab-boot-stagger .ant-tabs-tab,
.tab-none-padding.tab-boot-stagger .ant-tabs-tab > .ant-tabs-tab-btn {
  animation-delay: calc(var(--tab-in-i, 0) * 35ms);
}

@media (prefers-reduced-motion: reduce) {
  .tab-none-padding .ant-tabs-tab,
  .tab-none-padding .ant-tabs-tab > .ant-tabs-tab-btn {
    animation: none;
  }
}
</style>
