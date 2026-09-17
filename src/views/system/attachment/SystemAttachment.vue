<template>
  <div>
    <a-flex :gap="16" vertical>
      <!--      检索条件-->
      <a-card :styles="{body: {'padding-bottom': '0'}}">
        <a-form :colon="false">
          <a-row :gutter="16">
            <a-col>
              <a-form-item label="附件名称">
                <a-input placeholder="请输入附件名称" v-model:value="attachmentQuery.originalName" allowClear/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="所属模块">
                <a-input placeholder="请输入所属模块" v-model:value="attachmentQuery.businessName" allowClear/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="附件状态">
                <a-select placeholder="请选择附件状态" v-model:value="attachmentQuery.status" allowClear :options="sys_attachment_status"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="上传方式">
                <a-select placeholder="请选择上传方式" v-model:value="attachmentQuery.uploadMode" allowClear :options="sys_attachment_upload_mode"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="客户端类型">
                <a-select v-model:value="attachmentQuery.clientType" placeholder="请选择" style="width: 120px" allow-clear :options="sys_client_type"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="上传日期">
                <a-range-picker v-model:value="attachmentQuery.createTimeList" allowClear></a-range-picker>
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
      <a-table :pagination="false"
               :data-source="attachmentList"
               :row-selection="attachmentRowSelectionType"
               :on-row="handleRowClick"
               :columns="attachmentColumn"
               :loading="tableLoad"
               row-class-name="hover-cursor-pointer"
               row-key="id"
               :scroll="{x: 1500}">
        <template #title>
          <a-flex :gap="8">
            <a-popconfirm title="删除后不可恢复，是否删除？"
                          :open="openDeletePopconfirm"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleDelete(undefined)"
                          @cancel="closePopconfirm"
                          @open-change="(open: boolean) => !open ? closePopconfirm(): ''"
            >
              <a-button danger @click="openPopconfirm">
                <template #icon>
                  <DeleteOutlined />
                </template>
                删 除
                <span v-if="selectedIds && selectedIds.length > 0" style="margin-left: var(--ant-margin-xxs)"> {{selectedIds.length}} 项</span>
              </a-button>
            </a-popconfirm>
            <!--            表格设置-->
            <table-setting v-model="attachmentColumn"/>
          </a-flex>
        </template>
        <template #bodyCell="{column, record}">
          <template v-if="column.key === 'originalName'">
            <a-typography-link @click="(event: MouseEvent) => handleOpenInfoModal(event, record.id)">{{record[column.key]}}</a-typography-link>
          </template>
          <template v-if="column.key === 'size'">
            {{convertFileSize(record[column.key])}}
          </template>
          <template v-if="column.key === 'createTime'">
            {{record[column.key] ? dayjs(record[column.key]).format('YYYY-MM-DD HH:mm') : ''}}
          </template>
          <template v-if="column.key === 'status'">
            <dict-tag :dict-data-value="record[column.key]" :dict-data-option="sys_attachment_status"/>
          </template>
          <template v-if="column.key === 'uploadMode'">
            <dict-tag :dict-data-value="record[column.key]" :dict-data-option="sys_attachment_upload_mode"/>
          </template>
          <template v-if="column.key === 'clientType'">
            <dict-tag :dict-data-option="sys_client_type" :dict-data-value="record[column.key]"></dict-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="(event: MouseEvent) => handleDownload(event, record.id, record.status)">
              <template #icon>
                <CloudDownloadOutlined />
              </template>
              下载
            </a-button>
            <a-divider type="vertical"/>
            <a-button type="link" size="small" @click="(event: MouseEvent) => handleShowShareModal(event, record.id, record.originalName, record.status)">
              <template #icon>
                <ShareAltOutlined />
              </template>
              分享
            </a-button>
            <a-divider type="vertical"/>
            <a-dropdown :open="openMoreMenuId === record.id"
                        @open-change="(open: boolean) => handleMoreMenuOpenChange(open, record.id)">
              <a class="ant-dropdown-link" @click="(event: MouseEvent) => event.stopPropagation()">
                <DownOutlined />
                更多
              </a>
              <template #popupRender>
                <a-menu>
                  <a-menu-item>
                    <a-popconfirm title="删除后不可恢复，是否删除？"
                                  placement="topRight"
                                  ok-text="确 定"
                                  cancel-text="取 消"
                                  @confirm="handleDelete(record.id)"
                                  @open-change="handleMenuConfirmOpenChange"
                    >
                      <a-button type="link" size="small" danger @click="(event:MouseEvent) => event.stopPropagation()">
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                        删除附件
                      </a-button>
                    </a-popconfirm>
                  </a-menu-item>
                  <a-menu-item>
                    <a-popconfirm placement="bottomRight"
                                  :ok-text="countdown ? '确 认 ' + countdown : '确 认'"
                                  :okButtonProps="{disabled: countdown !== 0}"
                                  cancel-text="取 消"
                                  @confirm="handleForceDelete(record.id)"
                                  @open-change="handleForceDeletePopconfirmOpenChange"
                    >
                      <template #icon>
                        <InfoCircleFilled :style="{color: themeStore.isDarkTheme ? '#dc4446' : '#ff4d4f'}"/>
                      </template>
                      <template #title>
                        <div>强制删除 {{record.originalName}}</div>
                      </template>
                      <template #description>
                        删除后可能导致业务异常且不可恢复，请确保附件已不再使用。是否删除？
                      </template>
                      <a-button type="link" size="small" danger @click="(event:MouseEvent) => event.stopPropagation()">
                        <template #icon>
                          <DeleteFilled />
                        </template>
                        强制删除
                      </a-button>
                    </a-popconfirm>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>

          </template>
        </template>
        <template #footer>
          <a-flex justify="flex-end">
            <a-pagination v-model:current="attachmentQuery.pageNum"
                          v-model:page-size="attachmentQuery.pageSize"
                          show-size-changer
                          :total="attachmentTotal"
                          :show-total="(total:number) => `共 ${total} 条`"
                          @change="initPage"/>
          </a-flex>
        </template>
      </a-table>
      </a-card>
    </a-flex>
<!--    详情模态框-->
    <a-modal v-model:open="showInfoModal" @cancel="handleCloseInfoModal" width="1000px" :footer="null">
      <a-descriptions title="附件详情" bordered :column="3" :styles="{label: {width: '110px'}}">
        <!-- 文件信息 -->
        <a-descriptions-item label="附件名称" :span="1">
          <a-typography-link v-if="attachmentInfo.status === '0' && attachmentInfo.type?.startsWith('image')" @click="() => handlePreview(attachmentInfo.id, attachmentInfo.type)">{{attachmentInfo.originalName}}</a-typography-link>
          <span v-else>{{attachmentInfo.originalName}}</span>
        </a-descriptions-item>
        <a-descriptions-item label="存储路径" :span="2">{{attachmentInfo.path}}</a-descriptions-item>
        <a-descriptions-item label="附件大小" :span="1">{{convertFileSize(attachmentInfo.size)}}</a-descriptions-item>

        <a-descriptions-item label="附件类型" :span="1">{{attachmentInfo.type}}</a-descriptions-item>
        <a-descriptions-item label="服务类型" :span="1">{{attachmentInfo.storageLocation}}</a-descriptions-item>

        <!-- 业务信息 -->
        <a-descriptions-item label="业务编码" :span="1">{{attachmentInfo.businessCode}}</a-descriptions-item>
        <a-descriptions-item label="业务名称" :span="1">
          <a-space>
            {{attachmentInfo.businessName}}
            <dict-tag :dict-data-option="sys_client_type" :dict-data-value="attachmentInfo.clientType" v-if="attachmentInfo.clientType"></dict-tag>
          </a-space>
        </a-descriptions-item>

        <!-- 上传信息 -->
        <a-descriptions-item label="上传用户" :span="1">{{uploadUserName}}</a-descriptions-item>
        <a-descriptions-item label="上传时间" :span="1">{{attachmentInfo.createTime ? dayjs(attachmentInfo.createTime).format("YYYY-MM-DD HH:mm:ss") : ''}}</a-descriptions-item>
        <a-descriptions-item label="上传方式" :span="1">
          <dict-tag :dict-data-value="attachmentInfo.uploadMode ? attachmentInfo.uploadMode : ''" :dict-data-option="sys_attachment_upload_mode"/>
        </a-descriptions-item>
        <!-- 附件状态 -->
        <a-descriptions-item label="附件状态" :span="1">
          <dict-tag :dict-data-value="attachmentInfo.status ? attachmentInfo.status : ''" :dict-data-option="sys_attachment_status"/>
        </a-descriptions-item>
        <!-- 异常信息 -->
        <a-descriptions-item label="异常信息" :span="3" v-if="attachmentInfo.status === '1'">{{attachmentInfo.errorMsg}}</a-descriptions-item>
        <!-- url上传展示原url -->
        <a-descriptions-item label="原URL" :span="3" v-if="attachmentInfo.url">{{attachmentInfo.url}}</a-descriptions-item>
        <!-- 分片上传Id -->
        <a-descriptions-item label="分片标识" :span="3" v-if="attachmentInfo.uploadId">{{attachmentInfo.uploadId}}</a-descriptions-item>
        <!-- MD5 -->
        <a-descriptions-item label="MD5" :span="3" v-if="attachmentInfo.md5">{{attachmentInfo.md5}}</a-descriptions-item>
      </a-descriptions>
      <!--      图片预览-->
      <a-image :src="attachmentInfo.id ? previewUrlMap.get(attachmentInfo.id) : ''" :style="{ display: 'none' }" :preview="{ open: previewOpen, onOpenChange: () => handlePreview(attachmentInfo.id, attachmentInfo.type)}"></a-image>
    </a-modal>
<!--    分享模态框-->
    <a-modal v-model:open="showShareModal" @cancel="handleCloseShareModal">
      <template #title>
        <div style="margin-bottom: var(--ant-margin-lg)">
          <a-typography-title :level="4">{{shareName}}</a-typography-title>
        </div>
      </template>
      <a-form :colon="false">
        <a-form-item label="有效时间">
          <a-input-number placeholder="请输入链接有效时间"
                          change-on-wheel
                          style="width: 50%;"
                          suffix="分钟"
                          :min="1"
                          :precision="0"
                          v-model:value="shareValidTime"
                          @blur="handleGetShareUrl"
          />
        </a-form-item>
        <a-form-item label="附件链接">
          <a-textarea :auto-size="{ minRows: 10 }"
                      v-model:value="shareUrl"
                      placeholder="有效时间失去焦点以获取分享链接"
                      readonly/>
        </a-form-item>
      </a-form>
      <template #footer>
        <a-button type="primary" @click="handleCopyToClipboard">
          <template #icon>
            <CopyOutlined />
          </template>
          复制链接到剪切板
        </a-button>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">

// 查询列表
import {computed, nextTick, onUnmounted, ref} from "vue";
import type {SysAttachment, SysAttachmentDTO, SysAttachmentVO} from "@/api/system/attachment/type/sys-attachment.ts";
import {message, type TableColumnsType} from "@/antd-adapter";
import {deleteData, forceDeleteData, getDownloadURL, queryById, queryPage} from "@/api/system/attachment/attachment.ts";
import {queryById as queryUserById} from "@/api/system/user/user.ts";
import {resolveAttachmentAbsoluteUrl, resolveAttachmentEntryUrl} from "@/api/system/attachment/attachment-storage.ts";
import dayjs from "dayjs";
import {initDict} from "@/helpers/dict.ts";
import DictTag from "@/components/dict-tag/index.vue"
import {download} from "@/utils/attachment-download.ts";
import appInfo from "@/app-info.ts";
import {useThemeStore} from "@/stores/theme.ts";
import TableSetting from "@/components/table-setting/index.vue";

const {sys_attachment_status, sys_attachment_upload_mode, sys_client_type} = initDict("sys_attachment_status", "sys_attachment_upload_mode", "sys_client_type")
const themeStore = useThemeStore()

const initSearch = () => {
// 选中的数据id集合
  const selectedIds = ref<Array<string>>([])
  // 列表勾选对象
  // selectedRowKeys 必须传真实数组：vnext 内部会展开迭代该字段，直接传 ref 会抛 not iterable
  const attachmentRowSelectionType = computed(() => ({
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
  const handleRowClick = (record: SysAttachment) => {
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

  const attachmentColumn = ref<TableColumnsType>([
    {
      title: '附件名称',
      key: 'originalName',
      dataIndex: 'originalName',
      ellipsis: true
    },
    {
      title: '附件大小',
      key: 'size',
      dataIndex: 'size',
      align: "center"
    },
    {
      title: '存储路径',
      key: 'path',
      dataIndex: 'path',
      ellipsis: true
    },
    {
      title: '业务名称',
      key: 'businessName',
      dataIndex: 'businessName',
      align: 'center',
    },
    {
      title: '客户端类型',
      key: 'clientType',
      dataIndex: 'clientType',
      align: 'center',
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      align: 'center',
    },
    {
      title: '上传方式',
      key: 'uploadMode',
      dataIndex: 'uploadMode',
      align: 'center',
    },
    {
      title: '上传时间',
      key: 'createTime',
      dataIndex: 'createTime',
      align: 'center',
      width: 200
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      width: '244px',
      fixed: 'right'
    }
  ])

  const reloadPage = async () => {
    attachmentQuery.value = {
      pageNum: 1,
      pageSize: 10
    }
    await initPage()
  }

  const attachmentQuery = ref<SysAttachmentDTO>({
    pageNum: 1,
    pageSize: 10
  })

  const attachmentTotal = ref<number>()
  const attachmentList = ref<Array<SysAttachment>>([])
  const tableLoad = ref<boolean>(false)

  const handleQueryPage = async () => {
    attachmentQuery.value.pageNum = 1
    await initPage()
  }

  const initPage = async () => {
    tableLoad.value = true
    try {
      const resp = await queryPage(attachmentQuery.value)
      if (resp.code === 200) {
        attachmentTotal.value = resp.data.total
        attachmentList.value = resp.data.records
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoad.value = false
    }
  }
  // 转换文件大小
  const convertFileSize = (size?: string) => {
    if (!size) {
      return;
    }
    let numSize = Number(size)
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];

    let unitIndex = 0;
    while (numSize >= 1024 && unitIndex < units.length - 1) {
      numSize /= 1024;
      unitIndex++;
    }

    return Math.round(numSize * 100) / 100 + " " + units[unitIndex];
  }

  handleQueryPage()
  return {
    selectedIds,
    attachmentRowSelectionType,
    attachmentColumn,
    attachmentTotal,
    attachmentList,
    tableLoad,
    attachmentQuery,
    convertFileSize,
    handleRowClick,
    handleQueryPage,
    initPage,
    reloadPage
  }
}

const {selectedIds, attachmentRowSelectionType ,attachmentColumn, attachmentTotal, attachmentList, tableLoad, attachmentQuery, convertFileSize, handleRowClick, handleQueryPage, reloadPage, initPage} = initSearch()

const initDelete = () => {
  // 显示删除提示
  const openDeletePopconfirm = ref<boolean>(false);

  // 倒计时
  const countdown = ref<number>()
  // 计时器
  const interval = ref()

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
  // 处理删除逻辑
  const handleDelete = async (id?:string) => {
    const deleteIds = id ? [id] : [...selectedIds.value];
    try {
      if (deleteIds.length > 0) {
        const resp = await deleteData(deleteIds)
        if (resp.code === 200) {
          message.success(resp.msg);
          // id 不存在则清空选中数据
          if (!id) {
            selectedIds.value = []
          } else {
            selectedIds.value = selectedIds.value.filter(item => item !== id)
          }
          await initPage()
        } else {
          message.error(resp.msg)
        }
      } else {
        message.warning("请勾选数据")
      }
    } finally {
      closePopconfirm()
    }
  }

  // 强制删除计时器
  const startForceDeleteCountdown = (open: boolean, second: number) => {
    clearInterval(interval.value)
    if (open) {
      countdown.value = second
    }

    interval.value = setInterval(() => {
      if (second === 0) {
        clearInterval(interval.value)
        countdown.value = 0
      } else {
        second--
        countdown.value = second
      }
    }, 1000)
  }

  // 处理强制删除
  const handleForceDelete = async (id: string) => {
    const resp = await forceDeleteData(id)
    if (resp.code === 200) {
      message.success(resp.msg);
      await initPage()
    } else {
      message.error(resp.msg)
    }
  }

  // 「更多」菜单受控展开：hover 关闭会把菜单隐藏（不销毁），菜单内确认弹层的锚点随之失效漂移到左上角，
  // 因此确认弹层打开期间拦截关闭；确认/取消后鼠标往往已离开菜单，也需在此主动收起
  const openMoreMenuId = ref<string>()
  const menuConfirmOpen = ref(false)
  const handleMoreMenuOpenChange = (open: boolean, id: string) => {
    if (open) {
      // 已有确认弹层打开时不切换目标行（旧行菜单隐藏会让该弹层失去锚点）
      if (!menuConfirmOpen.value) {
        openMoreMenuId.value = id
      }
    } else if (!menuConfirmOpen.value) {
      openMoreMenuId.value = undefined
    }
  }
  const handleMenuConfirmOpenChange = (open: boolean) => {
    menuConfirmOpen.value = open
    if (!open) {
      // 同一次点击可能在两个确认弹层间切换（后开者已重新置位），下一拍仍无打开者时再收起菜单
      nextTick(() => {
        if (!menuConfirmOpen.value) {
          openMoreMenuId.value = undefined
        }
      })
    }
  }
  // 强删确认弹层打开变化：倒计时联动 + 菜单保持联动
  const handleForceDeletePopconfirmOpenChange = (open: boolean) => {
    startForceDeleteCountdown(open, 5)
    handleMenuConfirmOpenChange(open)
  }
  return {
    openDeletePopconfirm,
    countdown,
    interval,
    closePopconfirm,
    handleDelete,
    openPopconfirm,
    handleForceDelete,
    startForceDeleteCountdown,
    openMoreMenuId,
    handleMoreMenuOpenChange,
    handleMenuConfirmOpenChange,
    handleForceDeletePopconfirmOpenChange
  }
}

const {openDeletePopconfirm, countdown, interval, closePopconfirm, handleDelete, openPopconfirm, handleForceDelete, startForceDeleteCountdown, openMoreMenuId, handleMoreMenuOpenChange, handleMenuConfirmOpenChange, handleForceDeletePopconfirmOpenChange} = initDelete()

const initShare = () => {
  const showShareModal = ref<boolean>(false)
  const shareId = ref<string>()
  const shareName = ref<string>()
  const shareValidTime = ref<number>(15)
  const shareUrl = ref<string>()
  // 上次生成链接的请求参数与时间：参数未变且生成不足 1 分钟时，失焦不重复请求
  // （链接的有效期起点取生成时刻，超过 1 分钟后失焦会刷新起点）
  let lastShareRequest: { id: string, validTime: number, generatedAt: number } | undefined

  // 处理打开分享model
  const handleShowShareModal = (event: MouseEvent, id: string, fileName: string, status: string) => {
    event.stopPropagation()
    if (status !== '0') {
      message.error("仅上传完成附件可分享")
      return;
    }

    showShareModal.value = true
    shareId.value = id
    shareName.value = fileName
    handleGetShareUrl()
  }
  // 处理关闭分享model
  const handleCloseShareModal = () => {
    showShareModal.value = false
    shareId.value = undefined
    shareUrl.value = undefined
    lastShareRequest = undefined
  }

  // 处理获取分享链接
  const handleGetShareUrl = async () => {
    if (shareId.value) {
      // 参数与上次一致且生成不足 1 分钟：沿用现有链接，跳过请求
      if (shareUrl.value && lastShareRequest
          && lastShareRequest.id === shareId.value
          && lastShareRequest.validTime === shareValidTime.value
          && Date.now() - lastShareRequest.generatedAt < 60 * 1000) {
        return
      }
      const resp = await getDownloadURL(shareId.value, shareValidTime.value.toString())
      if (resp.code === 200) {
        lastShareRequest = {id: shareId.value, validTime: shareValidTime.value, generatedAt: Date.now()}
        const timeoutTime = dayjs(new Date()).add(shareValidTime.value, "minute").format('YYYY-MM-DD HH:mm:ss')
        const fullUrl = resolveAttachmentAbsoluteUrl(resp.data)
        shareUrl.value = `${fullUrl}### 附件名称 ${shareName.value} 有效期至 ${timeoutTime} --来自${appInfo.appName}`
      } else {
        message.error(resp.msg)
      }
    }
  }

  // 处理复制到剪贴板（失败保留弹窗，便于从输入框手动复制）
  const handleCopyToClipboard = () => {
    if (shareUrl.value) {
      navigator.clipboard.writeText(shareUrl.value)
        .then(() => {
          message.success('复制成功')
          handleCloseShareModal()
        })
        .catch(() => message.error('复制失败'))
    } else {
      message.error("分享链接获取失败")
    }
  }
  return {
    showShareModal,
    shareId,
    shareName,
    shareValidTime,
    shareUrl,
    handleShowShareModal,
    handleCloseShareModal,
    handleGetShareUrl,
    handleCopyToClipboard
  }
}

const {showShareModal, shareName, shareUrl, shareValidTime, handleShowShareModal, handleCloseShareModal,handleGetShareUrl, handleCopyToClipboard} = initShare()

const initInfo = () => {
  const showInfoModal = ref<boolean>(false)
  const attachmentInfo = ref<SysAttachmentVO>({})
  // 上传人昵称：详情打开时按 createId 单独查用户详情（附件接口不再联查 sys_user）
  const uploadUserName = ref<string>("")
  const previewUrlMap = ref<Map<string, string>>(new Map<string, string>())
  const previewOpen = ref<boolean>(false)
  // 详情图片预览链接的签发时效（分钟）：7 天，覆盖会话期；链接缓存在 previewUrlMap，仅卸载时清理
  const PREVIEW_URL_EXPIRE_MINUTES = 10080

  // 处理打开模态框
  const handleOpenInfoModal = async (event: MouseEvent, id: string) => {
    event.stopPropagation()
    const resp = await queryById(id)
    if (resp.code === 200) {
      showInfoModal.value = true
      attachmentInfo.value = resp.data
      // 用户可能已被删除，查询失败或无昵称时显示空
      uploadUserName.value = ""
      if (resp.data.createId) {
        const userResp = await queryUserById(resp.data.createId)
        uploadUserName.value = userResp.code === 200 ? (userResp.data?.nickname ?? "") : ""
      }
    } else {
      message.error(resp.msg)
    }
  }

  // 处理关闭模态框
  const handleCloseInfoModal = () => {
    showInfoModal.value = false
    attachmentInfo.value = {}
    uploadUserName.value = ""
  }

  // 处理详情中的图片预览
  const handlePreview = async (id?: string, type?: string) => {
    if (!id || !type) {
      message.error("附件id或类型不存在")
      return
    }
    const url = previewUrlMap.value.get(id)
    if (!url) {
      const resp = await getDownloadURL(id, PREVIEW_URL_EXPIRE_MINUTES.toString())
      if (resp.code === 200) {
        previewUrlMap.value.set(id, resolveAttachmentEntryUrl(resp.data))
      } else {
        message.error(resp.msg)
        return
      }
    }
    previewOpen.value = !previewOpen.value;
  }
  return {
    showInfoModal,
    attachmentInfo,
    uploadUserName,
    previewUrlMap,
    previewOpen,
    handleOpenInfoModal,
    handleCloseInfoModal,
    handlePreview
  }
}

const {showInfoModal, attachmentInfo, uploadUserName, previewUrlMap, previewOpen, handleOpenInfoModal, handleCloseInfoModal, handlePreview} = initInfo()

// 下载
const handleDownload = async (event: MouseEvent, id: string, status: string) => {
  event.stopPropagation()
  if (status !== '0') {
    message.error("仅上传完成附件可下载")
    return;
  }
  const resp = await getDownloadURL(id)
  if (resp.code === 200) {
    download(resolveAttachmentEntryUrl(resp.data))
  } else {
    message.error(resp.msg)
  }
}

onUnmounted(() => {
  clearInterval(interval.value)
  previewUrlMap.value.clear()
})
</script>
