import request from "@/utils/request";

/**
 * 验证码类型选项
 */
export interface CaptchaTypeOption {
    /**
     * 类型值
     */
    value: string
    /**
     * 类型名称
     */
    name: string
}

/**
 * 获取验证码类型选项
 */
export const getCaptchaTypeOptions = () => {
    return request<CaptchaTypeOption[]>({
        url: "captcha/type/options",
        method: "GET"
    })
}
