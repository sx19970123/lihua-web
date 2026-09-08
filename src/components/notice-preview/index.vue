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
        <div v-html="notice.content"/>
      </a-flex>
    </div>
  </a-spin>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from "vue";
import {preview, queryReadInfo} from "@/api/system/notice/notice.ts";
import UserShow from "@/components/user-show/index.vue"
import type {SysNoticeVO} from "@/api/system/notice/type/sys-notice.ts";
import dayjs from "dayjs";
import {message} from "@/antd-adapter";
import type {SysUser} from "@/api/system/user/type/sys-user.ts";

const props = defineProps<{
  noticeId: string,
  showReadUser?: boolean
}>()

// 加载中
const spinning = ref<boolean>(false)
// notice 对象
const notice = ref<SysNoticeVO>({})

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
        noticeId: props.noticeId,
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
  const noticeId = props.noticeId
  // 后端查询预览
  const resp = await preview(noticeId)
  if (resp.code === 200) {
    notice.value = resp.data
    spinning.value = false
  } else {
    message.error(resp.msg)
  }
}

onMounted(() => {
  handlePreview()
})

watch(() => props.noticeId, () => {
  readInfoLoaded = false
  handlePreview()
})
</script>
