import {defineStore} from "pinia";
import {logout} from "@/api/system/authentication/authentication.ts";
import {saveTheme, queryAuthInfo} from "@/api/system/profile/profile.ts";
import token from "@/helpers/token.ts";
import {message} from "@/antd-adapter";
import {ResponseError, type ResponseType} from "@/api/global/type.ts";
import type {AvatarType} from "@/api/system/profile/type/sys-profile.ts";
import type {AuthInfoType, UserInfoType} from "@/api/system/profile/type/auth-info-type.ts";
import type {SysRole} from "@/api/system/role/type/sys-role.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import type {SysPost} from "@/api/system/post/type/sys-post.ts";
import type {StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts";
import {closeConnect} from "@/utils/web-socket.ts";
import {useDictStore} from "@/stores/dict.ts";
import {serializeThemeState, useThemeStore} from "@/stores/theme.ts";
import {debounce} from "lodash-es";
import router from "@/router";
import {attachmentUrl, getTemporaryPath} from "@/utils/attachment-url.ts";
import {createWindowGuard} from "@/utils/window-guard.ts";

// 认证失效联动（清用户态+跳转+提示）的单飞窗：token 过期时并发 401 只执行一次，窗口自动复位
const authFailureGuard = createWindowGuard(5000)

// 主题防抖同步（幂等挂接）：服务端为唯一事实源，主题变更后延迟合并同步，
// 避免拖动色板/圆角等连续调整的高频请求；窗口内的兜底见 handleLogout 的 flush 与样式布局页卸载时的即时同步
let themeSyncSubscribed = false
let debouncedThemeSync: ReturnType<typeof debounce> | undefined

export const useUserStore = defineStore('user', {
    state: () => {
        // 用户相关数据
        const userInfo: UserInfoType = {}
        const userId: string = ''
        const nickname: string = ''
        const username: string = ''
        const avatar: AvatarType = {}

        // 用户收藏固定的菜单数据
        const viewTabs: StarViewType[] = []

        // 角色权限相关数据
        const roles: SysRole[] = []
        const roleCodes: string[] = []
        const permissions: string[] = []
        // 部门相关数据
        const deptTrees:SysDept[] = []
        const defaultDept: SysDept = {}
        const defaultDeptName: string = ''
        const defaultDeptCode: string = ''
        // 岗位相关数据
        const posts: SysPost[] = []
        const defaultDeptPosts: SysPost[] = []
        return {
            userInfo,
            userId,
            nickname,
            username,
            avatar,
            viewTabs,
            roles,
            roleCodes,
            permissions,
            deptTrees,
            defaultDept,
            defaultDeptName,
            defaultDeptCode,
            posts,
            defaultDeptPosts
        }
    },
    actions: {
        // 初始化用户信息
        initUserInfo ():Promise<ResponseType<AuthInfoType>> {
            return new Promise((resolve, reject) => {
                queryAuthInfo().then((resp) => {
                    if (resp.code === 200) {
                        const data = resp.data
                        const state = this.$state

                        // 用户相关赋值
                        state.userInfo = data.userInfo
                        state.userId = data.userInfo.id ? data.userInfo.id : ''
                        state.nickname = data.userInfo.nickname ? data.userInfo.nickname : ''
                        state.username = data.userInfo.username ? data.userInfo.username : ''
                        state.avatar = data.userInfo.avatar ? JSON.parse(data.userInfo.avatar) : this.getDefaultAvatar()

                        // 收藏固定菜单赋值
                        state.viewTabs = data.viewTabs

                        // 角色权限相关赋值
                        state.roles = data.roles
                        state.roleCodes = data.roles.filter(role => role.code).map(role => role.code) as string[]
                        state.permissions = data.permissions

                        // 部门相关赋值
                        state.deptTrees = data.depts
                        state.defaultDept = data.defaultDept
                        state.defaultDeptName = data.defaultDept.name ? data.defaultDept.name : ''
                        state.defaultDeptCode = data.defaultDept.code ? data.defaultDept.code : ''

                        // 岗位相关赋值
                        state.posts = data.posts
                        state.defaultDeptPosts = data.posts.filter(post => post.deptCode === state.defaultDeptCode)

                        // 处理头像
                        this.handleAvatar()
                        resolve(resp)
                    } else {
                        reject(new ResponseError(resp.code,resp.msg))
                    }
                }).catch(err => {
                    reject(err)
                })
            })
        },
        // 挂接主题变更防抖同步（幂等，initApp 登录后调用）
        subscribeThemeSync() {
            if (themeSyncSubscribed) return
            themeSyncSubscribed = true
            const themeStore = useThemeStore()
            debouncedThemeSync = debounce(() => {
                this.saveTheme(serializeThemeState(themeStore.$state)).catch(() => {})
            }, 800)
            themeStore.$subscribe(() => debouncedThemeSync!())
        },
        // 退出登录
        async handleLogout() {
            // 关闭 websocket 连接
            try {
                closeConnect()
                // 登出前冲刷防抖窗口内未发出的主题同步：清 token 后防抖与组件卸载的同步都会失败；
                // 无 pending 说明服务端已是最新（或本无变更），无需补发
                debouncedThemeSync?.flush()
                await logout()
            } finally {
                this.clearUserInfo()
            }
        },
        // 认证失效（窗口内重复触发直接忽略，见 authFailureGuard）
        authenticationFailure(msg: string) {
            if (!authFailureGuard('authentication-failure')) {
                return
            }
            this.clearUserInfo()
            router.push("/authentication")
            message.error(msg)
        },
        /**
         * 清空用户信息
         */
        clearUserInfo() {
            // 登出卫生：字典为全局公开数据，清理仅为不留会话残留（登录时 initApp 亦会清空）
            useDictStore().clearDict()
            const userState = this.$state

            // 用户相关赋值
            userState.userInfo = {}
            userState.userId = ''
            userState.nickname = ''
            userState.username = ''
            userState.avatar = this.getDefaultAvatar()

            // 收藏固定菜单赋值
            userState.viewTabs = []

            // 角色权限相关赋值
            userState.roles = []
            userState.roleCodes = []
            userState.permissions = []

            // 部门相关赋值
            userState.deptTrees = []
            userState.defaultDept = {}
            userState.defaultDeptName = ''
            userState.defaultDeptCode = ''

            // 岗位相关赋值
            userState.posts = []
            userState.defaultDeptPosts = []

            token.removeToken()
        },
        // 更新默认部门
        updateDefaultDept(defaultDept: SysDept) {
            const state = this.$state
            state.defaultDept = defaultDept
            state.defaultDeptName = defaultDept.name ? defaultDept.name : ''
            state.defaultDeptCode = defaultDept.code ? defaultDept.code : ''
            // 更新默认部门后更新部门下岗位
            state.defaultDeptPosts = state.posts.filter(post => post.deptCode === state.defaultDeptCode)
        },
        // 保存主题修改（服务端为唯一事实源，与已知服务端值相同则静默跳过；成功静默，失败由调用方提示）
        saveTheme(themeJson: string) {
            return new Promise((resolve, reject) => {
                if (themeJson !== this.userInfo.theme) {
                    saveTheme(themeJson).then(resp => {
                        if (resp.code === 200) {
                            this.userInfo.theme = themeJson
                            resolve(resp)
                        } else {
                            reject(resp.msg)
                        }
                    }).catch((error) => {
                        reject(error.msg)
                    })
                } else {
                    resolve("主题已保存")
                }
            })
        },
        // 处理头像
        async handleAvatar() {
            const avatar = this.$state.avatar
            if (avatar.type === 'image') {
                // 当头像类型为 image 但 image不存在时，赋值默认头像
                if (avatar.value) {
                    avatar.url = await getTemporaryPath(attachmentUrl(avatar.value))
                } else {
                    this.$state.avatar = this.getDefaultAvatar()
                }
            }
        },
        // 默认头像
        getDefaultAvatar() {
            return {type: 'text', backgroundColor: 'rgb(191, 191, 191)', value: this.$state.nickname, url: ''}
        }
    }
})
