import {defineStore} from "pinia";
import type {SysDictDataType} from "@/api/system/dict/type/sys-dict-data-type.ts";


export const useDictStore = defineStore('dict', {
  state: () => {
    const dictMap: Map<string,Array<SysDictDataType>> = new Map();
    return {
      dictMap
    }
  },
  actions: {
    // 获取字典
    getDict(dictTypeCode: string): SysDictDataType[] {
      return this.$state.dictMap.get(dictTypeCode) ?? []
    },
    // 字典是否已加载（区分「未加载」与「已加载但无选项」）
    hasDict(dictTypeCode: string) {
      return this.$state.dictMap.has(dictTypeCode)
    },
    // 已加载的全部字典编码（刷新缓存时原地重载用）
    getDictCodes(): string[] {
      return Array.from(this.$state.dictMap.keys())
    },
    // 设置字典
    setDict(key: string, value: Array<SysDictDataType>) {
      this.$state.dictMap.set(key,value)
    },
    // 清空字典
    clearDict() {
      this.$state.dictMap.clear()
    }
  }
})
