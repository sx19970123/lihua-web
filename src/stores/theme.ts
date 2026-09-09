import {defineStore} from "pinia";
import {theme} from "antdv-next";
import {nextTick} from "vue";
import settings, {type ClickEffect, type ThemeMode} from "@/settings";
import {debounce} from "lodash-es";

/**
 * 主题持久化序列化：剔除运行时字段（窗口尺寸随缩放变化、小窗/服务端加载标记随宿主环境变化，均非用户配置），
 * 服务端保存与跨窗广播共用同一形态，保证字符串可直接比较；
 * 亮暗档位跨端解耦不序列化（themeMode/isDarkTheme）——档位唯一事实源是 localStorage['theme-mode']：
 * 服务端不存（换浏览器登录不带回暗色档，档位跟浏览器走不跟账号走），广播不传（同源窗口共享同一份 localStorage）
 */
export const serializeThemeState = (state: object): string => {
    return JSON.stringify(state, (key, value) => ['isSmallWindow', 'isMiniWindow', 'isServerLoad', 'themeMode', 'isDarkTheme'].includes(key) ? undefined : value)
}

// 跨窗主题同步（主窗与小窗画中画 iframe 同源）：BroadcastChannel 全量广播，
// 接收方经 init 重放（算法/html 属性/主题色全量落地）；接收期间的变更不回播，防消息回环
let broadcastSubscribed = false
let applyingRemote = false
let themeChannel: BroadcastChannel | undefined

export const useThemeStore = defineStore('theme',{
    state() {
        /**
         * 外观模式（配置态）：light / dark 手动指定，auto 跟随系统
         */
        const themeMode: ThemeMode = settings.themeMode

        /**
         * 当前明暗（实际态）：auto 时由系统偏好推导，手动时等于配置
         */
        const isDarkTheme: boolean = settings.isDarkTheme

        /**
         * 布局类型 side-navigation / mix-navigation / top-navigation
         */
        const layoutType: string = settings.layoutType

        /**
         * 组件大小 small/ middle / large
         */
        const componentSize: string = settings.componentSize

        /**
         * 菜单分组
         */
        const siderGroup: boolean = settings.siderGroup

        /**
         * 主要颜色
         * 组件中使用系统颜色不可直接取用该字段
         * 使用下面提供的getColorPrimary()方法进行获取
         */
        const colorPrimary: string = settings.themeConfig.token.colorPrimary

        /**
         * 通过ant提供的theme的主要颜色，针对暗色模式进行了颜色调整
         */
        const antColorPrimary: string = settings.themeConfig.token.colorPrimary

        /**
         * 界面圆角（同步进 themeConfig.token 生效，派生圆角 token 自动跟随）
         */
        const borderRadius: number = settings.themeConfig.token.borderRadius

        /**
         * 磨砂玻璃效果
         */
        const groundGlass: boolean = settings.groundGlass

        /**
         * 固定头部
         */
        const affixHead: boolean = settings.affixHead

        /**
         * 显示多窗口标签
         */
        const showViewTabs: boolean = settings.showViewTabs

        /**
         * 显示页脚
         */
        const showFooter: boolean = settings.showFooter

        /**
         * 侧边颜色 light / dark
          */
        const siderTheme: string = settings.siderTheme

        /**
         * 侧边宽度
         */
        const siderWith: number = settings.siderWith

        /**
         * 是否为小尺寸窗口
         */
        const isSmallWindow: boolean = false

        /**
         * 是否为画中画小窗（URL 携带 miniWindow=true 的 iframe 宿主）：
         * 运行时形态标记，小窗的无多任务栏/侧栏布局由消费层按此派生，不写入用户配置字段
         */
        const isMiniWindow: boolean = window.location.href.includes("miniWindow=true")

        /**
         * 原侧边宽度，用于调整侧边栏时保存临时变量
         */
        const originSiderWith: number = settings.originSiderWith

        /**
         * 切换路由时的过渡动画 zoom / fade / breathe / top / down / switch / trick
         */
        const routeTransition: string = settings.routeTransition

        /**
         * 点击效果 none / wave / inset / shake / happy
         */
        const clickEffect: ClickEffect = settings.clickEffect

        /**
         * 灰色模式
         */
        const grayModel: boolean = settings.grayModel

        /**
         * ant 主题配置
         */
        // 独立拷贝：state 与 settings 模块共享同一 themeConfig 引用的话，
        // token 上的任何修改（主题色/圆角）都会污染默认值，导致重置失效
        const themeConfig = { ...settings.themeConfig, token: { ...settings.themeConfig.token } }

        /**
         * 是否从服务端加载完毕
         * 系统主题默认从settings中读取默认值，用户登录后会从服务器获取用户定义的主题信息
         * 当获取到服务器主题后会将此属性设置为 true
         */
        const isServerLoad = false

        return {
            layoutType,
            componentSize,
            showViewTabs,
            showFooter,
            themeMode,
            isDarkTheme,
            colorPrimary,
            antColorPrimary,
            borderRadius,
            siderTheme,
            groundGlass,
            affixHead,
            isSmallWindow,
            isMiniWindow,
            siderGroup,
            siderWith,
            originSiderWith,
            routeTransition,
            clickEffect,
            grayModel,
            themeConfig,
            isServerLoad
        }
    },
    actions: {
        // 挂接跨窗主题同步（幂等，应用启动时调用）：变更经 100ms 防抖全量广播到其他窗口，接收方经 init 重放
        subscribeThemeBroadcast() {
            if (broadcastSubscribed) return
            broadcastSubscribed = true
            themeChannel = new BroadcastChannel('theme-sync')
            const debouncedBroadcast = debounce(() => {
                if (applyingRemote) return
                themeChannel?.postMessage(serializeThemeState(this.$state))
            }, 100)
            this.$subscribe(() => {
                if (applyingRemote) return
                debouncedBroadcast()
            })
            themeChannel.onmessage = (event: MessageEvent<string>) => {
                // 同值跳过：与本端当前一致的消息无需重放（第二道回环防线）
                if (event.data === serializeThemeState(this.$state)) return
                applyingRemote = true
                try {
                    this.init(event.data)
                } finally {
                    // $subscribe 为 pre-flush 异步回调：标志须延迟到本轮更新后才复位，
                    // 否则重放触发的回调见 false 会把同值再广播回去，形成两窗 ping-pong 回环，
                    // 旧值回声会覆盖用户刚做出的选择
                    nextTick(() => {
                        applyingRemote = false
                    })
                }
            }
        },
        // 初始化样式
        init(themeJson?: string) {
            this.initState(themeJson)
            // 亮暗档位只认 localStorage（跨端解耦）：initState 可能已被 JSON 中的同名键污染
            // （存量服务端主题仍含 themeMode），此处以 localStorage 现值覆盖回来——档位不随远端数据走
            this.$state.themeMode = localStorage.getItem('theme-mode') as ThemeMode ?? settings.themeMode
            // 旧版主题 JSON 的圆角只存于 token 内，回读后同步到顶层字段，保持字段与 token 一致
            this.$state.borderRadius = this.$state.themeConfig.token.borderRadius ?? settings.themeConfig.token.borderRadius
            this.applyThemeMode()
            this.changeGroundGlass()
            this.changeShowViewTabs()
            this.changeFooter()
            this.$state.isServerLoad = true
        },
        // 通过json数据初始化state
        initState(themeJson?: string) {
            if (!themeJson) {
                return
            }
            try {
                let state = JSON.parse(themeJson);
                for (let stateKey in state) {
                    for (let $stateKey in this.$state) {
                        if (stateKey === $stateKey) {
                            // 使用类型断言告诉 TypeScript $stateKey 是 $state 对象的一个键
                            (this.$state as any)[$stateKey] = state[stateKey];
                        }
                    }
                }
            } catch (e) {
                console.error('初始化主题失败，使用默认主题',e)
                return;
            }
        },
        // 切换外观模式（档位变更唯一入口）：写配置态并全量落地
        changeThemeMode(mode: ThemeMode, isSync?: boolean) {
            this.$state.themeMode = mode
            this.applyThemeMode(isSync)
        },
        // 由配置态推导实际态并落地：auto 读系统偏好，手动档直取配置；
        // 算法/导航色/html 属性/持久化都在此同步，不能依赖其他状态的间接联动
        applyThemeMode(isSync?: boolean) {
            this.$state.isDarkTheme = this.$state.themeMode === 'auto'
                ? window.matchMedia('(prefers-color-scheme: dark)').matches
                : this.$state.themeMode === 'dark'
            if (this.$state.isDarkTheme) {
                this.siderTheme = 'light'
                this.$state.themeConfig.algorithm = theme.darkAlgorithm
            }
            // 亮色模式下
            else {
                this.$state.themeConfig.algorithm = theme.defaultAlgorithm
            }
            // 主题色同源落地：--colorPrimary 供纯 CSS 消费，antColorPrimary state 供模板/JS 响应式消费；
            // data-theme 属性也由此调用统一设置
            this.changeDocumentElement(this.$state.themeConfig.token.colorPrimary)
            if (isSync !== true) {
                localStorage.setItem('theme-mode',this.$state.themeMode)
            }
        },
        // 显示多窗口页面（高度变量由 iframe/监控页的内容区高度公式消费）
        changeShowViewTabs() {
            document.documentElement.style.setProperty('--tab-display-height', this.$state.showViewTabs ? '54px' : '0px')
        },
        // 显示页脚（高度变量由 iframe 高度公式与内容区底 padding 融合公式消费）
        changeFooter() {
            document.documentElement.style.setProperty('--footer-display-height', this.$state.showFooter ? 'var(--footer-height)' : '0px')
        },
        // 修改导航宽度时同时修改原始值（取事件新值而非读绑定状态：change 可能先于 v-model 写回；仅用户拖动触发，编程式修改 siderWith 不经过此通道）
        changeSiderWidth(value: number) {
          this.$state.originSiderWith = value
        },
        // 切换主要颜色
        changeColorPrimary() {
            this.themeConfig.token.colorPrimary = this.$state.colorPrimary
            this.changeDocumentElement(this.$state.colorPrimary)
        },
        // 修改界面圆角：同步进主题 token，ConfigProvider 响应式生效
        changeBorderRadius() {
            this.$state.themeConfig.token.borderRadius = this.$state.borderRadius
        },
        // html节点添加glass属性
        changeGroundGlass() {
            if (this.$state.groundGlass) {
                document.documentElement.setAttribute("ground-glass",'enable')
            } else {
                document.documentElement.removeAttribute("ground-glass")
            }
        },
        // 修改html标签，标记当前颜色模式
        changeDocumentElement(colorPrimary: string) {
            document.documentElement.setAttribute("data-theme",this.$state.isDarkTheme ? 'dark' : 'light')
            // 清除 index.html 主题引导脚本的行内底色：data-theme 已就位，底色交还 variable.css 的
            document.documentElement.style.removeProperty("background-color")
            document.documentElement.style.setProperty("--colorPrimary", colorPrimary)
            // 同步 store state：--colorPrimary 供纯 CSS 消费，state 供模板/JS 响应式消费，两者同源于 useToken
            this.$state.antColorPrimary = colorPrimary
        },
        // 获取当前主要颜色
        getColorPrimary(): string {
            return this.$state.antColorPrimary || document.documentElement.style.getPropertyValue("--colorPrimary")
        },
        // 主题重置（grayModel 为管理员级全局配置（哀悼等场景全站置灰），不随用户主题重置）
        resetState() {
            this.$state.layoutType = settings.layoutType
            this.$state.componentSize = settings.componentSize
            this.$state.showViewTabs = settings.showViewTabs
            this.$state.themeMode = settings.themeMode
            this.$state.colorPrimary = settings.themeConfig.token.colorPrimary
            this.$state.borderRadius = settings.themeConfig.token.borderRadius
            this.$state.siderTheme = settings.siderTheme
            this.$state.groundGlass = settings.groundGlass
            this.$state.affixHead = settings.affixHead
            this.$state.siderWith = settings.siderWith
            this.$state.originSiderWith = settings.originSiderWith
            this.$state.routeTransition = settings.routeTransition
            this.$state.clickEffect = settings.clickEffect
            this.$state.themeConfig = { ...settings.themeConfig, token: { ...settings.themeConfig.token } }
            this.$state.siderGroup = settings.siderGroup
            this.applyThemeMode()
            this.changeGroundGlass()
            this.changeShowViewTabs()
            this.changeFooter()
        },
        // 折叠侧边栏
        foldSiderWidth()  {
            this.originSiderWith = this.siderWith
            this.siderWith = 80
        },
        // 展开侧边栏
        unfoldSiderWidth() {
            this.siderWith = this.originSiderWith
        },
        // 是否开启灰色模式
        enableGrayModel(enable?: boolean) {
            this.$state.grayModel = !!enable
            if (enable) {
                document.documentElement.setAttribute("gray-model", "enable")
            } else {
                document.documentElement.removeAttribute("gray-model")
            }
        }
    },
})
