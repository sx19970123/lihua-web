import axios, {AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig} from 'axios';
import token from "@/helpers/token.ts"
import {ResponseError, type ResponseType} from "@/api/global/type.ts"
import {useUserStore} from "@/stores/user";
import router from "@/router";
import {message} from "@/antd-adapter";
import {createWindowGuard} from "@/utils/window-guard.ts";
const { getToken } = token
// 当前正在进行的请求url集合
export const currentRequests = new Set<string>([]);

axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8'
axios.defaults.headers['Client-Type'] = 'web'
const service = axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_API,
    timeout: 50000
});


// 在途请求键：登记（请求拦截）与清理（响应成功/错误双出口）共用同一函数，保证键形态一致
const requestKey = (config?: InternalAxiosRequestConfig) => `${config?.method}:${config?.url}`

/**
 * 请求拦截器
 */
service.interceptors.request.use(config => {
    // 每次请求将 token 设置到请求头
    if (getToken()) {
        config.headers['Authorization'] = 'Bearer ' + getToken()
    }
    currentRequests.add(requestKey(config))
    return config;
}, error => {
    Promise.reject(error).then(r => {})
})

/**
 * 请求错误提示去重：同文案 3 秒窗内只提示一次，
 * 后端不可用时并发请求同时失败（文案相同）不会刷屏；窗口过后自动可再提示
 */
const errorNotifyGuard = createWindowGuard(3000)
const notifyRequestError = (msg: string) => {
    if (errorNotifyGuard(msg)) {
        message.error(msg)
    }
}

/**
 * 响应拦截器
 */
service.interceptors.response.use((resp) => {
    const data = resp.data
    const config = resp.config
    // 在途清理（成功出口）：错误出口对侧清理，请求无论成败终态必移除，防分片在途误判
    currentRequests.delete(requestKey(config))
    // token 失效或解析异常，清空用户信息返回登录
    if (data.code === 401) {
        const userStore = useUserStore()
        userStore.authenticationFailure(data.msg)
        throw new ResponseError(data.code, data.msg)
    }
    // 配置的非法ip访问
    if (data.code === 407) {
        router.push("/407")
        throw new ResponseError(data.code, data.msg)
    }
    return resp;
}, error => {
    // 在途清理（错误出口）：与成功出口共同覆盖所有终态，失败请求不残留
    currentRequests.delete(requestKey(error.config))
    if (error.response) {
        const {status, data} = error.response
        // 后端业务异常统一以 HTTP 200 + code 的 JSON 体返回，不走本分支；
        // 若错误体仍带 msg（非统一路径的防御，如个别过滤器直接写 500），优先透传
        if (data && typeof data === 'object' && typeof data.msg === 'string') {
            console.error(data.msg)
            notifyRequestError(data.msg)
            return Promise.reject(new ResponseError(data.code ?? status, data.msg))
        }
        // 其余为代理/网关/服务器层错误（响应体为 HTML 或空），统一提示避免误导，原文进控制台供排查；
        // 413 是唯一对用户有行动指引的状态码（上传体过大）
        const errMsg = status === 413 ? '请求体超过限制大小 (413)' : '服务暂时不可用，请稍后重试'
        console.error(`[HTTP ${status}]`, data)
        notifyRequestError(errMsg)
        return Promise.reject(new ResponseError(status, errMsg))
    } else {
        // 无响应（后端不可达/超时/DNS 等），axios 原始 message 为英文技术描述，转为通用提示
        const errMsg = error.code === AxiosError.ECONNABORTED ? '请求超时，请稍后重试' : '网络异常，请稍后重试'
        console.error(error);
        notifyRequestError(errMsg)
        return Promise.reject(new ResponseError(500, errMsg))
    }
})

/**
 * 二进制类型返回
 */
export const blobRequest = async (config: AxiosRequestConfig): Promise<Blob> => {
    config.responseType = 'blob';
    const res = await service.request(config);
    return res.data as Blob;
}

/**
 * 数据返回统一封装样式
 */
export default async function request<T>(config: AxiosRequestConfig): Promise<ResponseType<T>> {
    const res = await service.request<T>(config);
    return res.data as ResponseType<T>;
}
