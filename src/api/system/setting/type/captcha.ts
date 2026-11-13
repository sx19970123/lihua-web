export interface CaptchaClientSetting {
    /**
     * 是否启用
     */
    enable: boolean
    /**
     * 随机验证类型池（后端 CaptchaTypeEnum 的 value）
     */
    types: string[]
}

export interface Captcha {
    /**
     * Web 端配置
     */
    web: CaptchaClientSetting
    /**
     * App 端配置
     */
    app: CaptchaClientSetting
}
