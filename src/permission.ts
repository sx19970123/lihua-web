import router from "@/router/index";
import NProgress from "nprogress"
import 'nprogress/nprogress.css'
import {useUserStore} from "@/stores/user"
import {useThemeStore} from "@/stores/theme";
import token from "@/helpers/token.ts"
import userSetup from "@/helpers/user-setup.ts"
import {initApp} from "@/app-init.ts";
import {hasRouteRole} from "@/helpers/auth.ts";
import {closeConnect, connect} from "@/utils/web-socket.ts";

// 关闭右上角 spinner，只保留顶部进度条
NProgress.configure({showSpinner: false})

// 路由前置守卫（返回值风格：true 放行 / 目标位置重定向）
router.beforeEach(async (to, from) => {
    NProgress.start()
    const userStore = useUserStore()
    const themeStore = useThemeStore()
    const hasToken = token.getToken()
    if (hasToken) {
        try {
            // 判断是否已拉取用户信息
            if (!userStore.userInfo.id) {
                // initApp 与 websocket 连接互不依赖，并行执行缩短首屏等待
                const connectPromise = connect()
                // 拉取登录用户数据，并初始化 store
                await initApp();
                // 检查登录后信息是否完善
                const data = userSetup.getData()
                if (data && data.length > 0) {
                    return to.name === "Login" ? true : "/login"
                }
                // 连接到websocket
                await connectPromise
                // 判断用户是否拥有静态路由中指定的角色
                if (hasRouteRole(to?.meta?.role as string[])) {
                    // 已登录状态下，请求登录页面自动跳转到首页
                    return to.path === "/login" ? '/index' : { ...to, replace: true }
                }
                return "/403"
            }
            return hasRouteRole(to?.meta?.role as string[]) ? true : "/403"
        } catch (error) {
            console.error(error)
            // 关闭websocket连接
            closeConnect()
            // 清空用户信息
            userStore.clearUserInfo()
            // 重定向到登录页面
            return {name: "Login"}
        }
    } else {
        // 清空登录后信息
        userSetup.clearData()
        // 重置主题
        themeStore.resetState();
        // 关闭websocket连接
        closeConnect()
        if (to.meta && to.meta.allowAnonymous) {
            return true
        }
        return to.path !== "/login" ? {name: "Login"} : true
    }
});

// 路由后置守卫
router.afterEach((to,from) => { NProgress.done() })
