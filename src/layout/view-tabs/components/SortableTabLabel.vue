<template>
  <!--锚点 span（display: contents 零布局影响）：TabPaneMenu 根为 Dropdown Fragment、$el 不可靠，借真实元素向上 closest 定位页签容器 .ant-tabs-tab；
  中键关闭页签沿事件冒泡在此拦截-->
  <span ref="anchorRef"
        style="display: contents"
        @mousedown="(event: MouseEvent) => event.button === 1 && !props.item.raw.affix && emits('closeViewTab', props.item.raw.routerPathKey)"
  >
    <tab-pane-menu :tab="props.item.raw"
                   :index="props.index"
                   @route-skip="(path: string, query?: string) => emits('routeSkip', path, query)"
                   @cancel-keep-alive="(keys: Array<string>) => emits('cancelKeepAlive', keys)"
                   @close-view-tab="(key: string) => emits('closeViewTab', key)"
    />
  </span>
</template>

<script lang="ts">
/** sortable 注册权声明表（模块级）：#labelRender 产物会同时流入"…"下拉（挂出同 key 的重复实例，
 *  同 id 注册互踩会使导航条页签永久失去拖拽），故先挂载的导航条实例认领 key，重复实例不注册 */
const sortableOwners = new Map<string, object>()
</script>

<script lang="ts" setup>
import {computed, onUnmounted, ref, watch} from 'vue';
import {useSortable} from '@dnd-kit/vue/sortable';
import type {StarViewType} from '@/api/system/view-tab/type/sys-view-tab.ts';
import {trackModifiers} from '@/layout/view-tabs/composables/useTrackModifiers';
import {useViewTabsStore} from '@/stores/view-tabs.ts';
import TabPaneMenu from '@/layout/view-tabs/components/TabPaneMenu.vue';

const props = defineProps<{
  /** a-tabs #labelRender 插槽项：key 为路由路径键，raw 透传原始 tab */
  item: { key: string, label: string, raw: StarViewType },
  index: number
}>()

const emits = defineEmits<{
  routeSkip: [path: string, query?: string],
  cancelKeepAlive: [keys: Array<string>],
  closeViewTab: [key: string]
}>()

const viewTabsStore = useViewTabsStore()

/**
 * 初始化 sortable 注册：注册权声明、页签容器解析、传感器注册与拖拽类切换
 */
const initSortable = () => {
  // 注册权声明：先挂载的导航条实例认领 key，重复实例（"…"下拉）不注册 sortable
  const owner = {}
  const sortableOwned = !sortableOwners.has(props.item.key)
  if (sortableOwned) {
    sortableOwners.set(props.item.key, owner)
  }
  onUnmounted(() => {
    if (sortableOwners.get(props.item.key) === owner) {
      sortableOwners.delete(props.item.key)
    }
  })

  const anchorRef = ref<HTMLElement>()
  /** 页签容器：sortable 注册到外层 .ant-tabs-tab；带缓存兜底，锚点 ref 闪断期间复用上次解析的 DOM */
  let cachedTabEl: HTMLElement | undefined
  const resolveTabEl = () => {
    const el = anchorRef.value?.closest<HTMLElement>('.ant-tabs-tab')
    if (el) {
      cachedTabEl = el
      return el
    }
    return cachedTabEl?.isConnected ? cachedTabEl : undefined
  }
  const tabEl = computed(resolveTabEl)

  let isDragging = ref(false)
  if (sortableOwned) {
    isDragging = useSortable({
      id: () => props.item.key,
      index: () => props.index,
      element: tabEl,
      target: tabEl,
      // 仅一个页签时无处可换，禁用拖拽激活（指针按下移动不进入拖拽态，点击/中键关闭不受影响）
      disabled: () => viewTabsStore.viewTabs.length <= 1,
      // 轨道修饰器配到 sortable 级：dragOperation 的 modifiers 优先取 source.draggable 上的配置
      modifiers: trackModifiers,
      transition: {duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)'},
    }).isDragging
  }

  // 拖拽期间给页签容器挂类（dnd-kit popover 化会剥离外观，恢复样式挂在该类上）
  watch([isDragging, tabEl], ([dragging, el]) => {
    el?.classList.toggle('view-tab-dragging', dragging)
  }, {flush: 'post'})

  return {anchorRef}
}
const {anchorRef} = initSortable()
</script>
