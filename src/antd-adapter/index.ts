/**
 * antdv-next 统一出口
 *
 * message / notification / Modal 为上下文接线形式：这三个 API 的静态调用会 render 出
 * 独立的 Vue 实例，不经过应用根部的 ConfigProvider，主题算法（暗色/主色/组件尺寸）
 * 不生效；这里代理转发到 <a-app> 内部挂载的 hook 实例（处于 ConfigProvider 上下文中），
 * 应用挂载前或实例未暴露的成员回落原生静态实现。
 * 其余为纯 re-export，不做 API 兼容包装；类型统一从 ./types 提供。
 */
import {message as staticMessage, notification as staticNotification, Modal as staticModal} from 'antdv-next'

export * from './types'

// 组件值出口：Upload 带 LIST_IGNORE 静态属性（beforeUpload 拒收文件用）
export {Upload} from 'antdv-next'

// <a-app> 组件 ref 上暴露的三个上下文内实例
export type AppApi = {
    message: typeof staticMessage
    notification: typeof staticNotification
    modal: typeof staticModal
}

let appApi: AppApi | undefined

// 应用根组件挂载后调用一次，注入 <a-app> 暴露的实例
export const bindAppApi = (api: AppApi) => {
    appApi = api
}

// 以原生静态 API 为兜底原型做代理：已绑定时优先读上下文内实例的成员
const createFacade = <T extends object>(pick: (api: AppApi) => unknown, fallback: T): T =>
    new Proxy(fallback, {
        get: (target, prop) => {
            const source = (appApi && pick(appApi)) || target
            const value = (source as Record<PropertyKey, unknown>)[prop]
            return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(source) : value
        },
    }) as T

export const message = createFacade(api => api.message, staticMessage)
export const notification = createFacade(api => api.notification, staticNotification)
export const Modal = createFacade(api => api.modal, staticModal)
