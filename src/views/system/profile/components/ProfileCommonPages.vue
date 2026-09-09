<template>
  <a-flex :gap="8" wrap="wrap">
    <!--  收藏的页面  -->
    <a-card class="common-page-card">
      <a-flex justify="space-between" align="center">
        <a-typography-title :level="5">收藏的页面（{{starList.length}}）</a-typography-title>
      </a-flex>
      <div class="scrollbar common-page-max-height">
        <selectable-card :data-source="starList"
                     item-key="routerPathKey"
                     :item-style="{width: '100%'}"
                     :gap="8"
                     empty-description="暂无收藏的页面，可在页签右键菜单收藏"
                     @click="handleRowClick"
        >
          <template #content="{item}">
            <a-flex justify="space-between" align="center">
              <a-flex :gap="8" align="center" class="min-w-0">
                <component :is="item.icon" v-if="item.icon"/>
                <a-typography-text ellipsis>{{item.label}}</a-typography-text>
              </a-flex>
              <a-tooltip title="取消收藏">
                <a-button type="text" size="small" :loading="pendingKey === item.menuId" @click.stop="handleCancel(item, 'star')">
                  <template #icon>
                    <StarFilled class="common-page-mark-icon"/>
                  </template>
                </a-button>
              </a-tooltip>
            </a-flex>
          </template>
        </selectable-card>
      </div>
    </a-card>
    <!--  固定的页面  -->
    <a-card class="common-page-card">
      <a-flex justify="space-between" align="center">
        <a-typography-title :level="5">固定的页面（{{affixList.length}}）</a-typography-title>
      </a-flex>
      <div class="scrollbar common-page-max-height">
        <selectable-card :data-source="affixList"
                     item-key="routerPathKey"
                     :item-style="{width: '100%'}"
                     :gap="8"
                     empty-description="暂无固定的页面，可在页签右键菜单固定"
                     @click="handleRowClick"
        >
          <template #content="{item}">
            <a-flex justify="space-between" align="center">
              <a-flex :gap="8" align="center" class="min-w-0">
                <component :is="item.icon" v-if="item.icon"/>
                <a-typography-text ellipsis>{{item.label}}</a-typography-text>
              </a-flex>
              <a-tooltip v-if="!item.static" title="取消固定">
                <a-button type="text" size="small" :loading="pendingKey === item.menuId" @click.stop="handleCancel(item, 'affix')">
                  <template #icon>
                    <PushpinFilled class="common-page-mark-icon"/>
                  </template>
                </a-button>
              </a-tooltip>
              <!-- 静态路由的固定来自路由定义（无 menuId，不落库），不可取消 -->
            </a-flex>
          </template>
        </selectable-card>
      </div>
    </a-card>
    <!--  历史记录  -->
    <a-card class="common-page-card">
      <a-flex justify="space-between" align="center">
        <a-typography-title :level="5">历史记录（{{recentData.length}}）</a-typography-title>
        <a-popconfirm v-if="recentData.length > 0" title="是否清空历史记录？" @confirm="handleClearRecent">
          <a-button type="link" danger size="small">
            <template #icon>
              <ClearOutlined/>
            </template>
            清空
          </a-button>
        </a-popconfirm>
      </a-flex>
      <div class="scrollbar common-page-max-height">
        <selectable-card :data-source="recentData"
                     item-key="path"
                     :item-style="{width: '100%'}"
                     :gap="8"
                     empty-description="暂无访问记录"
                     @click="handleRecentRowClick"
        >
          <template #content="{item}">
            <a-flex justify="space-between" align="center">
              <a-flex :gap="8" align="center" class="min-w-0">
                <component :is="item.icon" v-if="item.icon"/>
                <a-typography-text ellipsis>{{item.label}}</a-typography-text>
              </a-flex>
              <span class="common-page-time">{{handleTime(item.openTime)}}</span>
            </a-flex>
          </template>
        </selectable-card>
      </div>
    </a-card>
  </a-flex>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
import {useRouter} from "vue-router";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {viewTab} from "@/api/system/view-tab/view-tab.ts";
import {message} from "@/antd-adapter";
import {handleTime} from "@/utils/handle-date.ts";
import SelectableCard from "@/components/selectable-card/index.vue";
import type {StarViewType} from "@/api/system/view-tab/type/sys-view-tab.ts";

const viewTabsStore = useViewTabsStore()
const router = useRouter()

// 收藏/固定的页面（取消后不再属于常用页面，computed 过滤自动出列）
const starList = computed(() => viewTabsStore.totalViewTabs.filter(tab => tab.star))
const affixList = computed(() => viewTabsStore.totalViewTabs.filter(tab => tab.affix))

// 变更进行中的行（兼防连点）；初值空串——静态路由 tab 无 menuId，undefined 会与之恒等误触发 loading
const pendingKey = ref<string>('')

// 取消收藏/固定：目标侧置 false、另一侧保持现值提交，与页签右键操作同语义
const handleCancel = async (tab: StarViewType, field: 'star' | 'affix') => {
  if (!tab.menuId) return

  pendingKey.value = tab.menuId
  try {
    const affix = field === 'affix' ? false : !!tab.affix
    const star = field === 'star' ? false : !!tab.star
    const resp = await viewTab(tab.menuId, affix, star)
    if (resp.code === 200) {
      if (field === 'affix') {
        viewTabsStore.unAffix(resp.data)
      } else {
        viewTabsStore.replaceByKey(resp.data)
      }
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  } finally {
    pendingKey.value = ''
  }
}

// 跳转页面（query 为页签携带的序列化查询参数）
const handleSkip = (path: string, query?: string) => {
  if (query) {
    router.push({path: path, query: JSON.parse(query)})
  } else {
    router.push(path)
  }
}

// 行点击跳转（selectable-card 的 click 载荷为克隆行数据）
const handleRowClick = ({item}: {item: StarViewType}) => {
  handleSkip(item.routerPathKey, item.query)
}
const handleRecentRowClick = ({item}: {item: RecentType}) => {
  handleSkip(item.path)
}

// 历史记录（最近使用列表，localStorage 由路由切换维护、上限 50）
interface RecentType {
  path: string,
  icon?: string,
  label: string,
  openTime: string
}
const recentData = ref<RecentType[]>([])
const initRecent = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(viewTabsStore.$state.tabCacheKey) || '[]')
    if (Array.isArray(parsed)) {
      recentData.value = parsed
    }
  } catch {
    recentData.value = []
  }
}

// 清空历史记录（对齐页签菜单「清空最近使用」）
const handleClearRecent = () => {
  localStorage.removeItem(viewTabsStore.$state.tabCacheKey)
  recentData.value = []
}

initRecent()
</script>

<style scoped>
.common-page-card {
  flex: 1;
  min-width: 300px;
}

/* 列表满高：内容区可用高度（--content-height，variable.css 组合——头部块实测 + 页脚自适应）
   减本页家具（卡体 padding 24×2 + 卡头标题行约 40 + 滚动条余量） */
.common-page-max-height {
  max-height: calc(var(--content-height) - 96px);
}

/* 行尾时间与标记图标的收缩留白 */
.common-page-time {
  color: var(--ant-color-text-tertiary);
  font-size: var(--ant-font-size-sm);
  white-space: nowrap;
}

.common-page-mark-icon {
  color: var(--colorPrimary);
}
</style>
