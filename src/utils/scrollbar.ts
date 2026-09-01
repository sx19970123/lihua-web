let isOverflowHidden = false;

// 锁定页面滚动（弹层打开时隐藏 body 滚动条并禁止滚动）
// 干预最小化：不做宽度补偿、不做探针测量——滚动条隐藏/恢复时内容随槽位增减自然横移
// （跳动已接受，行为完全交浏览器默认）；antd 弹层自身的滚动锁是同款 overflow 切换，互不冲突
export const hiddenOverflowY = () => {
    if (isOverflowHidden) return;
    document.body.style.overflowY = 'hidden';
    isOverflowHidden = true;
};

// 恢复页面滚动（成对移除内联 overflow，交还浏览器默认行为）
export const showOverflowY = () => {
    if (!isOverflowHidden) return;
    document.body.style.overflowY = '';
    isOverflowHidden = false;
};
