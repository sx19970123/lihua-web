<template>
  <div>
    <a-flex :gap="16" vertical>
<!--      检索条件-->
      <a-card :styles="{body: {'padding-bottom': '0'}}">
        <a-form :colon="false">
          <a-row :gutter="16">
            <a-col>
              <a-form-item label="公告标题">
                <a-input placeholder="请输入公告标题" v-model:value="noticeQuery.title" allow-clear/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="公告类型">
                <a-select placeholder="请选择" v-model:value="noticeQuery.type" allow-clear :options="sys_notice_type"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="公告状态">
                <a-select placeholder="请选择" v-model:value="noticeQuery.status" allow-clear :options="sys_notice_status"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item>
                <a-space size="small">
                  <a-button type="primary" @click="initPage" :loading="tableLoad">
                    <template #icon>
                      <SearchOutlined />
                    </template>
                    查 询
                  </a-button>
                  <a-button @click="reloadPage" :loading="tableLoad">
                    <template #icon>
                      <RedoOutlined />
                    </template>
                    重 置
                  </a-button>
                </a-space>
              </a-form-item>
            </a-col>
          </a-row>
        </a-form>
      </a-card>
<!--      列表-->
      <a-card :styles="{body: {padding: 0}}">
      <a-table :row-selection="noticeRowSelectionType"
               :data-source="noticeList"
               :columns="noticeColumn"
               row-class-name="hover-cursor-pointer"
               :on-row="handleRowClick"
               :pagination="false"
               :loading="tableLoad"
               row-key="id"
               :scroll="{x: 1500}"
      >
        <template #title>
          <a-flex :gap="8">
            <a-button type="primary" @click="handleModalStatus('新增通知公告')">
              <template #icon>
                <PlusOutlined />
              </template>
              新 增
            </a-button>
            <a-popconfirm title="删除后不可恢复，是否删除？"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleDelete(undefined)"
                          :open="openDeletePopconfirm"
                          @cancel="closePopconfirm"
                          @open-change="(open: boolean) => !open ? closePopconfirm(): ''"
            >
              <a-button danger @click="openPopconfirm">
                <template #icon>
                  <DeleteOutlined />
                </template>
                删 除
                <span v-if="selectedIds && selectedIds.length > 0" class="ml-ant-xxs"> {{selectedIds.length}} 项</span>
              </a-button>
            </a-popconfirm>
            <!--            表格设置-->
            <table-setting v-model="noticeColumn"/>
          </a-flex>
        </template>

        <template #bodyCell="{column,record,text}">
          <template v-if="column.key === 'title'">
            <a-tooltip>
              <template #title>
                {{text}}
              </template>
              <a-typography-link @click="(event:MouseEvent) => showPreview(event, record.id)">
                {{text}}
              </a-typography-link>
            </a-tooltip>
          </template>
          <template v-if="column.key === 'type'">
            <dict-tag :dict-data-option="sys_notice_type" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'status'">
            <dict-tag :dict-data-option="sys_notice_status" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'priority'">
            <dict-tag :dict-data-option="sys_notice_priority" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'userScope'">
            <dict-tag :dict-data-option="sys_notice_user_scope" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'createTime'">
            {{dayjs(text).format('YYYY-MM-DD HH:mm')}}
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="(event:MouseEvent) => selectById(event, record.id, record.status)">
              <template #icon>
                <EditOutlined />
              </template>
              编辑
            </a-button>
            <a-divider :vertical="true"/>
            <a-button type="link" size="small" v-if="record.status === '1'" @click="(event:MouseEvent) => handleRevoke(event, record.id)">
              <template #icon>
                <RollbackOutlined />
              </template>
              撤销
            </a-button>
            <a-button type="link" size="small" v-else @click="(event:MouseEvent) => handleRelease(event, record.id)">
              <template #icon>
                <SendOutlined />
              </template>
              发布
            </a-button>
            <a-divider :vertical="true"/>
            <a-popconfirm title="删除后不可恢复，是否删除？"
                          placement="bottomRight"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleDelete(record.id)"
            >
              <a-button type="link" size="small" danger @click="(event:MouseEvent) => event.stopPropagation()">
                <template #icon>
                  <DeleteOutlined />
                </template>
                删除
              </a-button>
            </a-popconfirm>
          </template>
        </template>
        <template #footer>
          <a-flex justify="flex-end">
            <a-pagination v-model:current="noticeQuery.pageNum"
                          v-model:page-size="noticeQuery.pageSize"
                          show-size-changer
                          :total="noticeTotal"
                          :show-total="(total:number) => `共 ${total} 条`"
                          @change="initPage"/>
          </a-flex>
        </template>
      </a-table>
      </a-card>
    </a-flex>
<!--    保存修改模态框-->
    <a-modal v-model:open="modalActive.open" :width="960" :confirm-loading="modalActive.saveLoading" @ok="saveNotice" destroy-on-hidden>
      <template #title>
        <div class="mb-ant-lg">
          <a-typography-title :level="4">{{modalActive.title}}</a-typography-title>
        </div>
      </template>
      <a-form :colon="false" ref="formRef" :rules="noticeRoles" :model="sysNoticeVO" :label-col="{span: 2}">
        <a-form-item label="公告标题" name="title" :wrapper-col="{span: 8}">
          <a-input v-model:value="sysNoticeVO.title" placeholder="请输入标题" :maxlength="80" show-count/>
        </a-form-item>
        <a-form-item label="优先级别" :wrapper-col="{span: 8}">
          <color-select v-model:value="sysNoticeVO.priority" :data-source="priorityOption"/>
        </a-form-item>
        <a-form-item label="公告类型">
          <a-radio-group v-model:value="sysNoticeVO.type">
            <a-radio v-for="item in sys_notice_type" :value="item.value">{{item.label}}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="用户范围" :wrapper-col="{span: 8}">
          <a-radio-group v-model:value="sysNoticeVO.userScope">
            <a-radio v-for="item in sys_notice_user_scope" :value="item.value">{{item.label}}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="指定用户" name="userIdList" :wrapper-col="{span: 8}" v-if="sysNoticeVO.userScope === '1'">
          <a-flex :gap="8">
            <a-tooltip>
              <template #title v-if="sysNoticeVO.userIdList && sysNoticeVO.userIdList?.length > 0">
                {{selectUserInfo}}
              </template>
              <!-- addonAfter 已弃用：Space.Compact 组合，计数块复刻原 addon 形态 -->
              <a-space-compact block>
                <a-input placeholder="请选择用户"
                         readonly
                         v-model:value="selectUserInfo"
                         class="flex-1"/>
                <span class="user-count-addon">{{ (sysNoticeVO.userIdList?.length ?? 0) + ' 人' }}</span>
              </a-space-compact>
            </a-tooltip>
            <a-popover trigger="click"
                         destroy-on-hidden
                         :styles="{container: {maxWidth: 'calc(100vw - 48px)', marginLeft: 'var(--ant-margin-lg)', marginRight: 'var(--ant-margin-lg)'}}"
                         :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
                <template #content>
                  <user-select :bordered="false"
                               :width="700"
                               :body-style="{padding: 'var(--ant-padding-xs)'}"
                               v-model:id="sysNoticeVO.userIdList"
                               @change="handleSelectUserInfo"
                  />
                </template>
                <a-button>
                  <template #icon>
                    <SearchOutlined />
                  </template>
                </a-button>
              </a-popover>
          </a-flex>
        </a-form-item>
        <a-form-item label="内容">
          <editor height="300px" v-model="sysNoticeVO.content" auto-download-paste-img/>
        </a-form-item>
      </a-form>
    </a-modal>
<!--    公告预览-->
    <a-modal v-model:open="previewModelOpen" :footer="false" :width="960" destroy-on-hidden>
      <notice-preview :notice-id="previewNoticeId" :show-read-user="true"/>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
import {initDict} from "@/helpers/dict.ts";
import {computed, reactive, ref, useTemplateRef} from "vue";
import type {SysNotice, SysNoticeDTO, SysNoticeVO} from "@/api/system/notice/type/sys-notice.ts";
import {deleteByIds, queryById, queryPage, release, revoke, save} from "@/api/system/notice/notice.ts";
import DictTag from "@/components/dict-tag/index.vue"
import {type FormInstance, message, type Rule, type TableColumnsType} from "@/antd-adapter";
import dayjs from "dayjs";
import Editor from "@/components/tinymce-editor/index.vue"
import ColorSelect from "@/components/color-select/index.vue"
import UserSelect from "@/components/user-select/index.vue"
import NoticePreview from "@/components/notice-preview/index.vue"
import type {SysUser} from "@/api/system/user/type/sys-user.ts";
import {getUserOptionByUserIds} from "@/api/system/user/user.ts";
import {type BaseModalActiveType} from "@/api/global/type.ts";
import TableSetting from "@/components/table-setting/index.vue";

const {sys_notice_type, sys_notice_status, sys_notice_user_scope, sys_notice_priority} = initDict("sys_notice_type", "sys_notice_status", "sys_notice_user_scope", "sys_notice_priority")
// 查询列表
const initSearch = () => {
  // 列表多选
  const selectedIds = ref<Array<string>>([])
  // selectedRowKeys 必须传真实数组：vnext 内部会展开迭代该字段，直接传 ref 会抛 not iterable
  const noticeRowSelectionType = computed(() => ({
    columnWidth: '55px',
    type: 'checkbox' as const,
    // 支持跨页勾选
    preserveSelectedRowKeys: true,
    // 指定选中id的数据集合，操作完后可手动清空
    selectedRowKeys: selectedIds.value,
    onChange: (ids: Array<string>) => {
      selectedIds.value = ids
    }
  }))
  // 处理选择
  const handleRowClick = (record: SysNotice) => {
    return {
      onClick: () => {
        if (record.id) {
          const selected = selectedIds.value
          if (selected.includes(record.id)) {
            selected.splice(selected.indexOf(record.id),1)
          } else {
            selected.push(record.id)
          }
        }
      }
    }
  }

  // 列
  const noticeColumn = ref<TableColumnsType>([
    {
      title: '公告标题',
      key: 'title',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '公告类型',
      key: 'type',
      dataIndex: 'type',
      align: 'center'
    },
    {
      title: '公告状态',
      key: 'status',
      dataIndex: 'status',
      align: 'center'
    },
    {
      title: '发送范围',
      key: 'userScope',
      dataIndex: 'userScope',
      align: 'center'
    },
    {
      title: '优先级别',
      key: 'priority',
      dataIndex: 'priority',
      align: 'center'
    },
    {
      title: '创建时间',
      key: 'createTime',
      dataIndex: 'createTime',
      align: 'center',
      width: 200
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      width: '264px',
      fixed: 'right'
    }
  ])

  // 查询条件
  const noticeQuery = ref<SysNoticeDTO>({
    pageNum: 1,
    pageSize: 10,
  })

  const noticeTotal = ref<number>()
  const noticeList = ref<Array<SysNotice>>([])
  const tableLoad = ref<boolean>(false)

  const handleQueryPage = async () => {
    noticeQuery.value.pageNum = 1
    await initPage()
  }

  const reloadPage = async () => {
    noticeQuery.value = {
      pageNum: 1,
      pageSize: 10
    }
    await initPage()
  }

  const initPage = async () => {
    tableLoad.value = true
    try {
      const resp = await queryPage(noticeQuery.value)
      if (resp.code === 200) {
        noticeList.value = resp.data.records
        noticeTotal.value = resp.data.total
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoad.value = false
    }
  }
  handleQueryPage()
  return {
    selectedIds,
    noticeRowSelectionType,
    noticeColumn,
    noticeQuery,
    noticeList,
    tableLoad,
    noticeTotal,
    handleRowClick,
    handleQueryPage,
    initPage,
    reloadPage,
  }
}
const {selectedIds, noticeRowSelectionType, noticeColumn, noticeQuery, noticeList, tableLoad, noticeTotal, handleRowClick, handleQueryPage, initPage, reloadPage} = initSearch()

// 表单保存
const initSave = () => {
  const formRef = useTemplateRef<FormInstance>("formRef")

  const modalActive = reactive<BaseModalActiveType>({
    open: false,
    saveLoading: false,
    title: ""
  })

  // 将优先级字典处理为 color-select 组件可以处理的数据类型
  const priorityOption = computed(() => sys_notice_priority.value.map(item => ({
    name: item.label ?? '',
    color: item.tagStyle ?? '',
    key: item.value
  })))

  // 选择用户范围描述
  const selectUserInfo = ref<string>('')

  // 处理显示已选择用户
  const handleSelectUserInfo = (userList: SysUser[]) => {
    const length = userList.length;
    if (length === 0) {
      selectUserInfo.value = ''
      return;
    }
    const nicknameList = userList.map(user => user.nickname);
    selectUserInfo.value = nicknameList.join("、") ;
  };

  const noticeRoles: Record<string, Rule[]> = {
    title: [
      {required: true, message: "请填写标题", trigger: "change"}
    ],
    userIdList: [
      {required: true, message: "请选择用户", trigger: "change"}
    ]
  }

  // notice表单对象
  const sysNoticeVO = ref<SysNoticeVO>({})

  // 处理模态框状态
  const handleModalStatus = (title?: string) => {
    modalActive.open = !modalActive.open
    if (title) {
      modalActive.title = title
    }
    // 重置表单
    sysNoticeVO.value = {
      type: '0',
      status: '0',
      priority: '2',
      userScope: '0',
      userIdList: [],
      content: ''
    }
    // 清空回显用户
    handleSelectUserInfo([])
  }

  // 保存消息通知
  const saveNotice = async () => {
    // 静默守卫：校验失败仅停留弹窗，不产生未处理 rejection
    const ok = await formRef.value?.validate().then(() => true).catch(() => false)
    if (!ok) {
      return
    }

    // 通知公告类型不同，显示不同的图标
    if (sysNoticeVO.value.type === '0') {
      sysNoticeVO.value.icon = 'MessageOutlined'
    } else {
      sysNoticeVO.value.icon = 'NotificationOutlined'
    }

    // 请求期锁 OK 按钮（confirm-loading），防连点重复公告
    modalActive.saveLoading = true
    try {
      const resp = await save(sysNoticeVO.value);
      if (resp.code === 200) {
        message.success(resp.msg)
        modalActive.open = false
        await initPage()
      } else {
        message.error(resp.msg)
      }
    } finally {
      modalActive.saveLoading = false
    }
  }

  // 根据id查询通知
  const selectById = async (event:MouseEvent, id: string, status: string) => {
    event.stopPropagation()
    if (status === '1') {
      message.error('已发布消息通知无法编辑')
      return
    }

    const resp = await queryById(id)
    if (resp.code === 200) {
      handleModalStatus("修改通知公告")
      sysNoticeVO.value = resp.data
      if (resp.data.userScope === '1') {
        const length = resp.data?.userIdList?.length
        if (length && length > 0) {
          const selectUserList = await getUserOptionByUserIds(resp.data.userIdList as string[])
          if (selectUserList.code === 200) {
            handleSelectUserInfo(selectUserList.data)
          } else {
            message.error(selectUserList.msg)
          }
        }
      }
    } else {
      message.error(resp.msg)
    }
  }
  return {
    modalActive,
    priorityOption,
    sysNoticeVO,
    selectUserInfo,
    formRef,
    noticeRoles,
    handleSelectUserInfo,
    handleModalStatus,
    saveNotice,
    selectById
  }
}
const {modalActive, priorityOption, sysNoticeVO, selectUserInfo, formRef, noticeRoles, handleSelectUserInfo, handleModalStatus, saveNotice, selectById} = initSave()

const initDelete = () => {
  // 显示删除提示
  const openDeletePopconfirm = ref<boolean>(false);
  // 打开删除提示框
  const openPopconfirm = () => {
    if (selectedIds.value && selectedIds.value.length > 0) {
      openDeletePopconfirm.value = true
    } else {
      message.warning("请勾选数据")
    }
  }
  // 关闭删除提示框
  const closePopconfirm = () => {
    openDeletePopconfirm.value = false
  }
  // 处理删除数据
  const handleDelete = async (id?: string) => {
    const deleteIds = id ? [id] : [...selectedIds.value];
    if (deleteIds.length > 0) {
      const resp = await deleteByIds(deleteIds)
      if (resp.code === 200) {
        message.success(resp.msg);
        // id 不存在则清空选中数据
        if (!id) {
          selectedIds.value = []
        } else {
          selectedIds.value = selectedIds.value.filter(item => item !== id)
        }
        await initPage()
        // 删空当前页时回退一页重查：停留原页码会是空页，回退而非回第一页（连续删除不用翻回来）
        if (noticeQuery.value.pageNum > 1 && noticeList.value.length === 0) {
          noticeQuery.value.pageNum--
          await initPage()
        }
      } else {
        message.error(resp.msg)
      }
    } else {
      message.warning("请勾选数据")
    }

  }

  return {
    openDeletePopconfirm,
    closePopconfirm,
    handleDelete,
    openPopconfirm
  }
}

const { openDeletePopconfirm,closePopconfirm,handleDelete,openPopconfirm } = initDelete()

// 初始化预览
const initPreview = () => {
  const previewModelOpen = ref<boolean>(false)
  const previewNoticeId = ref<string>('')

  const showPreview = async (event:MouseEvent, id: string) => {
    event.stopPropagation()
    previewNoticeId.value = id
    previewModelOpen.value = true
  }
  return {
    previewModelOpen,
    previewNoticeId,
    showPreview
  }
}

const { previewModelOpen, previewNoticeId, showPreview } = initPreview()

// 处理文章发布
const handleRelease = async (event:MouseEvent, id: string) => {
  event.stopPropagation()
  const resp = await release(id)
  if (resp.code === 200) {
    await initPage()
    message.success(resp.msg)
  } else {
    message.error(resp.msg)
  }
}

// 处理文章撤销
const handleRevoke = async (event:MouseEvent, id: string) => {
  event.stopPropagation()
  const resp = await revoke(id)
  if (resp.code === 200) {
    await initPage()
    message.success(resp.msg)
  } else {
    message.error(resp.msg)
  }
}


</script>
<style scoped>
/* 已选人数外挂块（addonAfter 弃用替代）：复刻原 addon 形态——灰底、连边框、贴右圆角 */
.user-count-addon {
  display: inline-flex;
  align-items: center;
  padding: 0 11px;
  white-space: nowrap;
  border: 1px solid var(--ant-color-border);
  border-left: none;
  border-radius: 0 var(--ant-border-radius) var(--ant-border-radius) 0;
  background: var(--ant-color-fill-tertiary);
}
</style>
