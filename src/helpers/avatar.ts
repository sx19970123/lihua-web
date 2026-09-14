/**
 * 头像背景色契约：backgroundColor 持久化的是语义值——纯色（rgb()/rgba()/#hex）或 'auto'（跟随系统主题色）；
 * 渐变等展示形态只作为色卡 displayColor 渲染、不入库（历史渐变串持久化形态已废弃）
 */
export const AVATAR_AUTO_BACKGROUND = 'auto'

// 合法纯色域：rgb()/rgba()（含 alpha、逗号或空格分隔）与 3/6 位 hex
const PLAIN_COLOR_PATTERN = /^(rgba?\(\s*\d+[,\s]+\d+[,\s]+\d+[^)]*\)|#[0-9a-f]{3}|#[0-9a-f]{6})$/i

/**
 * 解析头像背景色为可渲染 CSS 值：auto 与非法值（含历史渐变串）→ 当前主题色；合法纯色 → 原值
 */
export const resolveAvatarBackgroundColor = (backgroundColor: string | undefined, colorPrimary: string): string => {
    if (backgroundColor === AVATAR_AUTO_BACKGROUND || !backgroundColor || !PLAIN_COLOR_PATTERN.test(backgroundColor)) {
        return colorPrimary
    }
    return backgroundColor
}
