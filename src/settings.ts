import {theme, type ThemeConfig} from "antdv-next";

/**
 * 应用主题配置：token 恒有值且 colorPrimary / borderRadius 必填（运行时由 settings/store 保证），
 * 其余 token 按需覆盖
 */
export type AppThemeConfig = Omit<ThemeConfig, 'token'> & {
    token: { colorPrimary: string, borderRadius: number } & NonNullable<ThemeConfig['token']>
}

/**
 * 外观模式：light / dark 手动指定明暗，auto 跟随系统偏好
 */
export type ThemeMode = 'light' | 'dark' | 'auto'

/**
 * 点击效果：none 无 / wave 波纹（组件库默认）/ inset 扩散 / shake 抖动 / happy 快乐工作（@antdv-next/happy-work-theme 官方包）
 */
export type ClickEffect = 'none' | 'wave' | 'inset' | 'shake' | 'happy'

/**
 * 启动时持久化的外观模式（配置态）；缺省跟随系统
 */
const themeMode: ThemeMode = localStorage.getItem("theme-mode") as ThemeMode ?? 'auto'

/**
 * 系统信息配置
 */
export default {
    /**
     * 系统版本
     */
    version: "2.2.0",

    /**
     * 外观模式（配置态：用户意图）
     */
    themeMode,

    /**
     * 当前明暗（实际态：auto 时由系统偏好推导，手动时等于配置）
     */
    isDarkTheme: themeMode === 'auto'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : themeMode === 'dark',

    /**
     * 布局类型 side-navigation / mix-navigation / top-navigation
     */
    layoutType: 'side-navigation',

    /**
     * 组件大小 small / default / large
     */
    componentSize: 'default',

    /**
     * 菜单分组
     */
    siderGroup: false,

    /**
     * 主题颜色可选项
     */
    colorOptions: [
        {
            name: '拂晓蓝',
            color: 'rgb(22, 119, 255)',
        },
        {
            name: '薄暮',
            color: 'rgb(245, 34, 45)',
        },
        {
            name: '火山',
            color: 'rgb(250, 84, 28)',
        },
        {
            name: '日暮',
            color: 'rgb(250, 173, 20)',
        },
        {
            name: '明青',
            color: 'rgb(19, 194, 194)',
        },
        {
            name: '极光绿',
            color: 'rgb(82, 196, 26)',
        },
        {
            name: '极客蓝',
            color: 'rgb(47, 84, 235)',
        },
        {
            name: '酱紫',
            color: 'rgb(114, 46, 209)',
        }
    ],

    /**
     * 侧边栏背景颜色
     */
    siderBackgroundColor: 'rgba(255,255,255,1)',

    /**
     * 磨砂玻璃效果
     */
    groundGlass: true,

    /**
     * 固定头部
     */
    affixHead: true,

    /**
     * 显示多窗口标签
     */
    showViewTabs: true,

    /**
     * 是否显示页脚
     */
    showFooter: true,

    /**
     * 侧边颜色 light / dark
     */
    siderTheme: 'light',

    /**
     * 侧边宽度
     */
    siderWith: 200,

    /**
     * 原侧边宽度，用于调整侧边栏时保存临时变量
     */
    originSiderWith: 200,

    /**
     * 切换路由时的过渡动画 zoom / fade / breathe / top / down / switch / trick
     */
    routeTransition: 'zoom',

    /**
     * 点击效果 none / wave / inset / shake / happy（wave 为组件库默认波纹）
     */
    clickEffect: 'wave' as ClickEffect,

    /**
     * 点击效果可选项
     */
    clickEffectOptions: [
        {value: 'none', label: '无'},
        {value: 'wave', label: '波纹'},
        {value: 'shake', label: '抖动'},
        {value: 'inset', label: '扩散'},
        {value: 'happy', label: '快乐工作'}
    ],

    /**
     * 灰色模式
     */
    grayModel: false,

    /**
     * ant 主题配置
     */
    themeConfig: {
        token: {
            colorPrimary: 'rgb(22, 119, 255)',
            borderRadius: 6
        },
        algorithm: theme.defaultAlgorithm
    } as AppThemeConfig,

    /**
     * 触发菜单变化宽度
     * 视口宽度缩窄后，到达此宽度会触发菜单变化
     */
    menuToggleWidth: 768
}
