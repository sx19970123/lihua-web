/**
 * 应用元信息：系统中应用级名称、logo、版本与版权信息的唯一取值处，禁止各页面散落硬编码；
 * 版本的事实源为 package.json（构建时经 __APP_VERSION__ 注入，见 vite.config.ts 的 define）。
 * 唯一例外是 index.html（title/favicon 为首帧静态资源，不经过运行时）
 */
declare global {
    /** 构建时注入的 package.json version（vite.config.ts define） */
    const __APP_VERSION__: string
}

import logoMiao from '@/assets/logo/logo-miao.png'
import logoHei from '@/assets/logo/logo-hei.png'

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
     * 应用副名称（简称，嵌入语句处：欢迎语等）
     */
    appSubname: '狸花猫',

    /**
     * 应用英文名（布局 logo 旁的品牌标题与图片 alt）
     */
    appEnname: 'Lihua Admin',

    /**
     * 应用 logo（亮色模式 miao / 暗色模式 hei，徽章自带圆底直接展示）
     */
    appLogo: {
        light: logoMiao,
        dark: logoHei,
    },

    /**
     * 版权与站点信息（布局页脚文案；{{year}} 在消费组件内展开为当前年份）
     */
    copyright: '© 2024-{{year}} Yukino · MIT Licensed | lihua.xyz | doc.lihua.xyz',
}
