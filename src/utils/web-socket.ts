import {getOnceToken} from "@/api/system/authentication/authentication.ts";
import {createBrowserId} from "@/utils/browser-id.ts";

// 连接
export const connect = async () => {
    await manager.connect()
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
    // 重试次数
    private retryNumber: number
    // 重试间隔基数
    private retryInterval: number = 2 * 1000
    // 重试间隔上限
    private maxRetryInterval: number = 60 * 1000
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
            try {
                const { code, data } = await getOnceToken()

                if (code !== 200 || !data) {
                    console.error("获取连接token失败")
                    // token 获取失败纳入退避重试，由指数间隔节流
                    this.reconnect()
                    return;
                }

                this.webSocket = new WebSocket(import.meta.env.VITE_APP_WS_API + '?token=' + data + '&clientId=' + await createBrowserId() + '&clientType=web');

                // 连接已建立
                this.webSocket.onopen = (event) => {
                    console.info('连接成功');
                    this.retryNumber = 0
                    this.enableRetry = true;
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
                // 网络异常纳入退避重试，后端发布期间的短暂不可达恢复后自动重连
                this.reconnect()
            }
        } else {
            console.log("当前websocket实例已存在")
        }
    }

    // 重试连接：指数退避（间隔随次数线性增长、封顶 maxRetryInterval），连接成功时 onopen 归零计数
    private reconnect = () => {
        this.retryNumber ++
        const interval = Math.min(this.retryNumber * this.retryInterval, this.maxRetryInterval)
        setTimeout(() => {
            // 登出等主动关闭后不再重连
            if (!this.enableRetry) {
                return
            }
            console.log("websocket 执行第" + this.retryNumber + "次重连")
            this.connect()
        }, interval)
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

    // 主动关闭连接
    public closeConnect = () => {
        this.enableRetry = false
        this.webSocket?.close(1000)
        this.webSocket = undefined
        this.listeners?.clear()
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