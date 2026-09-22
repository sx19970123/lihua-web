import {getOnceToken} from "@/api/system/authentication/authentication.ts";
import {createBrowserId} from "@/utils/browser-id.ts";
import {ref} from "vue";
import {message} from "@/antd-adapter";

// WebSocket 连接状态（头部状态图标的状态源；单色风格，形态区分状态）
export type WsStatus = 'connected' | 'reconnecting' | 'disconnected'
export const wsStatus = ref<WsStatus>('reconnecting')

// 连接
export const connect = async () => {
    await manager.connect()
}

// 手动重连（已断开时由状态图标触发：清零计数重启新一轮 3 次自动重试）
export const manualReconnect = () => {
    manager.manualReconnect()
}

// 关闭
export const closeConnect = () => {
    manager.closeConnect()
}

// 添加监听订阅
export const addEventListener = (type: string, callback: (data: any) => void) => {
    manager.addListener(type, callback)
}

// 删除监听订阅
export const removeEventListener = (type: string) => {
    manager.removeListener(type)
}

// 发送数据
export const sendMessage = (type: string, data: any): boolean => {
    return manager.sendMessage(type, data)
}

/**
 * webSocket连接具体实现逻辑
 */
class WebSocketManager {

    // websocket 实例
    private webSocket?: WebSocket;
    // 事件监听器
    private listeners?: Map<string, (data: any) => void>
    // 心跳
    private heartbeat?: ReturnType<typeof setInterval>
    // 重试次数（连上即清零；累计达上限后停止自动重连，等待再次登录或手动重连触发）
    private retryNumber: number
    // 重试间隔（固定）
    private readonly retryInterval: number = 2 * 1000
    // 自动重连次数上限
    private readonly maxRetryNumber: number = 3
    // 是否开启重连
    private enableRetry: boolean = true

    constructor() {
        this.listeners = new Map();
        this.retryNumber = 0
    }

    /**
     * 建立连接
     */
    public connect = async () => {
        if (!this.webSocket) {
            // 每次显式连接重置重连开关：登出 closeConnect 会置 false，若不复位，
            // 会话内再登录（首连失败走 onclose 非 1000 分支）时自动重连被残留的 false 永久禁用
            this.enableRetry = true
            wsStatus.value = 'reconnecting'
            try {
                const { code, data } = await getOnceToken()

                if (code !== 200 || !data) {
                    console.error("获取连接token失败")
                    this.reconnect()
                    return;
                }

                this.webSocket = new WebSocket(import.meta.env.VITE_APP_WS_API + '?token=' + data + '&clientId=' + await createBrowserId() + '&clientType=web');

                // 连接已建立
                this.webSocket.onopen = (event) => {
                    console.info('连接成功');
                    // 连上即成功：重试计数清零
                    this.retryNumber = 0
                    this.enableRetry = true;
                    wsStatus.value = 'connected'
                    this.startHeartbeat()
                }

                // 连接出错
                this.webSocket.onerror = (event) => {
                    console.error('连接错误:', event);
                }

                // 连接关闭
                this.webSocket.onclose = (event) => {
                    console.info('连接关闭:', event);
                    this.closeHeartbeat()
                    this.webSocket = undefined
                    // 连接关闭状态码不为1000为异常关闭，执行重试逻辑
                    if (event.code !== 1000 && this.enableRetry) {
                        this.reconnect()
                    }
                }

                // 接收消息
                this.webSocket.onmessage = (event) => {
                    this.receiveMessage(event)
                }
            } catch (e) {
                console.error("websocket连接失败",e)
                this.reconnect()
            }
        } else {
            console.log("当前websocket实例已存在")
        }
    }

    // 重试连接：固定间隔；累计 maxRetryNumber 次仍未连上则彻底停止自动重连
    private reconnect = () => {
        if (this.retryNumber >= this.maxRetryNumber) {
            wsStatus.value = 'disconnected'
            console.warn("WebSocket 重连失败已达上限，停止自动重连")
            return
        }
        this.retryNumber ++
        setTimeout(() => {
            // 登出等主动关闭后不再重连
            if (!this.enableRetry) {
                return
            }
            console.log("websocket 执行第" + this.retryNumber + "次重连")
            this.connect()
        }, this.retryInterval)
    }

    // 接收数据
    private receiveMessage = (event: MessageEvent) => {
        const data = event.data
        if (typeof data === "string") {
            try {
                // json转换为对象
                const webSocketMessage: WebSocketMessage = JSON.parse(data)
                // 从注册的事件中拿到对象
                const listener = this.listeners?.get(webSocketMessage.type)
                if (listener) {
                    listener(webSocketMessage.data)
                }
            } catch (error) {
                console.error("WebSocket消息处理失败，无法处理的消息格式", error);
            }
        } else {
            // 非文本消息
            console.error("WebSocket消息处理失败，无法处理的消息格式");
        }
    }

    // 开启心跳
    private startHeartbeat = () => {
        this.closeHeartbeat()
        this.heartbeat = setInterval(() => {
            if (this.isReady()) {
                this.sendMessage("WS_HEARTBEAT", "ping")
            }
        }, 1000 * 30)
    }

    // 关闭心跳
    private closeHeartbeat = () => {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
        }

        this.heartbeat = undefined
    }

    // websocket 是否准备就绪
    private isReady = (): boolean => {
        return this.webSocket?.readyState === 1
    }

    // 注册事件
    public addListener = (type: string, callback: (data: any) => void) => {
        if (!this.listeners) {
            this.listeners = new Map()
        }
        this.listeners.set(type, callback);
    }

    // 删除事件
    public removeListener = (type: string) => {
        this.listeners?.delete(type)
    }

    // 发送数据
    public sendMessage = (type: string, data: any): boolean => {
        if (!this.isReady()) {
            console.warn("WebSocket 未连接，消息发送失败")
            return false
        }
        try {
            const json = JSON.stringify({type, data, timestamp: new Date().getTime()})
            this.webSocket?.send(json)
            return true
        } catch (error) {
            console.error("WebSocket消息发送失败，无法处理的消息格式", error);
        }
        return false
    }

    // 手动重连：清零重试计数重启新一轮自动重连（连接在存时忽略）
    public manualReconnect = () => {
        if (this.webSocket) {
            return
        }
        this.enableRetry = true
        this.retryNumber = 0
        this.connect()
    }

    // 主动关闭连接
    public closeConnect = () => {
        this.enableRetry = false
        this.webSocket?.close(1000)
        this.webSocket = undefined
        this.listeners?.clear()
        // 重置重试计数，下次登录的连接从满额度开始
        this.retryNumber = 0
    }
}

/**
 * WebSocket 接收消息类型
 */
interface WebSocketMessage {
    type: string;
    // 后端推送的业务对象，结构随 type 而异（如 WS_NOTICE 为通知公告）
    data: any;
    timestamp: number;
}


const manager = new WebSocketManager()
