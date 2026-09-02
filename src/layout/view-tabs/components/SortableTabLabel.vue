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
import {ref} from 'vue';

/** sortable 注册权声明表（模块级）：#labelRender 产物会同时流入"…"下拉（挂出同 key 的重复实例，
 *  同 id 注册互踩会使导航条页签永久失去拖拽），故先挂载的导航条实例认领 key，重复实例不注册 */
const sortableOwners = new Map<string, object>()

/** 当前拖拽源 key（模块级，index.vue 拖拽回调写入/清除）：源 sortable 的让位动画归零依据。
 *  dnd 把源 sortable 的元素引用代理到占位克隆（ProxiedElements），换位时源 index 同步变化、
 *  animate() 便把让位 FLIP 打在克隆身上——槽位线随换位滑行；源侧归零后克隆瞬移落位、
 *  槽位线只随换位瞬跳，非源卡的滑行让位不受影响 */
export const activeDragKey = ref<string | null>(null)
</script>

<script lang="ts" setup>
import {computed, onUnmounted, watch} from 'vue';
import {useSortable} from '@dnd-kit/vue/sortable';
import type {StarViewType} from '@/api/system/view-tab/type/sys-view-tab.ts';
import {trackModifiers} from '@/layout/view-tabs/composables/useTrackModifiers';
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
      // 轨道修饰器配到 sortable 级：dragOperation 的 modifiers 优先取 source.draggable 上的配置
      modifiers: trackModifiers,
      // 换位让位滑行动画：唯一"自由飞行"的线片（被越卡携带的缝隙分片）由 index.vue
      // 换位时点挂 view-tab-sliding 熄灭；源卡拖拽期间归零（见 activeDragKey 注释）——
      // 克隆瞬移、槽位线只随换位瞬跳，不再滑行。
      // 仅影响拖拽中的换位补位，不触碰松手后的落位飞回（dropAnimation 另有配置）
      transition: () => activeDragKey.value === props.item.key
          ? {duration: 0, easing: 'linear'}
          : {duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)'},
    }).isDragging
  }

  // 拖拽期间给页签容器挂类（dnd-kit popover 化会剥离外观，恢复样式挂在该类上）
  watch([isDragging, tabEl], ([dragging, el]) => {
    el?.classList.toggle('view-tab-dragging', dragging)
  }, {flush: 'post'})

  // 入场动画配套：给宿主页签挂序号变量（启动错落 stagger 的延迟基数，挂载期序号即初始位次；
  // data 标记防"…"下拉重复实例或重解析重复挂），入场动画播完后钉死内外两层的 animation-name
  // （本体淡入 + 内层滑入）——防 antd 溢出收纳/放回等场景的节点重挂导致入场动画重播。
  // 位移在内层、本体只动 opacity：antd 溢出判定以本体 rect 为准，带 transform 会污染测量
  watch(tabEl, (el) => {
    if (!el || el.dataset.tabInWired) return
    el.dataset.tabInWired = '1'
    el.style.setProperty('--tab-in-i', String(props.index))
    const onTabInEnd = (event: AnimationEvent) => {
      // 内层滑入的 animationend 会冒泡上来，只认本体自身的淡入事件
      if (event.target !== el || event.animationName !== 'view-tab-in') return
      el.style.setProperty('animation-name', 'none')
      el.querySelector<HTMLElement>(':scope > .ant-tabs-tab-btn')?.style.setProperty('animation-name', 'none')
      el.removeEventListener('animationend', onTabInEnd)
    }
    el.addEventListener('animationend', onTabInEnd)
  }, {immediate: true})

  return {anchorRef}
}
const {anchorRef} = initSortable()
</script>
