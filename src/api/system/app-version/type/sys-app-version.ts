export interface SysAppVersion {
    /**
     * 主键
     */
    id?: string;

    /**
     * 版本名称（与 manifest.json versionName 一致，如 1.2.0）
     */
    versionName?: string;

    /**
     * 版本序号（与 manifest.json versionCode 一致，整数，如 10200）
     */
    versionCode?: number;

    /**
     * 平台（android/ios）
     */
    platform?: string;

    /**
     * 主包地址（android=apk 附件 path 或 HTTP(S) 直链；ios=外部跳转链接）
     */
    downloadUrl?: string;

    /**
     * 是否支持 wgt 热更新（0 否 / 1 是，ios 恒为 0）
     */
    enableWgt?: string;

    /**
     * 热更新地址（仅 android，enable_wgt=1 时必填附件 path 或 HTTP(S) 直链）
     */
    wgtDownloadUrl?: string;

    /**
     * 更新说明（纯文本多行）
     */
    updateContent?: string;

    /**
     * 状态（0 草稿 / 1 已发布 / 2 已下线）
     */
    status?: string;

    /**
     * 发布时间
     */
    publishTime?: string;

    /**
     * 删除标识
     */
    delFlag?: string;
}

export interface SysAppVersionVO extends SysAppVersion {
    /**
     * App 检查更新时实际生效的下载地址（附件 path 已组装为公开附件下载相对链）
     */
    effectiveDownloadUrl?: string;

    /**
     * App 实际执行的更新方式：apk（整包）/ wgt（热更新）/ link（外部跳转，iOS）
     */
    effectiveType?: string;
}

export interface SysAppVersionDTO {
    /**
     * 版本名称（模糊查询）
     */
    versionName?: string;

    /**
     * 平台（精确查询）
     */
    platform?: string;

    /**
     * 状态（精确查询）
     */
    status?: string;

    /**
     * 当前页数
     */
    pageNum: number;

    /**
     * 每页记录数
     */
    pageSize: number;
}
