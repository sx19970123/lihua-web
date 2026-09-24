import request from "@/utils/request.ts";
import type {PageResponseType} from "@/api/global/type.ts";
import type {SysAppVersion, SysAppVersionDTO} from "@/api/system/app-version/type/sys-app-version.ts";

/**
 * 分页查询版本发布记录
 * @param data
 */
export const queryPage = (data: SysAppVersionDTO) => {
    return request<PageResponseType<SysAppVersion>>({
        url: "system/app-version/page",
        data: data,
        method: "post",
    })
}

/**
 * 根据 主键查询版本详情
 * @param id
 */
export const queryById = (id: string) => {
    return request<SysAppVersion>({
        url: 'system/app-version/' + id,
        method: 'get'
    })
}

/**
 * 保存版本（新增/编辑共用，新建强制草稿）
 * @param data
 */
export const save = (data: SysAppVersion) => {
    return request<string>({
        url: 'system/app-version/save',
        data: data,
        method: 'post',
    })
}

/**
 * 发布版本（草稿/已下线 → 已发布）
 * @param id
 */
export const publish = (id: string) => {
    return request<string>({
        url: 'system/app-version/publish/' + id,
        method: 'post'
    })
}

/**
 * 下线版本（已发布 → 已下线）
 * @param id
 */
export const offline = (id: string) => {
    return request<string>({
        url: 'system/app-version/offline/' + id,
        method: 'post'
    })
}

/**
 * 根据id批量删除（已发布版本禁止删除）
 * @param ids
 */
export const deleteData = (ids: Array<string>) => {
    return request({
        url: 'system/app-version',
        data: ids,
        method: 'delete'
    })
}
