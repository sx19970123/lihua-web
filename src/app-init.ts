import router from "@/router";
import {useUserStore} from "@/stores/user.ts";
import {usePermissionStore} from "@/stores/permission.ts";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {useThemeStore} from "@/stores/theme.ts";
import {useDictStore} from "@/stores/dict.ts";
import {cloneDeep} from 'lodash-es'
import {reloadData} from "@/api/system/authentication/authentication.ts";
import {message} from "@/antd-adapter";
import {type RouteLocationNormalizedLoaded} from "vue-router";

/**
 * 初始化应用：用户信息 → 服务端主题（唯一事实源，无本地缓存）→ 动态路由 → 菜单 → viewTabs
 */
export const initApp = async (): Promise<void> => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const viewTabsStore = useViewTabsStore()
  const themeStore = useThemeStore()
  const dictStore = useDictStore()

  const resp = await userStore.initUserInfo()
  const metaRouterList = resp.data?.routers || []

  // 主题：服务端为唯一事实源，纯服务端初始化（页面渲染由路由守卫等待本函数，无需本地缓存防闪）
  themeStore.init(userStore.$state.userInfo.theme)
  // 挂接主题变更防抖同步（幂等）
  userStore.subscribeThemeSync()

  permissionStore.initDynamicRouter(metaRouterList)
  // siderMenuFilter 会原地过滤/标注传入的路由表，必须传副本防止污染真实路由表
  permissionStore.initMenu(metaRouterList, cloneDeep(router.options.routes) as any[])
  // getStaticItem 只读遍历，可直接使用真实路由表
  viewTabsStore.initTotalViewTabs(resp.data?.viewTabs || [], router.options.routes)
  // 设置最近使用组件的缓存key值
  viewTabsStore.setViewCacheKey(userStore.$state.username)
  // 恢复上次打开的标签：组件挂载前完成，标签栏直接以完整列表渲染
  viewTabsStore.restoreViewTabsFromCache()
  // 清空字典store
  dictStore.clearDict()
  // 清空组件keep-alive
  viewTabsStore.clearComponentsKeepAlive()
}

/**
 * 刷新应用
 * @param route 判断菜单权限
 */
export const refreshApp = async (route: RouteLocationNormalizedLoaded) => {
    const viewTabsStore = useViewTabsStore()
    const resp = await reloadData()

    if (resp.code !== 200) {
        message.error(resp.msg)
        return
    }

    // 重新加载应用
    await initApp()
    // 重新生成key
    viewTabsStore.regenerateComponentKey()
    // 校验当前菜单是否拥有权限
    const match = viewTabsStore.$state.totalViewTabs.some(tab => tab.routerPathKey === route.fullPath)
    if (match) {
        // 重新加载ViewTab
        viewTabsStore.init(route)
    } else {
        // 跳转到首页
        await router.push('/')
    }
}