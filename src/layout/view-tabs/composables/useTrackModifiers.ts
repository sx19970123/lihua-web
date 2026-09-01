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
 * 水平方向不得把页签拖出 nav-wrap 可视区，即「被拖拽元素不能离开 view-tabs 轨道」。
 */
export class TrackClampModifier extends Modifier {
    apply(operation: DragOperation): Coordinates {
        const {x} = operation.transform
        return {
            x: Math.min(Math.max(x, trackBounds.min), trackBounds.max),
            y: 0,
        }
    }
}

/** view-tabs 拖拽修饰器：先锁水平轴，再钳制在轨道边界内 */
export const trackModifiers = [RestrictToHorizontalAxis, TrackClampModifier]
