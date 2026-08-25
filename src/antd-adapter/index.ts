/**
 * antdv-next 消息代理层（3.0 迁移 · 任务 1.2 基础设施）
 *
 * 统一导出 message / notification / Modal 静态 API，供全项目消息调用收敛：
 * - 仅做纯 re-export，不做任何旧组件库兼容包装（API 变动直接替换等价 API）；
 * - vnext 的 MessageInstance 无 warn 方法，项目原有 14 处 message.warn 调用随各单元迁移直接改为 message.warning；
 * - vnext message 返回值为销毁函数（非 antdv4 的 thenable 句柄），项目实测 0 处使用返回值，无适配需求（附录 C.1②）。
 * 类型统一从 ./types 提供（已 re-export，混合导入可直接使用 '@/antd-adapter' 单一入口）。
 */
export {message, notification, Modal} from 'antdv-next'
export * from './types'
