export interface SysAttachment {
    /** 主键 */
    id?: string;
    /** 文件存储名 */
    storageName?: string;
    /** 文件原名称 */
    originalName?: string;
    /** 文件扩展名 */
    extensionName?: string;
    /** 文件保存路径 */
    path?: string;
    /** 分片上传id */
    uploadId?: string;
    /** 业务编码（默认文件上传时所在的路由名称） */
    businessCode?: string;
    /** 业务名称（默认文件上传时所在的菜单名称） */
    businessName?: string;
    /** 文件大小 */
    size?: string;
    /** 文件类型 */
    type?: string;
    /** 上传方式 */
    uploadMode?: string;
    /** 上传状态 上传成功、上传失败 */
    status?: string;
    /** 文件存储位置 如：本地、云存储等 */
    storageLocation?: string;
    /** md5 */
    md5?: string;
    /** 上传人id */
    createId?: string;
    /** 上传时间 */
    createTime?: Date;
    /** 删除标识 */
    delFlag?: string;
    /** 上传失败原因 */
    errorMsg?: string;
    /** 客户端类型 */
    clientType?: string;
    /** 行级公开标记（秒传/分片 start 请求体透传；键名对齐后端 DTO 的 JSON 契约 public——
     *  isPublic 是 Java 关键字变体，后端以手写 getPublic/setPublic 绑定，发 isPublic 会被静默丢弃） */
    public?: boolean;
}

export interface SysAttachmentDTO extends SysAttachment {

    /**
     * 创建时间集合
     */
    createTimeList?: Date[];

    /**
     * 当前页数
     */
    pageNum: number;

    /**
     * 每页记录数
     */
    pageSize: number;

}

export interface SysAttachmentVO extends SysAttachment {
    /**
     * 附件访问链接（按行选链：公开=永久链，私密=时效签名链；path 以同值链接形态下发）
     */
    url?: string;
}