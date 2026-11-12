import {OverlayScrollbars} from 'overlayscrollbars';
import type {Router} from 'vue-router';

/**
 * 页面级悬浮滚动条中枢（body 作为 target：html 成为库管理视口并隐藏原生滚动条，滚动仍原生，
 * window.scrollTo 等原生 API 不受影响）。滚动条零布局占位，出现/消失不引起任何横移；
 * 初始化幂等，可在任意挂载点重复调用。
 */
let pageScrollbar: OverlayScrollbars | undefined;

// 移动端浏览器（安卓/iOS；iPadOS 13+ UA 伪装 Mac，须以触屏点数补判；iOS 第三方浏览器同为
// WebKit，UA 均带设备名）跳过页面滚动条接管：OS 接管须在根元素 html 上显式设 height+overflow
// （html 成为独立滚动盒），移动端浏览器藏不住根元素滚动条（原生条与悬浮条双层并存），
// 且对「根元素自滚」的触屏手势处理与真视口滚动不同——跳过后恢复原生视口滚动；
// 移动端原生滚动条本为 overlay 自动隐藏，接管零收益
const isMobileBrowser = () =>
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const initPageScrollbar = () => {
    // 视口 overscroll-behavior:none 全平台挂载（原为 index.html 静态规则）：
    // 桌面防视口边界回弹/下拉刷新把悬浮滚动条状态带乱；移动端（Safari 16.4+）禁掉下拉
    // 橡皮筋——橡皮筋的弹性平移会让 sticky 吸顶头部（affixHead）与文档分离错位：
    // 头部钉在视口顶不动、文档整体被拽下滑，内容视觉上"消失"（安卓本无弹性平移，无感）
    document.documentElement.style.overscrollBehavior = 'none';
    if (pageScrollbar || isMobileBrowser()) return pageScrollbar;
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
let antdLockActive = false;

// 锁定页面滚动（蒙层/锁屏等显式调用；幂等，与 showOverflowY 成对）
export const hiddenOverflowY = () => {
    if (manualLocked) return;
    manualLocked = true;
    applyViewportLock();
};

// 恢复页面滚动
export const showOverflowY = () => {
    if (!manualLocked) return;
    manualLocked = false;
    applyViewportLock();
};

// 锁统一走 OS 视口 overflow 通道：html 级 hidden 锁住用户滚动且不塌缩滚动高度，位置天然保留
const applyViewportLock = () => {
    const locked = manualLocked || antdLockActive;
    if (pageScrollbar) {
        // 悬浮滚动条零占位，overflow 切换无布局位移
        pageScrollbar.options({overflow: {y: locked ? 'hidden' : 'scroll'}});
    } else {
        // 无 OS 实例（移动端浏览器跳过接管）时经 html 内联 overflow 兜底：同为 html 级
        // hidden，不塌缩滚动高度、位置天然保留（触屏拖动会有边界回弹但滚不动，锁定仍成立）；
        // custom.css 对 body 的 overflow 反杀写在 body 盒上，与本通道不冲突
        document.documentElement.style.overflowY = locked ? 'hidden' : '';
    }
};

/* ==============================antd 弹层滚动锁镜像============================== */

// antd 弹层（Modal/Drawer/图片预览，经 @v-c/portal 挂 body 的弹层）打开时向 head 注入锁样式
// 标签（html body { overflow-y: hidden }）。body 的 overflow 已被 custom.css 的 !important
// 反杀为永不裁切（防塌缩跳顶），锁的实际锁定效果由这里镜像到 OS 视口通道补回。
// 检测读原始信号而非计算样式（计算值被反杀规则钉死为 visible，会失真）：标签形态按
// updateCSS 的 setAttribute('vc-util-key', key) 查裸属性 vc-util-key（无 data- 前缀）；
// 内联形态兜底读 body.style；观察器只充当触发时机（标签增删在 head childList 上）。
let bridgeInited = false;

const antdLockOn = () =>
    document.body.style.overflowY === 'hidden'
    || !!document.querySelector('style[vc-util-key^="vc-util-locker"]');

const mirrorAntdLock = () => {
    const locked = antdLockOn();
    if (locked === antdLockActive) return;
    antdLockActive = locked;
    applyViewportLock();
};

export const bridgeAntdScrollLock = () => {
    if (bridgeInited) return;
    bridgeInited = true;
    new MutationObserver(mirrorAntdLock).observe(document.body, {attributes: true, attributeFilter: ['style']});
    new MutationObserver(mirrorAntdLock).observe(document.head, {childList: true});
};

/* ==============================页签滚动位置记忆============================== */

// keep-alive 只缓存组件实例，视口滚动位置全局唯一、跨页签共享（OS 接管的是视口、滚动仍原生，
// 滚动容器即 window），切页签回来位置丢失。以路由 path（= view-tabs 页签身份键 routerPathKey）
// 为键记录各页签离开时的 scrollY：切回恢复、首次打开归顶；keep-alive 官方无滚动位置能力，
// 属应用层职责。Map 为模块级内存态、不持久化——刷新后 keep-alive 缓存也没了，记录无处附着，
// 随模块重置即「刷新后归顶」语义本身。
// 接线三处：setupScrollMemory（router/index.ts）记录；restorePageScroll（layout/content 过渡
// @enter——Vue 渲染器顺序 beforeEnter→insert→enter，且 mode=out-in 下新组件进场时旧组件已
// 移除，@before-enter 时文档只剩骨架（≈一屏高）、scrollTo 会被暂态高度钳到 0（「永远回顶」
// 踩坑实证）；@enter 在插入后同 flush 触发，keep-alive 缓存子树高度即时正确，恢复精确且先于
// 首帧绘制不可见）；clearScrollMemory（view-tabs cancelKeepAliveCache 汇拢点，关闭即清=重开归顶）。
// 边界：页面内部滚动容器随 keep-alive 整体缓存、位置天然保留，不经此节；:max 驱逐的冷组件
// 切回时重挂载+异步加载数据，恢复被暂态高度钳制（best effort，与缓存驱逐同语义）；同页
// query/hash 变化组件原位复用（keep-alive key=path），不记录不打扰。
const scrollMemory = new Map<string, number>();

export const setupScrollMemory = (router: Router): void => {
    // 浏览器后退/前进的默认滚动恢复（auto）与手动恢复叠加会二次跳动，统一交由本节管理
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    router.afterEach((to, from) => {
        // afterEach 时 DOM 尚未切换，scrollY 即离开页签的最终位置
        if (from.path && to.path !== from.path) {
            scrollMemory.set(from.path, window.scrollY);
        }
    });
};

/** 新页签进场前恢复其滚动位置（无记录=首次打开，归顶）；瞬时滚动不与进场动画纠缠 */
export const restorePageScroll = (path: string): void => {
    window.scrollTo(0, scrollMemory.get(path) ?? 0);
};

/** 页签关闭时清理对应记录；keys 为 routerPathKey 列表 */
export const clearScrollMemory = (keys: Array<string>): void => {
    keys.forEach(key => scrollMemory.delete(key));
};
