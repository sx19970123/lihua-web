<template>
 <div>
   <a-flex :gap="16" vertical>
<!--     检索条件-->
     <a-card :styles="{body: {'padding-bottom': '0'}}">
      <a-form :colon="false">
        <a-row :gutter="16">
          <a-col>
            <a-form-item label="日志描述">
              <a-input v-model:value="logQuery.description" placeholder="请输入日志描述" allow-clear/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="操作人员">
              <a-input v-model:value="logQuery.createName" placeholder="请输入操作人员" allow-clear/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="操作类型">
              <a-select v-model:value="logQuery.typeCode" placeholder="请选择" style="width: 120px" allow-clear :options="logTypeOption"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="执行状态">
              <a-select v-model:value="logQuery.executeStatus" placeholder="请选择" style="width: 120px" allow-clear :options="sys_log_status"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="客户端类型">
              <a-select v-model:value="logQuery.clientType" placeholder="请选择" style="width: 120px" allow-clear :options="sys_client_type"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="TraceId">
              <a-input v-model:value="logQuery.traceId" placeholder="链路追踪 id 精确匹配" allow-clear/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="操作时间">
              <a-range-picker allowClear v-model:value="logQuery.createTimeList" />
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item>
              <a-space size="small">
                <a-button type="primary" @click="queryPage" :loading="tableLoad">
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
<!--     列表-->
     <a-card :styles="{body: {padding: 0}}">
     <a-table
         :pagination="false"
         :columns="logColumn"
         :data-source="logList"
         :loading="tableLoad"
         :row-selection="logRowSelectionType"
         row-class-name="hover-cursor-pointer"
         :on-row="handleRowClick"
         row-key="id"
         :scroll="{x: 1500}"
     >
       <template #title>
         <a-flex :gap="8">
           <a-popconfirm title="删除后不可恢复，是否删除？"
                         :open="openDeletePopconfirm"
                         ok-text="确 定"
                         cancel-text="取 消"
                         @confirm="handleDelete"
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

           <a-button ghost type="primary" @click="handleExportExcel">
             <template #icon>
               <ExportOutlined />
             </template>
             导出
           </a-button>
<!--           清空-->
           <a-popconfirm title="清空后不可恢复，是否清空？"
                         :ok-text="countdown === 0 ? '确 认' : '确 认 ' + countdown"
                         :okButtonProps="{disabled: countdown !== 0}"
                         @confirm="handleClear"
                         @open-change="(open: boolean) => startClearCountdown(open, 5)"
           >
             <a-button danger type="primary">
               <template #icon>
                 <DeleteFilled />
               </template>
               清 空
             </a-button>
           </a-popconfirm>
           <!--            表格设置-->
           <table-setting v-model="logColumn"/>
         </a-flex>
       </template>
      <template #bodyCell="{column,record,text}">
        <template v-if="column.key === 'description'">
          <a-tooltip>
            <template #title>
              {{text}}
            </template>
            <a-typography-link @click="(event:MouseEvent) => selectById(event, record.id)">
              {{text}}
            </a-typography-link>
          </a-tooltip>
        </template>
        <template v-if="column.key === 'executeStatus' && text">
          <dict-tag :dict-data-option="sys_log_status" :dict-data-value="text"></dict-tag>
        </template>
        <template v-if="column.key === 'clientType' && text">
          <dict-tag :dict-data-option="sys_client_type" :dict-data-value="text"></dict-tag>
        </template>
        <template v-if="column.key === 'createTime'">
          {{dayjs(text).format('YYYY-MM-DD HH:mm:ss')}}
        </template>
        <template v-if="column.key === 'executeTime'">
          {{text ? text + ' 毫秒' : ''}}
        </template>
      </template>
       <template #footer>
         <a-flex justify="flex-end">
           <a-pagination v-model:current="logQuery.pageNum"
                         v-model:page-size="logQuery.pageSize"
                         show-size-changer
                         :total="logTotal"
                         :show-total="(total:number) => `共 ${total} 条`"
                         @change="initPage"/>
         </a-flex>
       </template>
     </a-table>
     </a-card>
   </a-flex>
<!--   日志详情模态框-->
   <a-modal cancelText="关 闭" v-model:open="openModal" width="1000px" :footer="null">
     <a-descriptions title="日志详情" bordered :column="3" :styles="{label: {width: '110px'}}">
        <a-descriptions-item label="业务类型" :span="1">{{logInfo.typeMsg}}</a-descriptions-item>
        <a-descriptions-item label="业务描述" :span="1">{{logInfo.description}}</a-descriptions-item>
        <a-descriptions-item label="执行结果" :span="1">
          <dict-tag v-if="logInfo.executeStatus" :dict-data-option="sys_log_status" :dict-data-value="logInfo.executeStatus"/>
        </a-descriptions-item>
        <a-descriptions-item label="客户端" :span="1">
          <dict-tag v-if="logInfo.clientType" :dict-data-option="sys_client_type" :dict-data-value="logInfo.clientType"/>
        </a-descriptions-item>
        <a-descriptions-item label="操作人" :span="1">{{logInfo.createName}}</a-descriptions-item>
        <a-descriptions-item label="操作时间" :span="1">{{dayjs(logInfo.createTime).format("YYYY-MM-DD HH:mm:ss")}}</a-descriptions-item>
        <a-descriptions-item label="执行耗时" :span="1">{{logInfo.executeTime ? logInfo.executeTime + ' 毫秒' : ''}}</a-descriptions-item>
        <a-descriptions-item label="用户ip" :span="1">{{logInfo.ipAddress}}</a-descriptions-item>
        <a-descriptions-item label="所属地区" :span="1">{{logInfo.region}}</a-descriptions-item>
        <a-descriptions-item label="类名" :span="2" class="detail-long-text">{{logInfo.className}}</a-descriptions-item>
        <a-descriptions-item label="方法名" :span="1">{{logInfo.methodName}}</a-descriptions-item>
        <a-descriptions-item label="TraceId" :span="3">{{logInfo.traceId}}</a-descriptions-item>
        <a-descriptions-item label="请求地址" :span="3" class="detail-long-text">{{logInfo.url}}</a-descriptions-item>
        <a-descriptions-item label="参数" :span="3" v-if="logInfo.params" class="detail-long-text">{{logInfo.params}}</a-descriptions-item>
        <a-descriptions-item label="返回值" :span="3" v-if="logInfo.result" class="detail-long-text">{{logInfo.result}}</a-descriptions-item>
        <a-descriptions-item label="缓存key" :span="3" class="detail-long-text">{{logInfo.cacheKey}}</a-descriptions-item>
        <a-descriptions-item label="操作环境" :span="3" class="detail-long-text">{{logInfo.userAgent}}</a-descriptions-item>
        <a-descriptions-item label="异常信息" :span="3" v-if="logInfo.executeStatus === '1'" class="detail-long-text">{{logInfo.errorMsg}}</a-descriptions-item>
        <a-descriptions-item label="异常堆栈" :span="3" v-if="logInfo.executeStatus === '1'" class="detail-long-text">{{logInfo.errorStack}}</a-descriptions-item>
     </a-descriptions>
   </a-modal>
 </div>
</template>

<script setup lang="ts">
import {initDict} from "@/helpers/dict.ts"
import {computed, ref} from "vue";
import {
  clearOperateLog,
  deleteOperateByIds,
  excelOperateExport,
  getLogTypeOption,
  queryOperateById,
  queryOperatePage
} from "@/api/system/log/log.ts";
import {message, type TableColumnsType} from "@/antd-adapter";
import DictTag from "@/components/dict-tag/index.vue";
import type {SysLog, SysLogDTO} from "@/api/system/log/type/sys-log.ts";
import dayjs from "dayjs";
import {download} from "@/utils/attachment-download.ts";
import Spin from "@/components/spin";
import TableSetting from "@/components/table-setting/index.vue";

const {sys_log_status, sys_client_type} = initDict("sys_log_status", "sys_client_type")


const initSearch = () => {
  // 操作类型选项
  const logTypeOption = ref<Array<{ value: string, label: string }>>([])
  const initLogTypeOption = async () => {
    const resp = await getLogTypeOption();
    if (resp.code === 200) {
      logTypeOption.value = resp.data
    } else {
      message.error(resp.msg)
    }
  }
  initLogTypeOption()

  // 选中的数据id集合
  const selectedIds = ref<Array<string>>([])
  // 列表勾选对象
  // selectedRowKeys 必须传真实数组：vnext 内部会展开迭代该字段，直接传 ref 会抛 not iterable
  const logRowSelectionType = computed(() => ({
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
  const handleRowClick = (record:SysLog) => {
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

  const logColumn = ref<TableColumnsType>([
    {
      title: '日志描述',
      key: 'description',
      dataIndex: 'description'
    },
    {
      title: '业务类型',
      key: 'typeMsg',
      dataIndex: 'typeMsg'
    },
    {
      title: '操作人员',
      key: 'createName',
      dataIndex: 'createName',
      align: 'center'
    },
    {
      title: 'ip 地址',
      key: 'ipAddress',
      dataIndex: 'ipAddress',
      align: 'center'
    },{
      title: '地区',
      key: 'region',
      dataIndex: 'region',
      align: 'center',
      ellipsis: true
    },
    {
      title: '执行结果',
      key: 'executeStatus',
      dataIndex: 'executeStatus',
      align: 'center',
      width: 100
    },
    {
      title: '客户端类型',
      key: 'clientType',
      dataIndex: 'clientType',
      align: 'center',
      width: 120
    },
    {
      title: '操作时间',
      key: 'createTime',
      dataIndex: 'createTime',
      align: 'center',
      width: 200
    },
    {
      title: '操作耗时',
      key: 'executeTime',
      dataIndex: 'executeTime',
      align: 'center'
    }
  ])

  const reloadPage = async () => {
    logQuery.value = {
      pageNum: 1,
      pageSize: 10
    }
    await initPage()
  }

  const logQuery = ref<SysLogDTO>({
    pageNum: 1,
    pageSize: 10
  })

  const logTotal = ref<number>()
  const logList = ref<Array<SysLog>>([])
  const tableLoad = ref<boolean>(false)

  const queryPage = async () => {
    logQuery.value.pageNum = 1
    await initPage()
  }

  const initPage = async () => {
    tableLoad.value = true
    try {
      const resp = await queryOperatePage(logQuery.value)
      if (resp.code === 200) {
        logTotal.value = resp.data.total
        logList.value = resp.data.records
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoad.value = false
    }
  }
  queryPage()
  return {
    logTypeOption,
    logColumn,
    tableLoad,
    logList,
    logQuery,
    logTotal,
    logRowSelectionType,
    selectedIds,
    handleRowClick,
    queryPage,
    initPage,
    reloadPage
  }
}

const {logTypeOption, logColumn, tableLoad, logList, logQuery, logTotal, logRowSelectionType, selectedIds, handleRowClick, queryPage, initPage, reloadPage} = initSearch()


// 初始化获取日志详情
const initLogInfo = () => {
  // 模态框
  const openModal = ref<boolean>(false)
  // 日志详情
  const logInfo = ref<SysLog>({})
  // 根据id查询日志详情
  const selectById = async (event:MouseEvent, id: string) => {
    event.stopPropagation()

    const resp = await queryOperateById(id)
    if (resp.code === 200) {
      logInfo.value = resp.data
      closePopconfirm()
      openModal.value = true
    } else {
      message.error(resp.msg)
    }
  }

  return {
    openModal,
    logInfo,
    selectById
  }
}

const {openModal, logInfo, selectById} = initLogInfo()

// 删除日志
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
  const handleDelete = async () => {
    const deleteIds = [...selectedIds.value]
    try {
      if (deleteIds.length > 0) {
        const resp = await deleteOperateByIds(deleteIds)
        if (resp.code === 200) {
          message.success(resp.msg);
          selectedIds.value = []
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

const {openDeletePopconfirm,closePopconfirm,handleDelete,openPopconfirm} = initDelete()

// 初始化清空日志
const initClear = () => {
  // 清空按钮倒计时
  const countdown = ref<number>()
  const interval = ref<ReturnType<typeof setInterval> | undefined>()

  // 开始清空数据倒计时
  const startClearCountdown = (open: boolean, second: number) => {
    clearInterval(interval.value)
    if (open) {
      countdown.value = second
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
  }

  // 处理清除数据
  const handleClear = async () => {
    const resp = await clearOperateLog()
    if (resp.code === 200) {
      message.success(resp.msg);
      selectedIds.value = []
      await initPage()
    } else {
      message.error(resp.msg);
    }
  }

  return {
    countdown,
    startClearCountdown,
    handleClear,
  }
}

const { countdown, startClearCountdown, handleClear} = initClear()


// 处理excel 导出
const handleExportExcel = async () => {
  const spinInstance = Spin.service({
    description: '努力加载中...'
  });

  try {
    const blob = await excelOperateExport(logQuery.value)
    download(blob, "操作日志")
  } catch (e) {
    message.error("导出失败")
  } finally {
    spinInstance.close()
  }
}
</script>


<style scoped>
/* 长文本字段（URL/JSON/UA/堆栈等）允许在单元格内断行，防止撑破布局 */
:deep(.detail-long-text) {
  word-break: break-all;
}
</style>