<template>
  <div>
    <a-flex :gap="16" vertical>
      <!--        检索条件-->
      <a-card :styles="{body: {'padding-bottom': '0'}}">
        <a-form :colon="false">
          <a-row :gutter="16">
            <a-col>
              <a-form-item label="版本名称">
                <a-input placeholder="请输入版本名称" v-model:value="appVersionQuery.versionName" allow-clear/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="平台">
                <a-select placeholder="请选择" v-model:value="appVersionQuery.platform" allow-clear :options="app_version_platform"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item label="状态">
                <a-select placeholder="请选择" v-model:value="appVersionQuery.status" allow-clear :options="app_version_status"/>
              </a-form-item>
            </a-col>
            <a-col>
              <a-form-item>
                <a-space size="small">
                  <a-button type="primary" @click="handleQueryPage" :loading="tableLoad">
                    <template #icon>
                      <SearchOutlined />
                    </template>
                    查 询
                  </a-button>
                  <a-button :loading="tableLoad" @click="reloadPage">
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
      <!--        列表-->
      <a-card :styles="{body: {padding: 0}}">
      <a-table :columns="appVersionColumn"
               :data-source="appVersionList"
               :pagination="false"
               :loading="tableLoad"
               :row-selection="appVersionRowSelectionType"
               :scroll="{x: 1200}"
               row-key="id"
      >
        <template #title>
          <a-flex :gap="8" wrap="wrap">
            <a-button type="primary" @click="handleModalStatus('新增版本')">
              <template #icon>
                <PlusOutlined />
              </template>
              新 增
            </a-button>
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
                <span v-if="selectedIds && selectedIds.length > 0" class="ml-ant-xxs"> {{selectedIds.length}} 项</span>
              </a-button>
            </a-popconfirm>
            <!--            表格设置-->
            <table-setting v-model="appVersionColumn"/>
          </a-flex>
        </template>

        <template #bodyCell="{column,record,text}">
          <template v-if="column.key === 'versionName'">
            <a-button type="link" size="small" style="padding: 0" @click="handleView(record.id)">{{text}}</a-button>
          </template>
          <template v-if="column.key === 'platform'">
            <dict-tag :dict-data-option="app_version_platform" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'enableWgt'">
            <a-tag v-if="record.platform === 'android' && text === '1'" color="success">支持</a-tag>
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'status'">
            <dict-tag :dict-data-option="app_version_status" :dict-data-value="text"/>
          </template>
          <template v-if="column.key === 'publishTime'">
            {{ text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '' }}
          </template>

          <template v-if="column.key === 'action'">
            <!-- 状态机：已发布仅可下线；草稿/已下线可编辑、发布、删除 -->
            <template v-if="record.status === '1'">
              <a-popconfirm title="下线后 App 端将无法获取该版本更新，是否下线？"
                            ok-text="确 定"
                            cancel-text="取 消"
                            @confirm="handleOffline(record.id)"
                            placement="bottomRight"
              >
                <a-button type="link" size="small">下线</a-button>
              </a-popconfirm>
            </template>
            <template v-else>
              <a-button type="link" size="small" @click="selectById(record.id)">
                <template #icon>
                  <EditOutlined />
                </template>
                编辑
              </a-button>
              <a-divider :vertical="true"/>
              <a-popconfirm title="发布后 App 端即可检测到该版本，是否发布？"
                            ok-text="确 定"
                            cancel-text="取 消"
                            @confirm="handlePublish(record.id)"
                            placement="bottomRight"
              >
                <a-button type="link" size="small">发布</a-button>
              </a-popconfirm>
              <a-divider :vertical="true"/>
              <a-popconfirm title="数据删除后不可恢复，是否删除？"
                            ok-text="确 定"
                            cancel-text="取 消"
                            @confirm="handleDelete(record.id)"
                            placement="bottomRight"
              >
                <a-button type="link" danger size="small">
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                  删除
                </a-button>
              </a-popconfirm>
            </template>
          </template>
        </template>
        <template #footer>
          <a-flex justify="flex-end">
            <a-pagination v-model:current="appVersionQuery.pageNum"
                          v-model:page-size="appVersionQuery.pageSize"
                          show-size-changer
                          :total="appVersionTotal"
                          :show-total="(total:number) => `共 ${total} 条`"
                          @change="initPage"/>
          </a-flex>
        </template>
      </a-table>
      </a-card>
    </a-flex>

    <a-modal v-model:open="modalActive.open" @ok="saveAppVersion" :confirm-loading="modalActive.saveLoading" destroy-on-hidden :width="560">
      <template #title>
        <div class="mb-ant-lg">
          <a-typography-title :level="4">{{modalActive.title}}</a-typography-title>
        </div>
      </template>

      <a-form :colon="false" :model="sysAppVersion" ref="formRef" :label-col="{span: 5}" :rules="appVersionRoles">
        <a-form-item label="平台" name="platform">
          <a-radio-group v-model:value="sysAppVersion.platform" :disabled="!!sysAppVersion.id" @change="handlePlatformChange">
            <a-radio :value="item.value" v-for="item in app_version_platform" :key="item.value">{{item.label}}</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-row>
          <a-col :span="12">
            <a-form-item label="版本名称" :label-col="{span: 10}" name="versionName">
              <a-input placeholder="如 1.2.0" v-model:value="sysAppVersion.versionName" allow-clear :maxlength="20"/>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="版本序号" :label-col="{span: 10}" name="versionCode">
              <template #tooltip>
                与 manifest.json versionCode 一致，用于版本比对（纯整数比较，仅展示用版本名称不参与）
              </template>
              <a-input-number placeholder="如 10200" v-model:value="sysAppVersion.versionCode" :min="1" :precision="0" style="width: 100%"/>
            </a-form-item>
          </a-col>
        </a-row>

        <!-- Android：APK 整包 + 可选 WGT 热更新包（安装包一律经附件上传，直链形态仅限外链平台） -->
        <template v-if="sysAppVersion.platform === 'android'">
          <a-form-item label="APK 安装包" name="downloadUrl">
            <attachment-upload v-model="sysAppVersion.downloadUrl"
                               mode="button"
                               text="上传 APK 安装包"
                               :upload-type="['.apk']"
                               :max-size="500"
                               :max-count="1"
                               :chunk="true"
                               :public="true"
                               business-code="AppVersionPackage"
                               business-name="App安装包"/>
          </a-form-item>
          <a-form-item label="热更新" name="enableWgt">
            <template #tooltip>
              跨版本连续热更新；任一版本不支持时 App 自动降级整包更新
            </template>
            <a-switch v-model:checked="enableWgtChecked" @change="handleEnableWgtChange"/>
          </a-form-item>
          <a-form-item v-if="enableWgtChecked" label="WGT 热更包" name="wgtDownloadUrl">
            <attachment-upload v-model="sysAppVersion.wgtDownloadUrl"
                               mode="button"
                               text="上传 WGT 热更包"
                               :upload-type="['.wgt']"
                               :max-size="200"
                               :max-count="1"
                               :chunk="true"
                               :public="true"
                               business-code="AppVersionPackage"
                               business-name="App热更新包"/>
          </a-form-item>
        </template>

        <!-- iOS/鸿蒙：市场或分发页外链（无整包与热更安装链路） -->
        <a-form-item v-if="sysAppVersion.platform && sysAppVersion.platform !== 'android'" label="下载链接" name="downloadUrl">
          <a-input placeholder="App Store、应用市场或分发页链接" v-model:value="sysAppVersion.downloadUrl" allow-clear :maxlength="500"/>
        </a-form-item>

        <a-form-item label="更新说明" name="updateContent">
          <a-textarea type="textarea" placeholder="请输入更新说明" v-model:value="sysAppVersion.updateContent" :maxlength="1000" show-count :rows="5" allow-clear/>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 版本详情（只读，参考日志详情形态） -->
    <a-modal cancel-text="关 闭" v-model:open="detailOpen" width="720px" :footer="null">
      <a-descriptions title="版本详情" bordered :column="2" :styles="{label: {width: '110px'}}">
        <a-descriptions-item label="版本名称" :span="1">{{detailInfo.versionName}}</a-descriptions-item>
        <a-descriptions-item label="版本序号" :span="1">{{detailInfo.versionCode}}</a-descriptions-item>
        <a-descriptions-item label="平台" :span="1">
          <dict-tag v-if="detailInfo.platform" :dict-data-option="app_version_platform" :dict-data-value="detailInfo.platform"/>
        </a-descriptions-item>
        <a-descriptions-item label="状态" :span="1">
          <dict-tag v-if="detailInfo.status" :dict-data-option="app_version_status" :dict-data-value="detailInfo.status"/>
        </a-descriptions-item>
        <a-descriptions-item v-if="detailInfo.platform === 'android' && detailInfo.enableWgt" label="热更新" :span="1">
          <dict-tag :dict-data-option="app_version_enable_wgt" :dict-data-value="detailInfo.enableWgt"/>
        </a-descriptions-item>
        <a-descriptions-item label="发布时间" :span="1">{{detailInfo.publishTime ? dayjs(detailInfo.publishTime).format('YYYY-MM-DD HH:mm:ss') : ''}}</a-descriptions-item>
        <a-descriptions-item :label="detailInfo.platform === 'android' ? 'APK 安装包地址' : '下载链接'" :span="3" class="detail-long-text">
          <a-typography-link v-if="detailInfo.downloadUrl" @click="openAddress(detailInfo.downloadUrl)">{{detailInfo.downloadUrl}}</a-typography-link>
        </a-descriptions-item>
        <a-descriptions-item v-if="detailInfo.platform === 'android' && detailInfo.enableWgt === '1'" label="WGT 热更包地址" :span="3" class="detail-long-text">
          <a-typography-link v-if="detailInfo.wgtDownloadUrl" @click="openAddress(detailInfo.wgtDownloadUrl)">{{detailInfo.wgtDownloadUrl}}</a-typography-link>
        </a-descriptions-item>
        <a-descriptions-item label="更新说明" :span="3" class="detail-long-text">{{detailInfo.updateContent}}</a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import {computed, reactive, ref, useTemplateRef} from "vue";
import {initDict} from "@/helpers/dict.ts";
import {deleteData, offline, publish, queryById, queryPage, save} from "@/api/system/app-version/app-version.ts";
import {resolvePathDownloadUrl} from "@/api/system/attachment/attachment-storage.ts";
import {message, type FormInstance, type Rule, type TableColumnsType} from "@/antd-adapter";
import dayjs from "dayjs";
import type {SysAppVersion, SysAppVersionDTO, SysAppVersionVO} from "@/api/system/app-version/type/sys-app-version.ts";
import {type BaseModalActiveType} from "@/api/global/type.ts";
import TableSetting from "@/components/table-setting/index.vue";
import AttachmentUpload from "@/components/attachment-upload/index.vue";
import DictTag from "@/components/dict-tag/index.vue";

const {app_version_platform, app_version_status, app_version_enable_wgt} = initDict("app_version_platform", "app_version_status", "app_version_enable_wgt")

// 版本详情（只读查看，不做表单禁用形态）
const initDetailView = () => {
  const detailOpen = ref(false)
  const detailInfo = ref<SysAppVersion>({})

  const handleView = async (id: string) => {
    const resp = await queryById(id)
    if (resp.code === 200) {
      detailInfo.value = resp.data
      detailOpen.value = true
    } else {
      message.error(resp.msg)
    }
  }

  // 打开安装包/下载链接：HTTP(S) 直链原样打开；附件 path 组装绝对下载 URL（浏览器直接触发下载）
  const openAddress = (url?: string) => {
    if (!url) return
    const target = /^https?:\/\//i.test(url) ? url : resolvePathDownloadUrl(url)
    window.open(target)
  }

  return {
    detailOpen,
    detailInfo,
    handleView,
    openAddress
  }
}
const { detailOpen, detailInfo, handleView, openAddress } = initDetailView()

// 查询列表
const initSearch = () => {
  // 选中的数据id集合
  const selectedIds = ref<Array<string>>([])
  // 列表勾选对象
  const appVersionRowSelectionType = computed(() => ({
    columnWidth: '55px',
    type: 'checkbox' as const,
    // 支持跨页勾选
    preserveSelectedRowKeys: true,
    // 指定选中id的数据集合，操作完后可手动清空
    selectedRowKeys: selectedIds.value,
    onChange: (keys: Array<string | number>) => {
      selectedIds.value = keys.map(String)
    }
  }))

  const appVersionColumn = ref<TableColumnsType>([
    {
      title: '版本名称',
      key: 'versionName',
      dataIndex: 'versionName',
      align: 'center',
    },
    {
      title: '版本序号',
      key: 'versionCode',
      dataIndex: 'versionCode',
      align: 'center',
    },
    {
      title: '平台',
      key: 'platform',
      dataIndex: 'platform',
      align: 'center',
    },
    {
      title: '热更新',
      key: 'enableWgt',
      dataIndex: 'enableWgt',
      align: 'center',
    },
    {
      title: '状态',
      key: 'status',
      dataIndex: 'status',
      align: 'center',
    },
    {
      title: '发布时间',
      key: 'publishTime',
      dataIndex: 'publishTime',
      align: 'center',
    },
    {
      title: '操作',
      key: 'action',
      align: 'center',
      width: '280px',
      fixed: 'right'
    }
  ])

  const appVersionQuery = ref<SysAppVersionDTO>({
    pageNum: 1,
    pageSize: 10,
  })
  const appVersionTotal = ref<number>()
  const appVersionList = ref<Array<SysAppVersionVO>>([])
  const tableLoad = ref<boolean>(false)

  const handleQueryPage = async () => {
    appVersionQuery.value.pageNum = 1
    await initPage()
  }

  const reloadPage = async () => {
    appVersionQuery.value = {
      pageNum: 1,
      pageSize: 10
    }
    await initPage()
  }

  const initPage = async () => {
    tableLoad.value = true
    try {
      const resp = await queryPage(appVersionQuery.value)
      if (resp.code === 200) {
        appVersionList.value = resp.data.records
        appVersionTotal.value = resp.data.total
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoad.value = false
    }
  }
  handleQueryPage()
  return {
    appVersionColumn,
    appVersionList,
    appVersionQuery,
    selectedIds,
    appVersionRowSelectionType,
    tableLoad,
    appVersionTotal,
    handleQueryPage,
    initPage,
    reloadPage
  }
}
const { appVersionColumn, appVersionList, appVersionQuery, selectedIds, appVersionRowSelectionType, tableLoad, appVersionTotal, handleQueryPage, initPage, reloadPage } = initSearch()

// 保存版本
const initSave = () => {
  const formRef = useTemplateRef<FormInstance>("formRef")

  const sysAppVersion = ref<SysAppVersion>({
    platform: 'android',
    enableWgt: '0'
  })

  // 热更新开关（switch 布尔 ↔ 字段 '0'/'1' 互转）
  const enableWgtChecked = computed({
    get: () => sysAppVersion.value.enableWgt === '1',
    set: (value: boolean) => {
      sysAppVersion.value.enableWgt = value ? '1' : '0'
    }
  })

  // HTTP(S) 绝对地址校验（外链平台下载链接用；Android 安装包走附件上传恒为 path，无直链形态）
  const validateHttpUrlValue = (value?: string): Promise<void> => {
    if (!value) {
      return Promise.resolve()
    }
    let url: URL
    try {
      url = new URL(value)
    } catch {
      return Promise.reject("地址格式不正确")
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return Promise.reject("必须是 HTTP/HTTPS 绝对地址")
    }
    return Promise.resolve()
  }

  // 安装包/下载链接校验按平台分化：Android 上传组件恒产出附件 path 只需必填；
  // iOS/鸿蒙为市场外链输入框，required + HTTP(S) 校验
  const appVersionRoles = computed<Record<string, Rule[]>>(() => ({
    platform: [
      {required: true, message: "请选择平台", trigger: "change"}
    ],
    versionName: [
      {required: true, message: "请输入版本名称", trigger: "change"}
    ],
    versionCode: [
      {required: true, message: "请输入版本序号", trigger: "change"}
    ],
    downloadUrl: sysAppVersion.value.platform === 'android'
        ? [{required: true, message: "请上传 APK 安装包", trigger: "change"}]
        : [
          {required: true, message: "请输入下载链接", trigger: "change"},
          {validator: (_rule: Rule, value: string) => validateHttpUrlValue(value), trigger: "change"}
        ],
    wgtDownloadUrl: [
      {required: true, message: "请上传 WGT 热更包", trigger: "change"}
    ]
  }))

  const modalActive = reactive<BaseModalActiveType>({
    open: false,
    saveLoading: false,
    title: ''
  })

  // 修改模态框状态（重置表单；title 由调用方声明新增/编辑）
  const handleModalStatus = (title?: string) => {
    modalActive.open = !modalActive.open
    if (title) {
      modalActive.title = title
    }
    sysAppVersion.value = {
      platform: 'android',
      enableWgt: '0'
    }
  }

  // 编辑回显（历史直链形态记录仅展示，保存时以重新上传的附件 path 为准）
  const selectById = async (id: string) => {
    const resp = await queryById(id)
    if (resp.code === 200) {
      handleModalStatus('编辑版本')
      sysAppVersion.value = resp.data
    } else {
      message.error(resp.msg)
    }
  }

  // 平台切换：非 Android 平台（iOS/鸿蒙）强制关闭热更新并清空 WGT 地址（与后端保存校验对齐）
  const handlePlatformChange = () => {
    if (sysAppVersion.value.platform !== 'android') {
      sysAppVersion.value.enableWgt = '0'
      sysAppVersion.value.wgtDownloadUrl = undefined
    }
  }

  // 关闭热更新时清空 WGT 地址，避免脏数据
  const handleEnableWgtChange = (checked: boolean | string | number) => {
    if (!checked) {
      sysAppVersion.value.wgtDownloadUrl = undefined
    }
  }

  // 保存版本数据
  const saveAppVersion = async () => {
    await formRef.value?.validate()
    modalActive.saveLoading = true

    try {
      const resp = await save(sysAppVersion.value)
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

  return {
    modalActive,
    sysAppVersion,
    appVersionRoles,
    formRef,
    enableWgtChecked,
    handlePlatformChange,
    handleEnableWgtChange,
    selectById,
    saveAppVersion,
    handleModalStatus,
  }
}
const { modalActive, sysAppVersion, appVersionRoles, formRef, enableWgtChecked, handlePlatformChange, handleEnableWgtChange, selectById, saveAppVersion, handleModalStatus } = initSave()

// 版本状态管理（发布/下线：同一生命周期业务的动作集合）
const initStatusAction = () => {
  const handlePublish = async (id?: string) => {
    if (!id) return
    const resp = await publish(id)
    if (resp.code === 200) {
      message.success(resp.msg)
      await initPage()
    } else {
      message.error(resp.msg)
    }
  }

  const handleOffline = async (id?: string) => {
    if (!id) return
    const resp = await offline(id)
    if (resp.code === 200) {
      message.success(resp.msg)
      await initPage()
    } else {
      message.error(resp.msg)
    }
  }

  return { handlePublish, handleOffline }
}
const { handlePublish, handleOffline } = initStatusAction()

// 删除版本
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

  return {
    openDeletePopconfirm,
    closePopconfirm,
    handleDelete,
    openPopconfirm
  }
}

const {openDeletePopconfirm, closePopconfirm, handleDelete, openPopconfirm} = initDelete()
</script>

<style scoped>
:deep(.detail-long-text) {
  word-break: break-all;
}
</style>
