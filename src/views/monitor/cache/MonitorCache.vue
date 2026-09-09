<template>
  <a-flex vertical :gap="8">
    <a-alert :message="'Redis 内存占用：' + useMemory" show-icon/>
    <a-flex :gap="8" wrap="wrap">
      <a-card class="cache-card">
        <a-typography-title :level="5">缓存类型</a-typography-title>
        <div class="scrollbar cache-monitor-max-content-height">
          <selectable-card :data-source="keyTypeList"
                       item-key="keyPrefix"
                       :item-style="{width: '100%'}"
                       :gap="8"
                       @select="handleChangeKeyTypeItem"
                       @unselect="handleClearKeyTypeItem"
          >
            <template #content="{item, index}">
              <a-flex justify="space-between">
                <a-typography-text ellipsis>
                  {{item.keyPrefix}}
                </a-typography-text>
                <a-typography-text ellipsis>
                  {{item.label}}
                </a-typography-text>
              </a-flex>
            </template>
          </selectable-card>
        </div>
      </a-card>
      <a-card class="cache-card">
        <a-flex justify="space-between">
          <a-typography-title :level="5">缓存键值（{{keys.length}}）</a-typography-title>
          <div>
            <a-tooltip v-if="targetKeyType" :title="'刷新' + targetKeyType.label + '键值列表'">
              <a-button type="link" :loading="loadingKeys" @click="loadKeyList(targetKeyType)">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </a-button>
            </a-tooltip>
            <a-tooltip  v-if="targetKeyType" :title="'清空' + targetKeyType.label + '键值列表'">
              <a-popconfirm :title="'是否清空' + targetKeyType.label + '全部键值？'" @confirm="removeCacheInfo(targetKeyType.keyPrefix)">
                <a-button type="link" danger :loading="removing">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  清空
                </a-button>
              </a-popconfirm>
            </a-tooltip>
          </div>
        </a-flex>
        <div class="scrollbar cache-monitor-max-content-height">
          <selectable-card :data-source="keys"
                       item-key="key"
                       :item-style="{width: '100%'}"
                       :gap="8"
                       @select="handleSelectKey"
                       @unselect="handleClearKey"
                      :loading="loadingKeys"
          >
            <template #content="{item, index}">
             <a-flex justify="space-between" align="center">
               <a-typography-text ellipsis>
                 {{item.key}}
               </a-typography-text>
               <a-popconfirm title="是否删除该缓存？" @confirm="removeCacheInfo(item.key)">
                 <a-button danger type="link" :loading="removing" @click="(event:MouseEvent) => event.stopPropagation()">
                   <template #icon>
                     <DeleteOutlined />
                   </template>
                 </a-button>
               </a-popconfirm>
             </a-flex>
            </template>
          </selectable-card>
        </div>
      </a-card>
      <a-card class="cache-card">
        <a-flex justify="space-between">
          <a-typography-title :level="5">缓存内容</a-typography-title>
          <div v-if="infoKey">
            <a-tooltip title="刷新缓存内容">
              <a-button size="middle" type="link" :loading="loadingInfo" @click="loadCacheInfo(infoKey)">
                <template #icon>
                  <ReloadOutlined />
                </template>
                刷新
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除缓存内容">
              <a-popconfirm title="是否删除该缓存内容？" @confirm="removeCacheInfo(infoKey)">
                <a-button type="link" danger :loading="removing">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </a-button>
              </a-popconfirm>
            </a-tooltip>
          </div>
        </a-flex>
        <a-spin :spinning="loadingInfo"  v-if="infoKey">
          <a-descriptions
              :column="1"
              bordered layout="vertical"
              size="small"
              class="scrollbar cache-monitor-max-content-height"
          >
            <a-descriptions-item label="缓存键值">
              {{infoKey}}
            </a-descriptions-item>
            <a-descriptions-item label="剩余有效时间">
              {{formatExpireMinutes(info?.expireMinutes)}}
            </a-descriptions-item>
            <a-descriptions-item label="缓存内容">
              {{info?.value}}
            </a-descriptions-item>
          </a-descriptions>
        </a-spin>

        <selectable-card
            :data-source="[]"
            :item-style="{width: '100%'}"
            item-key="key"
            emptyDescription="请选择缓存key"
            v-else
        />
      </a-card>
    </a-flex>
  </a-flex>
</template>

<script setup lang="ts">
import SelectableCard from "@/components/selectable-card/index.vue"
import {cacheInfo, cacheKeyGroups, cacheKeys, memoryInfo, remove} from "@/api/monitor/cache/cache.ts";
import {onMounted, ref} from "vue";
import {message} from "@/antd-adapter";
import type {CacheMonitor} from "@/api/monitor/cache/type/cache-monitor.ts";
// 内存占用大小
const useMemory = ref<string>('')
// 缓存类型集合
const keyTypeList = ref<CacheMonitor[]>([])
// 缓存键值集合
const keys = ref<{key: string}[]>([])
// 缓存内容
const info = ref<CacheMonitor>()
// 缓存内容对应的键值
const infoKey = ref<string>()
// 选中的缓存类型
const targetKeyType = ref<CacheMonitor>()
// 键值列表加载
const loadingKeys = ref<boolean>(false)
// 缓存内容加载
const loadingInfo = ref<boolean>(false)
// 删除进行中（清空整组/单key/内容删除三个入口共用，兼防连点重复提交）
const removing = ref<boolean>(false)

// 加载内存占用
const initMemoryInfo = async () => {
  const resp = await memoryInfo()
  if (resp.code === 200) {
    useMemory.value = resp.data + ' MB'
  } else {
    message.error(resp.msg)
  }
}

// 加载缓存类型
const initCacheKeyGroups = async () => {
  const resp = await cacheKeyGroups()
  if (resp.code === 200) {
    keyTypeList.value = resp.data
  } else {
    message.error(resp.msg)
  }
}

// 处理选中缓存类型
const handleChangeKeyTypeItem = async ({item}:{item: CacheMonitor}) => {
  await loadKeyList(item)
}

// 取消选中缓存类型时清空数据
const handleClearKeyTypeItem = () => {
  keys.value = []
  info.value = undefined
  infoKey.value = undefined
  targetKeyType.value = undefined
}

// 加载键值列表
const loadKeyList = async (item: CacheMonitor) => {
  loadingKeys.value = true
  // 查询缓存key
  try {
    const resp = await cacheKeys(item.keyPrefix)
    if (resp.code === 200) {
      info.value = undefined
      infoKey.value = undefined
      keys.value = []
      targetKeyType.value = item
      keys.value = resp.data.map(key => ({key: key}))
    } else {
      message.error(resp.msg)
    }
  } finally {
    loadingKeys.value = false
  }
}

// 处理选中缓存key
const handleSelectKey = async ({item}:{item: {key: string}}) => {
  infoKey.value = item.key
  // 加载缓存内容
  await loadCacheInfo(item.key)
}

// 取消选中缓存key时清空内容
const handleClearKey = () => {
  info.value = undefined
  infoKey.value = undefined
}

// 加载缓存内容
const loadCacheInfo = async (key: string) => {
  loadingInfo.value = true
  try {
    const resp = await cacheInfo(key)
    if (resp.code === 200) {
      info.value = resp.data
    } else {
      message.error(resp.msg)
    }
  } finally {
    loadingInfo.value = false
  }
}

// 过期时间展示：后端 remainTimeToLive 语义——-1 永不过期、-2 key 不存在（选中后恰好过期/被删）
const formatExpireMinutes = (expireMinutes?: number) => {
  if (expireMinutes == null) {
    return ''
  }
  if (expireMinutes === -1) {
    return '永久'
  }
  if (expireMinutes === -2) {
    return '已失效'
  }
  return expireMinutes + ' 分钟'
}

// 删除缓存
const removeCacheInfo = async (key: string) => {
  removing.value = true
  try {
    const resp = await remove(key);
    if (resp.code === 200) {
      message.success(resp.msg)
      if (targetKeyType.value) {
        await loadKeyList(targetKeyType.value)
      }
    } else {
      message.error(resp.msg)
    }
  } finally {
    removing.value = false
  }
}


onMounted(() => {
  initMemoryInfo()
  initCacheKeyGroups()
})
</script>
<style scoped>
.cache-card {
  flex: 1;
  min-width: 300px;
}
</style>
<style>
/* 头部与多任务栏的显示高度由 store 直写的 --layout-display-height/--tab-display-height 提供（variable.css 内置默认值） */
.cache-monitor-max-content-height {
  max-height: calc(100vh - (var(--layout-display-height) + var(--tab-display-height) + 156px));
}
</style>
