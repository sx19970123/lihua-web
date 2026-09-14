/**
 * 应用元信息：页面中系统显示名称与版本的唯一取值处，禁止各页面散落硬编码；
 * 版本的事实源为 package.json（构建时经 __APP_VERSION__ 注入，见 vite.config.ts 的 define）
 */
declare global {
    /** 构建时注入的 package.json version（vite.config.ts define） */
    const __APP_VERSION__: string
}

export default {
    /**
     * 系统版本
     */
    version: __APP_VERSION__,

    /**
     * 应用名称（全称，单独出现处：登录页标题、分享文案署名）
     */
    appName: '狸花猫后台管理系统',

    /**
     * 应用副名称（简称，嵌入语句处：欢迎语等；布局 logo 的英文名 Lihua Admin 为独立品牌形态，不在此管理）
     */
    appSubname: '狸花猫',
}
