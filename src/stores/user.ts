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
import {closeConnect} from "@/utils/web-socket.ts";
import {useDictStore} from "@/stores/dict.ts";
import {serializeThemeState, useThemeStore} from "@/stores/theme.ts";
import {debounce} from "lodash-es";
import router from "@/router";

import {createWindowGuard} from "@/utils/window-guard.ts";

// 认证失效联动（清用户态+跳转+提示）的单飞窗：token 过期时并发 401 只执行一次，窗口自动复位
const authFailureGuard = createWindowGuard(5000)

// 主题防抖同步（随登录会话挂接/登出拆除）：服务端为唯一事实源，主题变更后延迟合并同步，
// 避免拖动色板/圆角等连续调整的高频请求；登出不保存主题（clearUserInfo 拆除订阅并丢弃 pending），
// 防抖窗口内未发出的变更随之丢弃——主题为非关键数据，可接受
let themeSyncSubscribed = false
let debouncedThemeSync: ReturnType<typeof debounce> | undefined
let themeSyncUnsubscribe: (() => void) | undefined

export const useUserStore = defineStore('user', {
    state: () => {
        // 用户相关数据
        const userInfo: UserInfoType = {}
        const userId: string = ''
        const nickname: string = ''
        const username: string = ''
        const avatar: AvatarType = {}

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
        // 权限数据已变更标志（「数据更新」红点）：登录/数据更新重载后由 getInfo 重算，WS 推送在线即时置位
        const permissionUpdate: boolean = false
        return {
            userInfo,
            userId,
            nickname,
            username,
            avatar,
            roles,
            roleCodes,
            permissions,
            deptTrees,
            defaultDept,
            defaultDeptName,
            defaultDeptCode,
            posts,
            defaultDeptPosts,
            // 权限数据已变更标志（「数据更新」红点）：登录/数据更新重载后由 getInfo 重算，WS 推送在线即时置位
            permissionUpdate
        }
    },
    getters: {
        // 头像配置 JSON 串（user-avatar 单 json 参数消费；image 型 value 为后端下发相对链）
        avatarJson: (state) => JSON.stringify(state.avatar)
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

                        // 权限数据已变更标志（「数据更新」红点）：服务端会话版本比对结果
                        state.permissionUpdate = data.permissionUpdate ?? false

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
            themeSyncUnsubscribe = themeStore.$subscribe(() => debouncedThemeSync!())
        },
        // 拆除主题变更同步（clearUserInfo 登出时调用）：cancel 丢弃未到期的 pending（登出不保存主题），
        // 复位幂等标志供重登重新挂接
        unsubscribeThemeSync() {
            themeSyncUnsubscribe?.()
            themeSyncUnsubscribe = undefined
            debouncedThemeSync?.cancel()
            debouncedThemeSync = undefined
            themeSyncSubscribed = false
        },
        // 退出登录（不保存主题：登录期间防抖同步已即时持久化，clearUserInfo 拆除同步并丢弃 pending）
        async handleLogout() {
            // 关闭 websocket 连接
            try {
                closeConnect()
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
            router.push("/login")
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
            // 拆除主题变更同步：登出（主动退出/被动 401/守卫异常）后 resetState 与登录页切档
            // 只走本地，不再向服务端发保存请求（无 token 必 401）
            this.unsubscribeThemeSync()
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
                // 未登录直接静默跳过：无 token 的保存必 401
                if (!token.getToken()) {
                    resolve("未登录，跳过主题保存")
                    return
                }
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
        // 处理头像：image 型缺失对象键时回退默认头像（访问链解析在 user-avatar 内部完成）
        handleAvatar() {
            const avatar = this.$state.avatar
            if (avatar.type === 'image' && !avatar.value) {
                this.$state.avatar = this.getDefaultAvatar()
            }
        },
        // 默认头像（未设置头像/配置缺失时的昵称文字头像）
        getDefaultAvatar(nickname?: string): AvatarType {
            return {type: 'text', backgroundColor: 'rgb(191, 191, 191)', value: nickname ?? this.$state.nickname, url: ''}
        }
    }
})
