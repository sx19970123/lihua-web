import request from "@/utils/request.ts";
import type {SysAttachment, SysAttachmentVO} from "@/api/system/attachment/type/sys-attachment.ts";
import type {AttachmentUploadVO, FastUploadResultVO} from "@/api/system/attachment/type/attachment-upload-vo.ts";

// 后端 entry 链接（/system/attachment/storage/download?...）加站点代理前缀，得到页面可直接访问的 URL
export const resolveAttachmentEntryUrl = (entryUrl: string) => `${import.meta.env.VITE_APP_BASE_API}${entryUrl}`

// 根据md5查询附件是否存在
export const existsAttachmentByMd5 = (md5: string) => {
    return request<boolean>({
        url: `system/attachment/storage/exists/${md5}`,
        method: "get",
    })
}

// 根据附件id批量查询信息，用于附件组件数据回显（url 字段为按行选链的访问链接）
export const queryAttachmentInfoByIds = (ids: string[]) => {
    return request<Array<SysAttachmentVO>>({
        url: "system/attachment/storage/info",
        method: "post",
        data: ids
    })
}

// 附件业务删除
export const deleteFromBusiness = (ids: string[]) => {
    return request({
        url: `system/attachment/storage/business`,
        method: "delete",
        data: ids
    })
}

/**
 * 单管线附件上传（统一返回 AttachmentUploadVO）
 * @param file 文件本体
 * @param options public 缺省 false（业务附件恒私密）；businessCode/businessName 业务标签
 */
export const uploadAttachment = (file: File, options?: {public?: boolean, businessCode?: string, businessName?: string}) => {
    const formData = new FormData();
    formData.append('file', file)
    if (options?.public) {
        formData.append('public', 'true')
    }
    if (options?.businessCode) {
        formData.append('businessCode', options.businessCode)
    }
    if (options?.businessName) {
        formData.append('businessName', options.businessName)
    }
    return request<AttachmentUploadVO>({
        url: "system/attachment/storage/upload",
        method: "post",
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

// 公开附件上传（公开内容内生场景：tinymce 插图、头像上传）
export const publicUpload = (file: File, businessCode: string) => {
    const formData = new FormData();
    formData.append('file', file)
    formData.append('businessCode', businessCode)
    return request<string>({
        url: "system/attachment/storage/public/upload",
        method: "post",
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

// 文件秒传（uploaded=false 表示未命中）
export const fastUpload = (data: SysAttachment) => {
    return request<FastUploadResultVO>({
        url: "system/attachment/storage/fast/upload",
        method: "post",
        data: data
    })
}

// 分片上传 URL 中标记附件 md5 的查询参数名（attachment-upload 组件判别同 md5 分片请求是否在途）
export const CHUNK_MD5_QUERY = "lh+attachment_md5="

// 开始分片上传（返回uploadId）
export const chunksUploadStart = (data: SysAttachment) => {
    return request<{uploadId: string, attachmentId: string}>({
        url: `system/attachment/storage/chunk/start`,
        method: "post",
        data: data
    })
}

// 通过 uploadId值获取已上传分片附件的索引值
export const chunksUploadedIndex = (uploadId: string) => {
    return request<number[]>({
        url: `system/attachment/storage/chunk/uploadedIndex/${uploadId}`,
        method: "get",
    })
}

// 分片文件上传
export const chunksUpload = (file: Blob, uploadId: string, md5: string, index: number, callback: (bytes: number) => void) => {
    const formData = new FormData();
    formData.append('file', file)

    return request({
        url: `system/attachment/storage/chunk/upload/${uploadId}/${index}?${CHUNK_MD5_QUERY}${md5}`,
        method: 'post',
        data: formData,
        headers: {
            'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
            callback(progressEvent.bytes)
        }
    })
}

// 分片合并（total 为总分片数；统一返回 AttachmentUploadVO）
export const chunksMerge = (data: Pick<SysAttachment, "originalName" | "md5" | "uploadId">, total: number) => {
    return request<AttachmentUploadVO>({
        url: `system/attachment/storage/chunk/merge/${total}`,
        method: 'post',
        data: data
    })
}
