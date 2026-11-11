import {nextTick} from "vue";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import "@/layout/view-tabs/styles/close-flip.css"

/** 查询页签卡片节点（data-node-key 为 antd 的 tab key，即 routerPathKey） */
const queryTabEl = (key: string) => document.querySelector<HTMLElement>(
    `.tab-none-padding .ant-tabs-tab[data-node-key="${CSS.escape(key)}"]`)

/** 关闭补位动画（FLIP）：先即时提交（路由跳转/store 移除/keep-alive 清理零延迟，无动画
 *  等待窗口与竞态面），Vue 渲染后再对发生位移的幸存卡片做反向位移过渡——动画只服务
 *  「右侧卡片滑过来补位」这一件事：末位/末段关闭时无卡片位移、天然零动画，无需任何
 *  位置判定（手风琴方案的 isLastTab/含末位判定与「收宽-提交」190ms 定时随此废弃）。
 *  拖拽中跳过补位（dnd-kit 自身以 transform 定位，防干扰），提交不受影响 */
export const useCloseFlip = () => {
  const viewTabsStore = useViewTabsStore()

  const closeWithFlip = (closedKeys: Array<string>, commit: () => void) => {
    const dragging = !!document.querySelector('.tab-none-padding [data-dnd-dragging]')
    // First：提交前量幸存卡片（不在关闭集合内的全部页签）水平位置
    const survivors = viewTabsStore.viewTabs
        .filter(tab => !closedKeys.includes(tab.routerPathKey))
        .map(tab => ({key: tab.routerPathKey, el: queryTabEl(tab.routerPathKey)}))
        .filter((s): s is { key: string, el: HTMLElement } => !!s.el)
        .map(s => ({key: s.key, left: s.el.getBoundingClientRect().left}))
    commit()
    if (dragging) {
      return
    }
    nextTick(() => {
      // Last+Invert：量新位算位移，先无过渡挂反向 transform 固化起点（亚像素位移忽略）。
      // 关键：antd 给 .ant-tabs-tab 自带 transition: all .3s（hover 那套），不内联压成 none
      // 的话 Invert 位移会被它直接过渡掉，回流钉住的是过渡起点而非反向位移——Play 归零
      // 时无变化可播，表现为完全无动画
      let moved = false
      for (const {key, left} of survivors) {
        const el = queryTabEl(key)
        if (!el) {
          continue
        }
        const dx = left - el.getBoundingClientRect().left
        if (Math.abs(dx) < 1) {
          continue
        }
        el.style.transition = 'none'
        el.style.transform = `translateX(${dx}px)`
        moved = true
      }
      if (!moved) {
        return
      }
      // 强制回流钉住起点，再开过渡归零（Play）：清内联 transition 让 .view-tab-flip 的
      // transform 180ms 接管，同帧清 transform 触发过渡（样式规则在 close-flip.css）
      void (document.querySelector('.tab-none-padding') as HTMLElement | null)?.offsetWidth
      for (const {key} of survivors) {
        const el = queryTabEl(key)
        if (el?.style.transform) {
          el.classList.add('view-tab-flip')
          el.style.transition = ''
          el.style.transform = ''
        }
      }
      // 兜底清类（transition 180ms + 余量；类残留无 transform 变化不会再播）
      setTimeout(() => {
        survivors.forEach(({key}) => {
          const el = queryTabEl(key)
          el?.classList.remove('view-tab-flip')
        })
      }, 220)
    })
  }

  return {closeWithFlip}
}
