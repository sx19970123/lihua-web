<template>
  <div>
    <a-dropdown :trigger="['contextmenu', 'click']"
                placement="bottom"
                v-model:open="open"
                @openChange="handleChangeNoticeList"
    >
    <template #popupRender>
      <a-card size="small" class="notice-card" :styles="{root: {'box-shadow': 'var(--ant-box-shadow-tertiary)'}}">
        <a-tabs :centered="true" :items="noticeTabs" @change="handleChangeTabs"/>
        <!--通知列表（a-list 已被 vnext 移除，改用 a-listy；列表项布局自行排版；查询中由 a-spin 遮罩）-->
        <a-flex vertical>
          <a-spin :spinning="loading">
            <a-listy v-if="userNoticeList.length > 0" :items="userNoticeList" :row-key="(item: SysUserNoticeVO) => item.noticeId" :height="400" :styles="{item: {borderBottom: 'none'}}" class="notice-list scrollbar">
              <template #itemRender="item">
                <a-flex :gap="16" align="center" :style="{cursor: 'pointer'}"
                        @click="readNoticeDetail(item.readFlag, item.noticeId)">
                  <!--                      图标-->
                  <a-badge :dot="item.readFlag === '0'">
                    <a-avatar :style="{'background-color': themeStore.getColorPrimary()}">
                      <component :is="item.icon"/>
                    </a-avatar>
                  </a-badge>
                  <!--                      中间体：上=标题+标星+优先级，下=发布人+时间-->
                  <a-flex vertical :flex="1">
                    <a-flex justify="space-between" align="center">
                      <!--                      标题-->
                      <a-tooltip :title="item.title" placement="bottom" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
                        <a-typography-text ellipsis :styles="{root: {width: '130px'}}">{{ item.title }}</a-typography-text>
                      </a-tooltip>
                      <!--                      标星 + 优先级-->
                      <a-flex gap="middle" align="center">
                        <a-rate :count="1"
                                v-model:value="item.starFlagNumber"
                                @click="(event:MouseEvent) => event.stopPropagation()"
                                @change="(value: number) => handleStar(item.noticeId, value)" />
                        <dict-tag :dict-data-option="sys_notice_priority" :dict-data-value="item.priority"/>
                      </a-flex>
                    </a-flex>
                    <!--                      发布人/发布时间：两端对齐-->
                    <a-flex justify="space-between" align="center">
                      <a-typography-text type="secondary" ellipsis>{{ item.releaseUser }}</a-typography-text>
                      <a-typography-text type="secondary">
                        {{handleTime(dayjs(item.releaseTime).format('YYYY-MM-DD HH:mm')) }}
                      </a-typography-text>
                    </a-flex>
                  </a-flex>
                </a-flex>
              </template>
            </a-listy>
            <!--                      空状态占位（查询中由外层 a-spin 遮罩；列表清空重查时只显示转圈）-->
            <a-empty v-else-if="!loading" description="暂无通知" class="notice-empty"/>
          </a-spin>
        </a-flex>
        <!--                      加载更多-->
        <a-flex v-if="userNoticeList.length > 0" align="center" justify="center">
          <a-button type="text" class="more-btn" @click="queryMore" :disabled="total === userNoticeList.length">
            {{total === userNoticeList.length ? '没有更多' : '加载更多'}}
          </a-button>
        </a-flex>
      </a-card>
      </template>
<!--                      通知公告主体-->
      <div @click="() => open = true">
        <a-badge :count="unReadCount" :offset="[-5,5]" style="color: #FFFFFF">
          <a-tooltip title="通知公告" placement="bottom" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
            <a-button type="text">
              <template #icon>
                  <BellOutlined class="icon-default-color"/>
              </template>
            </a-button>
          </a-tooltip>
        </a-badge>
      </div>
    </a-dropdown>
<!--                      详情dialog-->
    <a-modal v-model:open="previewModelOpen"
             :footer="false"
             :width="960"
             :destroy-on-hidden="true"
    >
      <notice-preview :notice-id="noticeId"/>
    </a-modal>
  </div>

</template>

<script setup lang="ts">
import {addEventListener, removeEventListener} from "@/utils/web-socket.ts";
import NoticePreview from "@/components/notice-preview/index.vue"
import DictTag from "@/components/dict-tag/index.vue"
import type {SysNotice, SysNoticeDTO} from "@/api/system/notice/type/sys-notice.ts";
import {Button} from "antdv-next";
import {message, notification} from "@/antd-adapter";
import {h, onMounted, onUnmounted, ref} from "vue";
import {MessageOutlined, NotificationOutlined, StarOutlined} from "@antdv-next/icons";
import {useThemeStore} from "@/stores/theme.ts";
import {getDictLabel, initDict} from "@/helpers/dict.ts";
import {queryUnReadCount, read, star, userMessageList} from "@/api/system/notice/notice.ts";
import type {SysUserNoticeVO} from "@/api/system/notice/type/sys-user-notice.ts";
import {handleTime} from "@/utils/handle-date.ts";
import dayjs from "dayjs";

const themeStore = useThemeStore();

// 通知类型 tab：label 用渲染函数保持「图标 + 文案」结构
const noticeTabs = [
  {key: 'ALL', label: () => h('span', null, [h(MessageOutlined), '全部通知'])},
  {key: 'STAR', label: () => h('span', null, [h(StarOutlined), '标星通知'])},
]

const previewModelOpen = ref<boolean>(false)
const {sys_notice_type, sys_notice_priority} = initDict("sys_notice_type", "sys_notice_priority")

// 未读计数
const unReadCount = ref<number>(0)
// 查询未读数量
const handleUnReadCount = async () => {
  const resp = await queryUnReadCount()
  if (resp.code === 200) {
    unReadCount.value = resp.data
  } else {
    message.error(resp.msg)
  }
}

const handleWebsocketMessage = (data: SysNotice) => {
  const {id, title, type} = data
  // 新未读消息计数 + 1
  handleUnReadCount()
  // 弹出消息通知
  notification.open({
    title: '您有一条新' + getDictLabel(sys_notice_type.value, type),
    description: title,
    actions: () => h( Button, {
      type: "text",
      size: "small",
      onClick: () => {
        if (id) {
          // 显示详情
          showNoticeDetail(id)
          // 关闭消息提醒
          notification.destroy(id)
          // 处理已读
          handleRead(id)
        }
      },
    }, {
      default: () => '查看详情'
    }),
    icon: () => h("0" === type ? MessageOutlined : NotificationOutlined, { style: 'color: ' + themeStore.getColorPrimary()}),
    key: id
  })
}

// 初始化列表查询
const initList = () => {
  const open = ref<boolean>(false)
  const loading = ref<boolean>(false)
  // notice 列表数据
  const userNoticeList = ref<SysUserNoticeVO[]>([])
  // 全部数量
  const total = ref<number>(0)

  // 分页查询
  const query = ref<SysNoticeDTO>({
    pageNum: 1,
    pageSize: 5,
  })

  // 处理展开关闭Notice
  const handleChangeNoticeList = (open: boolean) => {
    if (open) {
      query.value.pageNum = 1
      userNoticeList.value = []
      // 查询列表
      initNoticeList()
      // 查询未读数量
      handleUnReadCount()
    }
  }

  const queryMore = () => {
    query.value.pageNum++
    initNoticeList()
  }

  // 查询star
  const queryStar = () => {
    query.value.pageNum = 1
    query.value.star = '1'
    userNoticeList.value = []
    initNoticeList()
  }

  // 查询全部
  const queryAll = () => {
    query.value.pageNum = 1
    query.value.star = undefined
    userNoticeList.value = []
    initNoticeList()
  }

  // 切换tab时查询不同数据
  const handleChangeTabs = (key: string) => {
    switch (key) {
      case 'ALL': {
        queryAll()
        break
      }
      case 'STAR': {
        queryStar()
        break
      }
    }
  }

  // 查询列表
  const initNoticeList = async () => {
    loading.value = true
    try {
      const resp = await userMessageList(query.value)
      if (resp.code === 200) {
        total.value = resp.data.total
        resp.data.records.forEach(item => {
          // 处理标星回显
          if (item.starFlag) {
            item.starFlagNumber = Number.parseInt(item.starFlag)
          }
          // 向列表中push
          userNoticeList.value.push(item)
        })
      } else {
        message.error(resp.msg)
      }
    } finally {
      loading.value = false
    }
  }

  return {
    open,
    userNoticeList,
    total,
    loading,
    handleChangeTabs,
    handleChangeNoticeList,
    queryMore
  }
}
const {open, userNoticeList, total, loading, handleChangeTabs, handleChangeNoticeList, queryMore} = initList()

// 初始化notice详情所需数据
const initNoticeDetail = () => {
  const noticeId = ref<string>('')

  const readNoticeDetail = (readFlag: string, id: string) => {
    // 显示详情
    showNoticeDetail(id)
    // 处理已读
    if (readFlag === '0') {
      handleRead(id)
    }
  }

  // 显示消息详情
  const showNoticeDetail = (id: string) => {
    noticeId.value = id
    previewModelOpen.value = true
    open.value = false
  }

  return {
    noticeId,
    readNoticeDetail,
    showNoticeDetail
  }
}
const {noticeId, readNoticeDetail, showNoticeDetail} = initNoticeDetail()

// 处理标星
const handleStar = async (noticeId: string, value: number) => {
  const resp = await star(noticeId, value.toString())
  if (resp.code === 200) {
    message.success(resp.msg)
  } else {
    message.error(resp.msg)
  }
}
// 处理已读
const handleRead = (id: string) => {
  read(id).then(resp => {
    if (resp.code === 200) {
      handleUnReadCount()
    } else {
      message.error(resp.msg)
    }
  })
}

onMounted(() => {
  handleUnReadCount()
  addEventListener("WS_NOTICE", handleWebsocketMessage)
})

onUnmounted(() => {
  removeEventListener("WS_NOTICE")
})
</script>
<style scoped>
.notice-card {
  width: 340px;
  max-height: 500px;
}
.notice-empty {
  margin-block: var(--ant-margin);
}
.more-btn {
  width: 100%;
}
</style>
