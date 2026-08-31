let isOverflowHidden = false;

// 隐藏滚动条
// 宽度不再做 calc 补偿：html 已设 scrollbar-gutter: stable，滚动条槽位常驻，
// 隐藏/恢复不会引起页面横向回流（旧的双向补偿会在恢复瞬间引发整页重排跳动）
export const hiddenOverflowY = () => {
    if (isOverflowHidden) return;
    if (hasScrollbar()) {
        document.body.style.overflowY = 'hidden';
        isOverflowHidden = true;
    }
};

// 显示滚动条
export const showOverflowY = () => {
    if (!isOverflowHidden) return;
    document.body.style.overflowY = '';
    isOverflowHidden = false;
};

// 判断是否出现滚动条
export const hasScrollbar = (): boolean => {
    return document.documentElement.scrollHeight > window.innerHeight;
};

// 强制关闭y轴滚动条
export const disableOverflowY = () => {
    document.documentElement.style.overflow = 'hidden'
}

// 启用y轴滚动条
export const enableOverflowY = () => {
    document.documentElement.style.overflow = ''
}

// 获取滚动条宽度
const getScrollbarWidth = (): number => {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.top = '-9999px';
    div.style.width = '100px';
    div.style.height = '100px';
    div.style.overflow = 'scroll';
    document.body.appendChild(div);
    const scrollbarWidth = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return scrollbarWidth;
};