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

<script lang="ts" setup>
import TabPaneMenu from '@/layout/view-tabs/components/TabPaneMenu.vue';
import type {StarViewType} from '@/api/system/view-tab/type/sys-view-tab.ts';
import {computed, ref, watch} from 'vue';
import {useSortable} from '@dnd-kit/vue/sortable';
import {trackModifiers} from '@/layout/view-tabs/composables/useTrackModifiers';

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

const anchorRef = ref<HTMLElement>()
/** 页签容器：插槽内容渲染于 .ant-tabs-tab-btn 内，sortable 须注册到外层 .ant-tabs-tab（含 card 背景/边框的整体）。
 * 带缓存兜底：Vue 重渲染插槽时锚点 ref 会闪断（undefined→恢复），若把 undefined 写入 sortable.element，
 * dnd-kit 会摘除该页签上的 sensor 监听（pointerdown/keydown）且恢复时序错过即永久丢失——
 * 「页签进过"..."再滚回来就无法拖动」的根因。闪断期间复用缓存元素（DOM 未卸载时一直有效）。 */
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

const {isDragging} = useSortable({
  id: () => props.item.key,
  index: () => props.index,
  element: tabEl,
  target: tabEl,
  // 轨道修饰器同时配到 sortable 级：dragOperation 的 modifiers 优先取 source.draggable 上的配置
  modifiers: trackModifiers,
  transition: {duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)'},
})

// move 反馈模式下本体直接跟随指针，拖拽期间给页签容器挂类（dnd-kit popover 化会剥离外观，恢复样式挂在类上）
watch([isDragging, tabEl], ([dragging, el]) => {
  el?.classList.toggle('view-tab-dragging', dragging)
}, {flush: 'post'})
</script>
