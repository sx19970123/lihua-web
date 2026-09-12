/** 统一上传响应 VO（单管线上传 / 秒传命中 / 分片合并 共用） */
export interface AttachmentUploadVO {
    /** 附件表主键（业务附件引用句柄） */
    id: string
    /** 对象键（公开内容如头像的引用句柄） */
    path: string
    /** 行级公开标记（写入即物化） */
    isPublic: boolean
    /** 首次访问链接：公开=永久链，私密=时效签名链 */
    url: string
    /** 原文件名 */
    originalName: string
    /** MIME 类型 */
    type: string
}

/** 秒传结果：uploaded=false 表示未命中（无该 md5 记录），命中时平铺 VO 字段 */
export interface FastUploadResultVO extends AttachmentUploadVO {
    uploaded: boolean
}
