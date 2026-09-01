import {Modifier, type DragOperation} from '@dnd-kit/abstract';
import {RestrictToHorizontalAxis} from '@dnd-kit/abstract/modifiers';
import type {Coordinates} from '@dnd-kit/geometry';

/**
 * view-tabs 拖拽轨道边界（transform.x 的合法区间）。
 * dragStart 时依据 nav-wrap（滚动视口）与源页签的视口矩形快照计算：
 * 拖拽中页签视口左缘 = tabRect.left + transform.x，须始终落在 nav-wrap 可视区内。
 * 只取快照不做实时测量：PositionObserver 维护的形状 75ms 节流且 rect 含 transform，
 * 让位动画/轨道平移的中途矩形会污染边界判定。
 */
const trackBounds = {min: -Infinity, max: Infinity};

/** 源页签 dragStart 视口矩形：apply 中求列表实时边界交集的位移基准 */
const sourceRect = {left: 0, right: 0};

/**
 * 快照轨道边界，dragStart 时调用
 * @param sourceTab 被拖拽的页签容器（.ant-tabs-tab）
 */
export function snapshotTrackBounds(sourceTab: HTMLElement) {
    const wrap = sourceTab.closest<HTMLElement>('.ant-tabs-nav-wrap')
    if (!wrap) {
        return
    }
    const wrapRect = wrap.getBoundingClientRect()
    const tabRect = sourceTab.getBoundingClientRect()
    sourceRect.left = tabRect.left
    sourceRect.right = tabRect.right
    trackBounds.min = wrapRect.left - tabRect.left
    trackBounds.max = wrapRect.right - tabRect.right
}

/**
 * 重置轨道边界（dragEnd 时调用，避免边界残留影响下次拖拽前的判定）
 */
export function resetTrackBounds() {
    trackBounds.min = -Infinity
    trackBounds.max = Infinity
}

/**
 * 将拖拽位移钳制在轨道内：垂直恒为 0（页签只做水平排序），
 * 水平方向取 nav-wrap 快照边界（不可拖出滚动视口）与 nav-list 实时布局边界
 * （不可越入两端无页签的空白区——飞行卡最远停在自己作为首/末元素的位置上，
 * 即落点预览，磨砂卡下的空白区也不再出现断线）的交集。
 * 列表盒只含在流子元素（真实页签 + 占位克隆），飞行卡 position:fixed 不占布局，
 * 列表右缘即末位落点右缘；拖拽期间轨道被锁（lockTrack 弹回 scrollToTab 写入），
 * 实时 rect 不受轨道平移影响，换位 FLIP 是纯 transform 也不改变列表布局盒
 */
export class TrackClampModifier extends Modifier {
    apply(operation: DragOperation): Coordinates {
        const {x} = operation.transform
        let {min, max} = trackBounds
        // 抽象层 DragOperation 的 source 类型不带 element（DOM 子类字段），结构化取出后用 instanceof 收窄
        const sourceEl = (operation.source as {element?: Element} | undefined)?.element
        const list = sourceEl instanceof HTMLElement
            ? sourceEl.closest<HTMLElement>('.ant-tabs-nav-list')
            : undefined
        if (list) {
            const listRect = list.getBoundingClientRect()
            min = Math.max(min, listRect.left - sourceRect.left)
            max = Math.min(max, listRect.right - sourceRect.right)
        }
        return {
            x: Math.min(Math.max(x, min), max),
            y: 0,
        }
    }
}

/** view-tabs 拖拽修饰器：先锁水平轴，再钳制在轨道边界内 */
export const trackModifiers = [RestrictToHorizontalAxis, TrackClampModifier]
