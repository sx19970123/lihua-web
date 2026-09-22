<template>
  <a-spin :spinning="spinning">
    <div class="m-ant-xl">
      <a-flex vertical :gap="32" align="center">
        <a-flex vertical align="center">
          <!--    标题-->
          <a-typography-title>{{notice.title}}</a-typography-title>
          <!--    发布时间-->
          <a-space>
            <a-tooltip title="发布用户">
              <a-typography-text type="secondary">{{notice.releaseUser}}</a-typography-text>
            </a-tooltip>
            <a-tooltip title="发布时间">
              <a-typography-text type="secondary" v-if="notice.status === '1'">{{dayjs(notice.releaseTime).format('YYYY-MM-DD HH:mm')}}</a-typography-text>
            </a-tooltip>
<!--            已读未读-->
            <a-popover placement="bottom" @open-change="handlePopoverOpen">
              <template #content>
                  <a-spin :spinning="readLoading || unreadLoading">
                    <div class="min-w-[250px] min-h-[120px]">
                      <a-flex v-if="readTotal > 0 || unreadTotal > 0">
                    <div v-if="readTotal > 0">
                      <a-flex :gap="8">
                        <a-typography-title :level="5">已读</a-typography-title>
                        <a-typography-text type="secondary">{{readTotal + '/' + (readTotal + unreadTotal)}}</a-typography-text>
                      </a-flex>
                      <div class="max-w-[250px] max-h-[400px] scrollbar">
                        <a-flex wrap="wrap">
                          <user-show v-for="user in readUserList" :avatar-json="user.avatar" :nickname="user.nickname"/>
                        </a-flex>
                      </div>
                      <a-flex align="center" justify="center" style="margin-top: var(--ant-margin-sm)">
                        <a-button type="link" class="w-full" @click="loadMoreRead" :loading="readLoading" :disabled="readUserList.length >= readTotal">
                          {{readUserList.length >= readTotal ? '没有更多' : '加载更多'}}
                        </a-button>
                      </a-flex>
                    </div>
                    <!-- height 内联保留：.ant-divider-vertical 有 0.9em 高度声明，与单类工具类同特异性会被 cssinjs 晚注入反杀 -->
                    <a-divider :vertical="true" style="height: auto" v-if="readTotal > 0 && unreadTotal > 0"/>
                    <div v-if="unreadTotal > 0">
                      <a-flex :gap="8">
                        <a-typography-title :level="5">未读</a-typography-title>
                        <a-typography-text type="secondary">{{unreadTotal + '/' + (readTotal + unreadTotal)}}</a-typography-text>
                      </a-flex>
                      <div class="max-w-[250px] max-h-[400px] scrollbar">
                        <a-flex wrap="wrap">
                          <user-show v-for="user in unreadUserList" :avatar-json="user.avatar" :nickname="user.nickname"/>
                        </a-flex>
                      </div>
                      <a-flex align="center" justify="center" style="margin-top: var(--ant-margin-sm)">
                        <a-button type="link" class="w-full" @click="loadMoreUnread" :loading="unreadLoading" :disabled="unreadUserList.length >= unreadTotal">
                          {{unreadUserList.length >= unreadTotal ? '没有更多' : '加载更多'}}
                        </a-button>
                      </a-flex>
                    </div>
                      </a-flex>
                      <a-empty v-else-if="!readLoading && !unreadLoading"/>
                    </div>
                  </a-spin>
              </template>
              <a-typography-text type="secondary" class="cursor-pointer" v-if="showReadUser && notice.status === '1'">
                <EyeOutlined />
              </a-typography-text>
            </a-popover>
          </a-space>
        </a-flex>
        <!--    文章内容-->
        <!--  notice-content：富文本宽度约束（见 style 块注释） -->
        <!--  v-html 前经 DOMPurify 白名单消毒（WR-6）：内容来源含外部粘贴，阻断存储型 XSS（token 在 localStorage 可被脚本窃取） -->
        <div class="notice-content" v-html="safeContent"/>
      </a-flex>
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import DOMPurify from "dompurify";
import {preview, queryReadInfo} from "@/api/system/notice/notice.ts";
import UserShow from "@/components/user-show/index.vue"
import type {SysNoticeVO} from "@/api/system/notice/type/sys-notice.ts";
import dayjs from "dayjs";
import {message} from "@/antd-adapter";
import type {SysUser} from "@/api/system/user/type/sys-user.ts";

const {noticeId, showReadUser} = defineProps<{
  noticeId: string,
  showReadUser?: boolean
}>()

// 加载中
const spinning = ref<boolean>(false)
// notice 对象
const notice = ref<SysNoticeVO>({})

// 富文本消毒：默认白名单覆盖编辑器常规产出（p/标题/列表/img/table/a/内联 style），剥 script/事件属性/javascript: 链接
const safeContent = computed(() => DOMPurify.sanitize(notice.value.content ?? ''))

// 已读未读用户分页大小
const READ_INFO_PAGE_SIZE = 20

// 已读/未读用户分页拉取工厂：一侧一套独立状态，「查看更多」翻页追加
const initReadInfo = (readFlag: '0' | '1') => {
  const userList = ref<SysUser[]>([])
  const total = ref<number>(0)
  const pageNum = ref<number>(1)
  const loading = ref<boolean>(false)

  const queryReadUser = async () => {
    loading.value = true
    try {
      const resp = await queryReadInfo({
        noticeId,
        readFlag: readFlag,
        pageNum: pageNum.value,
        pageSize: READ_INFO_PAGE_SIZE
      })
      if (resp.code === 200) {
        userList.value.push(...resp.data.records)
        total.value = resp.data.total
      } else {
        message.error(resp.msg)
      }
    } catch (e) {
      message.error("获取已读未读用户失败")
      console.error('获取已读未读用户出错:', e)
    } finally {
      loading.value = false
    }
  }

  // 重置并加载第一页
  const init = () => {
    userList.value = []
    total.value = 0
    pageNum.value = 1
    queryReadUser()
  }

  // 加载下一页
  const loadMore = () => {
    pageNum.value++
    queryReadUser()
  }

  return {userList, total, loading, init, loadMore}
}

const {userList: readUserList, total: readTotal, loading: readLoading, init: initRead, loadMore: loadMoreRead} = initReadInfo('1')
const {userList: unreadUserList, total: unreadTotal, loading: unreadLoading, init: initUnread, loadMore: loadMoreUnread} = initReadInfo('0')

// popover 首次打开才拉取已读未读，未点开眼睛图标则零请求
let readInfoLoaded = false
const handlePopoverOpen = (open: boolean) => {
  if (open && !readInfoLoaded) {
    readInfoLoaded = true
    initRead()
    initUnread()
  }
}

// 预览
const handlePreview = async () => {
  spinning.value = true
  try {
    // 后端查询预览
    const resp = await preview(noticeId)
    if (resp.code === 200) {
      notice.value = resp.data
    } else {
      message.error(resp.msg)
    }
  } finally {
    spinning.value = false
  }
}

onMounted(() => {
  handlePreview()
})

watch(() => noticeId, () => {
  readInfoLoaded = false
  handlePreview()
})
</script>

<style scoped>
/* 富文本内容宽度约束：从新闻站等外部源直接粘贴的内容常带固定宽 img/table 或内联 width，
   直出会撑破 960px modal 内容区（外层 a-flex 居中使子项宽度收缩，须 width:100% 撑满才能约束）；
   超宽表格保留横向滚动而非截断。本组件是公告预览两个 modal 入口的唯一渲染出口 */
.notice-content {
  width: 100%;
  overflow-x: auto;
  word-break: break-word;
}

.notice-content :deep(img),
.notice-content :deep(video) {
  max-width: 100%;
  height: auto;
}

.notice-content :deep(table) {
  max-width: 100%;
}
</style>
