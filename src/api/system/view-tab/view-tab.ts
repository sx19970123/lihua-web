import request from "@/utils/request.ts";
import type {StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts";

// 请求体 star/affix 为存储层标记位（'1'/'0'），函数签名收敛为 boolean、提交时转换（null/缺省同 false）
export const viewTab = (menuId:string , affix: boolean , star?: boolean | null) => {
 return request<StarViewType>({
     url: '/system/viewTab',
     method: 'post',
     data: {
         menuId: menuId,
         affix: affix ? '1' : '0',
         star: star ? '1' : '0'
     }
 })
}
