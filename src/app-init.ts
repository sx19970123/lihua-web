import router from "@/router";
import {useUserStore} from "@/stores/user.ts";
import {usePermissionStore} from "@/stores/permission.ts";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {serializeThemeState, useThemeStore} from "@/stores/theme.ts";
import {useDictStore} from "@/stores/dict.ts";
import {cloneDeep} from 'lodash-es'
import {reloadData} from "@/api/system/authentication/authentication.ts";
import {message} from "@/antd-adapter";
import {type RouteLocationNormalizedLoaded} from "vue-router";

/**
 * 初始化应用：本地缓存主题先行 → 用户信息 → 主题比对校准 → 动态路由 → 菜单 → viewTabs
 */
export const initApp = async (): Promise<void> => {
  const userStore = useUserStore()
  const permissionStore = usePermissionStore()
  const viewTabsStore = useViewTabsStore()
  const themeStore = useThemeStore()
  const dictStore = useDictStore()

  // 本地缓存先行：立即应用缓存主题，不等待用户信息网络往返
  const localTheme = localStorage.getItem('theme')
  const localPending = localStorage.getItem('theme-unsynced')
  if (localTheme) {
    themeStore.init(localTheme)
  }

  const resp = await userStore.initUserInfo()
  const metaRouterList = resp.data?.routers || []

  // 主题比对校准（菜单生成依赖主题状态，须在 initMenu 前完成）
  const serverTheme = userStore.$state.userInfo.theme
  if (localPending) {
    // 本地有未同步改动（如改动后直接刷新）：本地获胜，静默补传服务端，失败才提醒
    userStore.saveTheme(serializeThemeState(themeStore.$state)).catch((e: any) => {
      message.error(e?.msg ?? '主题同步失败')
    })
  } else if (!localTheme) {
    // 无本地缓存（首次访问/清缓存）：按服务端主题初始化并回写缓存
    themeStore.init(serverTheme)
    themeStore.syncLocalCache()
  } else if (serverTheme && serverTheme !== localStorage.getItem('theme')) {
    // 他设备已更新且本地无未同步改动：服务端获胜，重放并回写本地
    themeStore.init(serverTheme)
    themeStore.syncLocalCache()
    permissionStore.reloadMenu()
  }

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