<template>
  <div>
    <a-dropdown :trigger="['contextmenu', 'click']"
                placement="bottom"
                v-model:open="open"
                @openChange="handleChangeNoticeList"
    >
    <template #popupRender>
      <a-card size="small" class="w-[340px] max-h-[500px]" :styles="{root: {'box-shadow': 'var(--ant-box-shadow-tertiary)'}}">
        <a-tabs :centered="true" :items="noticeTabs" @change="handleChangeTabs"/>
        <!--通知列表（a-list 已被 vnext 移除，改用 a-listy；列表项布局自行排版；查询中由 a-spin 遮罩）-->
        <a-flex vertical>
          <a-spin :spinning="loading">
            <a-listy v-if="userNoticeList.length > 0" :items="userNoticeList" :row-key="(item: SysUserNoticeVO) => item.noticeId" :height="400" :styles="{item: {borderBottom: 'none'}}" class="notice-list scrollbar">
              <template #itemRender="item">
                <a-flex :gap="16" align="center" class="cursor-pointer"
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
                      <a-tooltip :title="item.title" placement="bottom">
                        <a-typography-text ellipsis :styles="{root: {width: '130px'}}">{{ item.title }}</a-typography-text>
                      </a-tooltip>
                      <!--                      标星 + 优先级-->
                      <a-flex gap="middle" align="center">
                        <a-rate :count="1"
                                v-model:value="item.starFlagNumber"
                                @click="(event:MouseEvent) => event.stopPropagation()"
                                @change="(value: number) => handleStar(item.noticeId, value)" />
                        <dict-tag :dict-data-option="sys_notice_priority" :dict-data-value="item.priority" variant="outlined"/>
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
            <a-empty v-else-if="!loading" description="暂无通知" class="my-ant-base"/>
          </a-spin>
        </a-flex>
        <!--                      加载更多-->
        <a-flex v-if="userNoticeList.length > 0" align="center" justify="center" style="margin-top: var(--ant-margin-sm)">
          <a-button type="link" class="w-full" @click="queryMore" :loading="loading" :disabled="total === userNoticeList.length">
            {{total === userNoticeList.length ? '没有更多' : '加载更多'}}
          </a-button>
        </a-flex>
      </a-card>
      </template>
<!--                      通知公告主体-->
      <div @click="() => open = true">
        <!-- 角标大小随主题组件大小联动（Badge 无 large 档，middle/large 均落 medium） -->
        <a-badge :count="unReadCount" :offset="[-5,8]" :size="themeStore.componentSize === 'small' ? 'small' : 'medium'" style="color: #FFFFFF">
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
  try {
    const resp = await queryUnReadCount()
    if (resp.code === 200) {
      unReadCount.value = resp.data
    } else {
      message.error(resp.msg)
    }
  } catch (e) {
    message.error("获取未读数失败")
    console.error('获取未读数出错:', e)
  }
}

const handleWebsocketMessage = (data: SysNotice) => {
  const {id, title, type} = data
  // 新未读消息计数 + 1
  handleUnReadCount()
  // 弹出消息通知（icon/actions 必须传 VNode：vnext 的 PureContent 把它们直接作为 children 渲染，
  // 不调用函数，传入渲染函数会被 String() 成源码文本）
  notification.open({
    title: '您有一条新' + getDictLabel(sys_notice_type.value, type),
    description: title,
    actions: h( Button, {
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
    icon: h("0" === type ? MessageOutlined : NotificationOutlined, { style: 'color: ' + themeStore.getColorPrimary()}),
    key: id
  })
}

// 下拉开关
const open = ref<boolean>(false)
// 列表查询中
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

// 列表视图代号：重置视图（打开下拉/切换 tab）时递增；在途请求的响应回来时代号已变，
// 说明视图已被后续操作重置，过期响应直接丢弃，避免旧数据 append 进新列表
let listViewSeq = 0

// 处理展开关闭Notice
const handleChangeNoticeList = (isOpen: boolean) => {
  if (isOpen) {
    listViewSeq++
    query.value.pageNum = 1
    userNoticeList.value = []
    // 查询列表
    initNoticeList()
    // 查询未读数量
    handleUnReadCount()
  }
}

const queryMore = () => {
  // 在途防连点：请求中再点会 pageNum 连加两次，两请求并发响应乱序 append
  if (loading.value) {
    return
  }
  query.value.pageNum++
  initNoticeList()
}

// 查询star
const queryStar = () => {
  listViewSeq++
  query.value.pageNum = 1
  query.value.star = '1'
  userNoticeList.value = []
  initNoticeList()
}

// 查询全部
const queryAll = () => {
  listViewSeq++
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
  const seq = listViewSeq
  loading.value = true
  try {
    const resp = await userMessageList(query.value)
    // 视图已被重置（重新打开/切换 tab），丢弃过期响应
    if (seq !== listViewSeq) {
      return
    }
    if (resp.code === 200) {
      total.value = resp.data.total
      resp.data.records.forEach(item => {
        // 处理标星回显
        item.starFlagNumber = Number(item.starFlag ?? 0)
        // 向列表中push
        userNoticeList.value.push(item)
      })
    } else {
      message.error(resp.msg)
    }
  } catch (e) {
    message.error("通知列表查询失败")
    console.error('查询通知列表出错:', e)
  } finally {
    if (seq === listViewSeq) {
      loading.value = false
    }
  }
}

// notice 详情 id
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

// 处理标星
const handleStar = async (noticeId: string, value: number) => {
  // 失败回滚：a-rate 的 v-model 已先把 starFlagNumber 翻转，请求失败需还原 UI 与服务端一致
  const rollbackStar = () => {
    const item = userNoticeList.value.find(item => item.noticeId === noticeId)
    if (item) {
      item.starFlagNumber = value === 1 ? 0 : 1
    }
  }
  try {
    const resp = await star(noticeId, value.toString())
    if (resp.code === 200) {
      message.success(resp.msg)
      // 标星视图下取消标星：该条已不满足 star 过滤条件，直接移出列表并同步总数
      if (value === 0 && query.value.star === '1') {
        userNoticeList.value = userNoticeList.value.filter(item => item.noticeId !== noticeId)
        total.value--
      }
    } else {
      message.error(resp.msg)
      rollbackStar()
    }
  } catch (e) {
    message.error("标星操作失败")
    rollbackStar()
    console.error('处理标星出错:', e)
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
  }).catch((e) => {
    message.error("标记已读失败")
    console.error('标记已读出错:', e)
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
