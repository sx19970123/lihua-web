/**
 * antdv-next 消息代理层（3.0 迁移 · 任务 1.2 基础设施）
 *
 * 统一导出 message / notification / Modal 静态 API，供全项目消息调用收敛：
 * - vnext 静态 API 组件内外（模块级）直接可用，无需 App 包裹（附录 C.1②）；
 * - vnext 的 MessageInstance 无 warn 方法，而项目有 14 处 message.warn 调用 → 此处补 warn→warning 映射，调用点零改动；
 * - vnext message 返回值为销毁函数（非 antdv4 的 thenable 句柄），项目实测 0 处使用返回值，无适配需求（附录 C.1②）。
 * 类型统一从 ./types 提供（已 re-export，混合导入可直接使用 '@/antd-adapter' 单一入口）。
 */
import {message as antdMessage, notification, Modal} from 'antdv-next'

export const message: typeof antdMessage & { warn: typeof antdMessage.warning } = {
    ...antdMessage,
    warn: antdMessage.warning,
}

export {notification, Modal}
export * from './types'
