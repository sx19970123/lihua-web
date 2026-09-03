import {computed, type ComputedRef} from "vue";
import {useDictStore} from "@/stores/dict.ts";
import {getDictDataOptionByCodeList} from "@/api/system/dict/dict-data.ts";
import type {SysDictDataType} from "@/api/system/dict/type/sys-dict-data-type.ts";
import {ResponseError, type ResponseType} from "@/api/global/type.ts";
import {message} from "@/antd-adapter";

// 进行中的字典拉取（按 code 去重，并发组件初始化同一字典只发一次请求）
const inflightFetch: Map<string, Promise<void>> = new Map()

// 拉取字典并写入 store；写入后所有经 initDict 消费的页面即时更新
const fetchDictIntoStore = async (codes: string[]) => {
    const dictStore = useDictStore()
    try {
        const resp: ResponseType<Record<string, SysDictDataType[]>> = await getDictDataOptionByCodeList(codes)
        if (resp.code === 200) {
            codes.forEach(code => {
                const dictOption = resp.data[code]
                if (dictOption) {
                    dictStore.setDict(code, dictOption)
                }
            })
        } else {
            message.error(resp.msg)
        }
    } catch (e) {
        if (e instanceof ResponseError) {
            message.error(e.msg)
        } else {
            console.error(e)
        }
    }
}

// 确保字典已加载：store 未命中的 code 合并为一次批量请求，与进行中的请求按 code 去重
const ensureDicts = (codes: string[]) => {
    const dictStore = useDictStore()
    const missing = codes.filter(code => !dictStore.hasDict(code) && !inflightFetch.has(code))
    if (missing.length === 0) {
        return
    }
    const promise = fetchDictIntoStore(missing).finally(() => missing.forEach(code => inflightFetch.delete(code)))
    missing.forEach(code => inflightFetch.set(code, promise))
}

// 初始化组件中需要的字典数据：返回 store 溯源的 computed 引用，store 更新即时反映到消费处
export const initDict = (...dictTypeCodes: string[]): Record<string, ComputedRef<SysDictDataType[]>> => {
    ensureDicts(dictTypeCodes)
    const dictStore = useDictStore()
    const result: Record<string, ComputedRef<SysDictDataType[]>> = {}
    dictTypeCodes.forEach(code => {
        result[code] = computed(() => dictStore.getDict(code))
    })
    return result
}

// 重新从后端拉取对应字典并更新 store（消费页经 computed 即时更新）
export const reLoadDict = (code: string) => {
    return fetchDictIntoStore([code])
}

// 根据 option 集合 和 value 获取字典 label
export const getDictLabel = (option: SysDictDataType[], value?: string) => {
  const target = option.find(dict => dict.value === value)
  return target ? target.label : value
}
