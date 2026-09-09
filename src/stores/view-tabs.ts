import {defineStore} from "pinia";
import Layout from "@/layout/index.vue";
import MiddleView from "@/components/middle-view/index.vue";
import Iframe from "@/components/iframe/index.vue";
import type {RecentType, StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts"
import dayjs from "dayjs";
import type {RouteLocationNormalizedLoaded} from "vue-router";
import {hasRouteRole} from "@/helpers/auth.ts"
import {cloneDeep, isEqual} from "lodash-es"
import {v4 as uuidv4} from "uuid";

export const useViewTabsStore = defineStore('viewTabs',{
    state: () => {
        // viewTab 标签页数组
        const viewTabs: Array<StarViewType> = []
        // 全部的viewTab
        const totalViewTabs: Array<StarViewType> = []
        // 缓存组件名集合
        const componentAlive: Array<string> = []
        // 当前标签页key
        const activeKey: string = ''
        // 最近使用缓存key
        const tabCacheKey: string = ''
        // 打开标签缓存key
        const viewTabsCacheKey: string = ''
        // layout中content组件key值，修改以重新加载组件
        const contentComponentKey: string = ''
        // 显示layout
        const showLayout: boolean = 'hide' !== localStorage.getItem("layout")
        return {
            viewTabs,
            totalViewTabs,
            activeKey,
            tabCacheKey,
            viewTabsCacheKey,
            componentAlive,
            contentComponentKey,
            showLayout
        }
    },
    actions: {
        /**
         * 数据初始化
         * @param viewTabVOList
         * @param staticRoutes
         */
        initTotalViewTabs(viewTabVOList: Array<StarViewType>, staticRoutes: readonly any[]): void {
            // 去除父级节点获取子路由组件
            const hasKeyRoutComponentList: Array<StarViewType> = []
            getStaticItem(staticRoutes,hasKeyRoutComponentList)
            // 根据定义的 viewTabSort 进行排序
            hasKeyRoutComponentList.sort((a, b) => {
                const num1 = a.viewTabSort ? a.viewTabSort : 99999
                const num2 = b.viewTabSort ? b.viewTabSort : 99999
                return  num2 - num1
            })
            // 生成viewTab对象
            hasKeyRoutComponentList.forEach(route => {
                viewTabVOList.unshift(route)
            })

            // 全量数据
            this.$state.totalViewTabs = viewTabVOList
            // 默认显示数据
            this.$state.viewTabs = this.$state.totalViewTabs.filter(tab => tab.affix)
            // 更新显示隐藏layout
            this.setShowLayoutVariable()
        },
        // 根据路由信息加载viewTag
        init(route: RouteLocationNormalizedLoaded) {
            let key = route.path
            let viewTab = route?.meta?.viewTab as boolean

            // 选中路由未进行viewTabs管理，activeKey置空
            if (!viewTab) {
                this.$state.activeKey = '';
                return;
            }

            // 获取viewTab数据
            let tab = this.getViewTabsByKey(key);
            const isExistingTab = !!tab;

            // 如果 tab 不存在，则从 totalTabs 中查找
            if (!tab) {
                tab = this.getTotalTabByKey(key);
            }

            // totalViewTabs 中查不到（菜单与路由数据不一致），按未纳入 viewTab 管理处理，避免空引用
            if (!tab) {
                console.warn(`viewTabs 中不存在的路由：${key}`)
                this.$state.activeKey = '';
                return;
            }

            // 处理param传参：以父路由的 viewTab 为模板
            if (Object.keys(route?.params).length > 0) {
                const matchedList = route.matched
                const parentTab = this.getTotalTabByKey(matchedList[matchedList.length - 1].path)
                if (!parentTab) {
                    console.warn(`viewTabs 中不存在的父路由：${matchedList[matchedList.length - 1].path}`)
                    this.$state.activeKey = '';
                    return;
                }
                tab = parentTab
                tab.routerPathKey = route.path
            }

            // 处理query传参
            if (Object.keys(route?.query).length > 0) {
                tab.query = JSON.stringify(route.query)
            }

            // 如果 tab 是新添加的，执行 addViewTab 操作
            if (!isExistingTab) {
                this.addViewTab(tab);
            }

            // 更新选中的 tab
            this.$state.activeKey = key;

            // 缓存数据
            handleAddTabCache(tab);
        },
        // 获取元素在数组中的索引值
        getIndex(key: string) {
            return this.$state.viewTabs.findIndex(tab => tab.routerPathKey === key)
        },
        // 根据key在total中获取tab对象
        getTotalTabByKey(key: string) {
            const index = this.$state.totalViewTabs.findIndex(tab => tab.routerPathKey === key)
            return cloneDeep(this.$state.totalViewTabs[index])
        },
        // 根据key在当前ViewTabs获取tab对象
        getViewTabsByKey(key: string) {
            const index = this.$state.viewTabs.findIndex(tab => tab.routerPathKey === key)
            return this.getTabByIndex(index)
        },
        // 根据索引获取元素
        getTabByIndex(index: number) {
            return this.$state.viewTabs[index]
        },
        // 打开标签持久化到 localStorage（刷新后由 restoreViewTabsFromCache 恢复）
        persistViewTabs() {
            if (this.$state.viewTabsCacheKey) {
                localStorage.setItem(this.$state.viewTabsCacheKey, JSON.stringify(this.$state.viewTabs.map(tab => tab.routerPathKey)))
            }
        },
        // 从 localStorage 恢复上次打开的标签：按缓存顺序重建，totalViewTabs 匹配不到的 key（权限变更/菜单删除）静默丢弃
        restoreViewTabsFromCache() {
            if (!this.$state.viewTabsCacheKey) {
                return
            }
            let cacheKeys: Array<string> = []
            try {
                const parsed = JSON.parse(localStorage.getItem(this.$state.viewTabsCacheKey) || '[]')
                if (Array.isArray(parsed)) {
                    cacheKeys = parsed
                }
            } catch {
                cacheKeys = []
            }
            // 固定标签兜底前置：缓存早于新固定的标签时补齐
            const affixKeys = this.$state.totalViewTabs.filter(tab => tab.affix).map(tab => tab.routerPathKey)
            const mergedKeys = [...affixKeys.filter(key => !cacheKeys.includes(key)), ...cacheKeys]
            const restored: Array<StarViewType> = []
            mergedKeys.forEach(key => {
                if (restored.some(tab => tab.routerPathKey === key)) {
                    return
                }
                // getTotalTabByKey 返回克隆，避免 viewTabs 与 totalViewTabs 共享引用
                const tab = this.getTotalTabByKey(key)
                if (tab) {
                    restored.push(tab)
                }
            })
            this.$state.viewTabs = restored
            // 回写过滤后的列表，被丢弃的 key 不再残留缓存
            this.persistViewTabs()
        },
        // 新开tab页
        addViewTab(tab: StarViewType) {
            this.$state.viewTabs.push(tab)
            this.persistViewTabs()
        },
        // 关闭tab页
        closeViewTab(key: string) {
            this.$state.viewTabs = this.$state.viewTabs.filter(viewTab => viewTab.routerPathKey !== key)
            this.persistViewTabs()
        },
        // 批量关闭tab页（右键菜单关闭左边/右边/其他/全部的提交口）
        closeViewTabs(keys: Array<string>) {
            this.$state.viewTabs = this.$state.viewTabs.filter(viewTab => !keys.includes(viewTab.routerPathKey))
            this.persistViewTabs()
        },
        // 同步 totalViewTabs 中的对应项（存在则替换、不存在则追加）；
        // 固定/取消固定只重排 viewTabs，total 侧状态须同步——常用页面/收藏列表消费 total
        syncTotalViewTab(tab: StarViewType) {
            const totalIndex = this.$state.totalViewTabs.findIndex(t => t.routerPathKey === tab.routerPathKey)
            if (totalIndex !== -1) {
                this.$state.totalViewTabs.splice(totalIndex, 1, tab)
            } else {
                this.$state.totalViewTabs.push(tab)
            }
        },
        // 传入tab元素，与集合中的元素进行替换
        replaceByKey(tab: StarViewType) {
            // 替换viewTabs（未打开的标签不在 viewTabs 中，无需替换）
            const index = this.$state.viewTabs.findIndex(t => t.routerPathKey === tab.routerPathKey)
            if (index !== -1) {
                this.$state.viewTabs.splice(index,1, tab)
            }
            this.syncTotalViewTab(tab)
        },
        // 添加固定，固定到前排
        affix(tab: StarViewType) {
            const targetIndex = this.$state.viewTabs.filter(t => t.affix).length
            const viewTabs = this.$state.viewTabs
            const index = viewTabs.findIndex(t => t.routerPathKey === tab.routerPathKey)
            if (index !== -1) {
                viewTabs.splice(index,1)
            }
            this.$state.viewTabs.splice(targetIndex,0,tab)
            this.syncTotalViewTab(tab)
            this.persistViewTabs()
        },
        // 取消固定，移动到最后
        unAffix(tab: StarViewType) {
            const viewTabs = this.$state.viewTabs
            const index = viewTabs.findIndex(t => t.routerPathKey === tab.routerPathKey)
            if (index !== -1) {
                viewTabs.splice(index,1)
            }
            viewTabs.splice(viewTabs.length,0,tab)
            this.syncTotalViewTab(tab)
            this.persistViewTabs()
        },
        // 移动元素
        move(fromIndex: number, toIndex: number) {
            const viewTabs = this.$state.viewTabs
            // 越界保护：splice 越界会取出 undefined 插回数组，污染整个列表
            if (fromIndex < 0 || fromIndex >= viewTabs.length || toIndex < 0) {
                return
            }
            const item = viewTabs.splice(fromIndex, 1)[0] // 取出元素
            viewTabs.splice(toIndex, 0, item)            // 插入到目标位置
            this.persistViewTabs()
        },
        // 设置缓存key：最近使用列表与打开标签列表
        setViewCacheKey(username:string): void {
            this.$state.tabCacheKey = 'recent-tabs-' + username
            this.$state.viewTabsCacheKey = 'cacheViewTabs-' + username
        },
        // 设置组件缓存
        setComponentsKeepAlive(name: string) {
            // 'index'（首页）常驻缓存；本方法随路由切换高频调用，两项都须去重防数组无限膨胀
            if (!this.$state.componentAlive.includes('index')) {
                this.$state.componentAlive.push('index')
            }
            if (!this.$state.componentAlive.includes(name)) {
                this.$state.componentAlive.push(name)
            }
        },
        // 删除组件缓存
        removeComponentsKeepAlive(name: string) {
            this.$state.componentAlive = this.$state.componentAlive.filter(item => item !== name)
        },
        // 清空组件缓存
        clearComponentsKeepAlive() {
            this.$state.componentAlive = []
        },
        // 重新生成 contentComponentKey
        regenerateComponentKey() {
            // 生成一个随机的 UUID
            this.$state.contentComponentKey = uuidv4();
        },
        // 修改显示layout后同步内容区头部高度变量（由 iframe/监控页的高度公式消费）
        setShowLayoutVariable () {
            document.documentElement.style.setProperty('--layout-display-height', 'hide' === localStorage.getItem("layout")  ? '0px' : 'var(--lihua-layout-height)')
        }
    }
})

/**
 * 获取page 或 link 节点的数据
 * @param staticRoutes
 * @param arr
 */
const getStaticItem = (staticRoutes: readonly any[], arr: Array<StarViewType>): void => {
    if (staticRoutes) {
        staticRoutes.forEach(route => {

            if (hasRouteRole(route?.meta?.role as string[]) && !isEqual(route.component, Layout) && !isEqual(route.component, MiddleView)) {
                const item: StarViewType = {
                    affix: route.meta?.affix,
                    icon: route.meta?.icon,
                    label: route.meta?.label,
                    link: route.meta?.link,
                    linkOpenType: route.meta?.linkOpenType,
                    viewTabSort: route.meta?.viewTabSort,
                    routerPathKey: route.path,
                    static: true
                }
                if (isEqual(route.component, Iframe)) {
                    item.menuType = 'link'
                } else {
                    item.menuType = 'page'
                }
                arr.push(item);
            }

            if (route.children && route.children.length > 0) {
                getStaticItem(route.children, arr);
            }
        });
    }
}

/**
 * 最近使用列表上限，防止 localStorage 随访问页面种类数无限增长
 */
const RECENT_TABS_LIMIT = 50

/**
 * 向 localStorage 中缓存
 * @param tab
 */
const handleAddTabCache = (tab: StarViewType) => {
    const viewTabStore =  useViewTabsStore()
    const recentTabs = localStorage.getItem(viewTabStore.$state.tabCacheKey)
    // 第一次新建缓存集合
    if (recentTabs === null || recentTabs === undefined) {
        localStorage.setItem(viewTabStore.$state.tabCacheKey ,JSON.stringify([
            {
                openTime: dayjs().format('YYYY-MM-DD HH:mm'),
                icon: tab.icon,
                label: tab.label,
                path: tab.routerPathKey
            }
        ]))
    } else {
        const hisArray: Array<RecentType> = JSON.parse(recentTabs)
        const index = hisArray.findIndex((his: RecentType) => his.path === tab.routerPathKey)
        // 删除已存在元素
        if (index !== -1) {
            hisArray.splice(index,1)
        }
        // 首插后存入缓存
        hisArray.unshift({
            openTime: dayjs().format('YYYY-MM-DD HH:mm'),
            icon: tab.icon,
            label: tab.label,
            path: tab.routerPathKey
        })
        // 超出上限截断
        if (hisArray.length > RECENT_TABS_LIMIT) {
            hisArray.length = RECENT_TABS_LIMIT
        }
        localStorage.setItem(viewTabStore.$state.tabCacheKey ,JSON.stringify(hisArray))
    }
}
