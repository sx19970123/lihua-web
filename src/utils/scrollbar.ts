import {OverlayScrollbars} from 'overlayscrollbars';

/**
 * 页面级悬浮滚动条中枢（body 作为 target：html 成为库管理视口并隐藏原生滚动条，滚动仍原生，
 * window.scrollTo 等原生 API 不受影响）。滚动条零布局占位，出现/消失不引起任何横移；
 * 初始化幂等，可在任意挂载点重复调用。
 */
let pageScrollbar: OverlayScrollbars | undefined;

export const initPageScrollbar = () => {
    if (pageScrollbar) return pageScrollbar;
    pageScrollbar = OverlayScrollbars(document.body, {
        overflow: {x: 'hidden', y: 'scroll'},
        // macOS 式显隐：滚动时出现、静止 autoHideDelay（默认 1300ms）后淡出；
        // autoHideSuspend 为 true 时首个滚动事件前抑制显示（含指针触发），当前档位无影响
        scrollbars: {theme: 'os-theme-lihua', autoHide: 'scroll', autoHideSuspend: true},
    }) || undefined;
    return pageScrollbar;
};

/* ==============================页面滚动锁============================== */

let manualLocked = false;

// 锁定页面滚动（蒙层/锁屏等显式调用；幂等，与 showOverflowY 成对）
// antd 弹层（Modal/Drawer/图片预览）自带的滚动锁（向 head 注入 `html body { overflow-y: hidden }`）
// 无需在此桥接：body 溢出被裁切 → 视口溢出量归零 → 库自身的溢出检测会把视口同步置为不可滚动
export const hiddenOverflowY = () => {
    if (manualLocked) return;
    manualLocked = true;
    applyLock();
};

// 恢复页面滚动
export const showOverflowY = () => {
    if (!manualLocked) return;
    manualLocked = false;
    applyLock();
};

const applyLock = () => {
    if (pageScrollbar) {
        // 悬浮滚动条零占位，overflow 切换无布局位移；实例接管后 body 行内样式不再生效
        pageScrollbar.options({overflow: {y: manualLocked ? 'hidden' : 'scroll'}});
    } else {
        // 实例不可用（初始化被取消等）时退回原生行内锁，行为与旧方案一致
        document.body.style.overflowY = manualLocked ? 'hidden' : '';
    }
};
