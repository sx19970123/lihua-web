<template>
  <a-flex vertical :gap="16">
    <!--      查询条件-->
    <a-card class="mt-ant-lg" :styles="{body: {'padding-bottom': '0'}}">
      <a-form :colon="false">
        <a-row :gutter="16">
          <a-col>
            <a-form-item label="部门">
              <a-tree-select
                  class="default-input-width"
                  placeholder="请选择部门"
                  v-model:value="userQuery.deptIdList"
                  show-checked-strategy="SHOW_ALL"
                  :maxTagCount="3"
                  :tree-data="sysDeptList"
                  :fieldNames="{children:'children', label:'name', value: 'id' }"
                  tree-node-filter-prop="label"
                  multiple
                  allowClear
              />
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="昵称">
              <a-input placeholder="请输入昵称" allowClear v-model:value="userQuery.nickname"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="用户名">
              <a-input placeholder="请输入用户名" allowClear v-model:value="userQuery.username"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="授权状态">
              <a-select placeholder="请选择" allowClear v-model:value="userQuery.authorized" :options="authorizedOptions"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="状态">
              <a-select placeholder="请选择" allowClear v-model:value="userQuery.status" :options="sys_status"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item>
              <a-space size="small">
                <a-button type="primary" :loading="tableLoad" @click="handleQueryPage">
                  <template #icon>
                    <SearchOutlined />
                  </template>
                  查 询
                </a-button>
                <a-button :loading="tableLoad" @click="resetPage">
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
    <!--      用户授权列表-->
    <a-card :styles="{body: {padding: 0}}">
      <a-table
          :scroll="{x: 800}"
          :columns="userColumn"
          :data-source="userList"
          :pagination="false"
          :loading="tableLoad"
          :row-selection="userRowSelectionType"
          row-class-name="hover-cursor-pointer"
          :on-row="handleRowClick"
          row-key="id"
          sticky
      >
        <template #title>
          <a-flex :gap="8">
            <a-button type="primary" @click="handleBatchAuthorize">
              <template #icon>
                <UserAddOutlined />
              </template>
              授 权
              <span v-if="selectedIds && selectedIds.length > 0" class="ml-ant-xxs"> {{selectedIds.length}} 项</span>
            </a-button>
            <a-popconfirm title="取消后用户将失去该角色权限，是否取消？"
                          :open="openDeletePopconfirm"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleBatchDelete"
                          @cancel="closePopconfirm"
                          @open-change="(open: boolean) => !open ? closePopconfirm(): ''"
            >
              <a-button danger @click="openPopconfirm">
                <template #icon>
                  <DeleteOutlined />
                </template>
                取消授权
                <span v-if="selectedIds && selectedIds.length > 0" class="ml-ant-xxs"> {{selectedIds.length}} 项</span>
              </a-button>
            </a-popconfirm>
          </a-flex>
        </template>

        <template #bodyCell="{column,record,text}">
          <template v-if="column.key === 'action'">
            <a-popconfirm v-if="record.authorized"
                          title="取消后用户将失去该角色权限，是否取消？"
                          placement="bottomRight"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleToggleAuthorize(record)"
            >
              <a-button type="link" danger size="small" @click="(event: any) => event.stopPropagation()">
                取消授权
              </a-button>
            </a-popconfirm>
            <a-popconfirm v-else
                          title="确认授权该用户？"
                          placement="bottomRight"
                          ok-text="确 定"
                          cancel-text="取 消"
                          @confirm="handleToggleAuthorize(record)"
            >
              <a-button type="link" size="small" @click="(event: any) => event.stopPropagation()">
                授 权
              </a-button>
            </a-popconfirm>
          </template>
          <template v-if="column.key === 'authorized'">
            <a-tag :color="text ? 'success' : 'default'">{{text ? '已授权' : '未授权'}}</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <dict-tag :dict-data-value="text" :dict-data-option="sys_status"/>
          </template>
          <template v-if="column.key === 'createTime'">
            {{dayjs(text).format('YYYY-MM-DD HH:mm')}}
          </template>
        </template>
        <template #footer>
          <a-flex justify="flex-end">
            <a-pagination v-model:current="userQuery.pageNum"
                          v-model:page-size="userQuery.pageSize"
                          show-size-changer
                          :total="userTotal"
                          :show-total="(total:number) => `共 ${total} 条`"
                          @change="initPage"
            />
          </a-flex>
        </template>
      </a-table>
    </a-card>
  </a-flex>
</template>

<script setup lang="ts">
import {computed, onMounted, ref} from "vue";
import type {SysRoleUserDTO, SysRoleUserVO} from "@/api/system/role/type/sys-role.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import {getDeptOption} from "@/api/system/dept/dept.ts";
import {deleteUsers, queryUserPage, saveUsers} from "@/api/system/role/role.ts";
import {initDict} from "@/helpers/dict.ts";
import DictTag from "@/components/dict-tag/index.vue";
import {message, type TableColumnsType} from "@/antd-adapter";
import dayjs from "dayjs";

const props = defineProps<{
  // 角色id
  roleId: string
}>()

const {sys_status} = initDict("sys_status")

// 部门树
const initDeptData = () => {
  const sysDeptList = ref<Array<SysDept>>([])
  const initDept = async () => {
    const resp = await getDeptOption()
    if (resp.code === 200) {
      sysDeptList.value = resp.data
    } else {
      message.error(resp.msg)
    }
  }
  onMounted(initDept)

  return {
    sysDeptList
  }
}
const { sysDeptList } = initDeptData()

// 列表查询相关
const initSearch = () => {
  // 授权状态筛选项
  const authorizedOptions = [
    {label: '已授权', value: '1'},
    {label: '未授权', value: '0'}
  ]
  // 选中的数据id集合
  const selectedIds = ref<Array<string>>([])
  // 列表勾选对象
  // selectedRowKeys 必须传真实数组：vnext 内部会展开迭代该字段，直接传 ref 会抛 not iterable
  const userRowSelectionType = computed(() => ({
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
  // 点击选中行
  const handleRowClick = (record: SysRoleUserVO) => {
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

  // 列表列定义
  const userColumn = ref<TableColumnsType>([
    {
      title: '昵称',
      dataIndex: 'nickname',
      ellipsis: true,
      key: 'nickname'
    },
    {
      title: '用户名',
      dataIndex: 'username',
      ellipsis: true,
      key: 'username'
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      width: '90px',
      ellipsis: true,
      key: 'status',
    },
    {
      title: '授权状态',
      dataIndex: 'authorized',
      align: 'center',
      width: '100px',
      key: 'authorized',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      align: 'center',
      width: '170px',
      key: 'createTime',
    },
    {
      title: '操作',
      align: 'center',
      key: 'action',
      width: '100px',
      fixed: 'right',
    },
  ])

  // 查询条件
  const userQuery = ref<SysRoleUserDTO>({
    nickname: null,
    username: null,
    status: null,
    authorized: null,
    deptIdList: null,
    pageNum: 1,
    pageSize: 10,
  })
  // 列表数据
  const userList = ref<Array<SysRoleUserVO>>([])
  const userTotal = ref<number>()
  // 列表加载中loading
  const tableLoad = ref<boolean>(false)

  // 查询列表
  const initPage = async () => {
    tableLoad.value = true
    try {
      const resp = await queryUserPage(props.roleId, userQuery.value)
      if (resp.code === 200) {
        userList.value = resp.data.records
        userTotal.value = resp.data.total
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoad.value = false
    }
  }
  const resetPage = async () => {
    userQuery.value = {
      nickname: null,
      username: null,
      status: null,
      authorized: null,
      deptIdList: null,
      pageNum: 1,
      pageSize: 10,
    }
    await initPage()
  }

  initPage()
  return {
    authorizedOptions,
    selectedIds,
    userRowSelectionType,
    handleRowClick,
    userColumn,
    userQuery,
    userList,
    userTotal,
    tableLoad,
    initPage,
    resetPage
  }
}
const {authorizedOptions,selectedIds,userRowSelectionType,handleRowClick,userColumn,userQuery,userList,userTotal,tableLoad,initPage,resetPage} = initSearch()
// 查询按钮先回第一页：停留后页再输入筛选条件按旧页码查询会命中空页（对齐 user/post 页 handleQueryPage 范式）
const handleQueryPage = () => {
  userQuery.value.pageNum = 1
  initPage()
}

// 授权操作相关
const initAuthorize = () => {
  // 单个用户切换授权状态（局部更新，与状态列 switch 的处理方式一致）
  const handleToggleAuthorize = async (record: SysRoleUserVO) => {
    if (!record.id) {
      return
    }
    const request = record.authorized
        ? deleteUsers(props.roleId, [record.id])
        : saveUsers(props.roleId, [record.id])
    const resp = await request
    if (resp.code === 200) {
      record.authorized = !record.authorized
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  }

  // 批量授权（后端幂等：勾选中已授权的用户自动跳过）
  const handleBatchAuthorize = async () => {
    if (!selectedIds.value || selectedIds.value.length === 0) {
      message.warning("请勾选数据")
      return
    }
    const resp = await saveUsers(props.roleId, [...selectedIds.value])
    if (resp.code === 200) {
      message.success(resp.msg)
      selectedIds.value = []
      await initPage()
    } else {
      message.error(resp.msg)
    }
  }

  // 批量取消授权
  const openDeletePopconfirm = ref<boolean>(false)
  const openPopconfirm = () => {
    if (selectedIds.value && selectedIds.value.length > 0) {
      openDeletePopconfirm.value = true
    } else {
      message.warning("请勾选数据")
    }
  }
  const closePopconfirm = () => {
    openDeletePopconfirm.value = false
  }
  const handleBatchDelete = async () => {
    try {
      const resp = await deleteUsers(props.roleId, [...selectedIds.value])
      if (resp.code === 200) {
        message.success(resp.msg)
        selectedIds.value = []
        await initPage()
      } else {
        message.error(resp.msg)
      }
    } finally {
      closePopconfirm()
    }
  }

  return {
    handleToggleAuthorize,
    handleBatchAuthorize,
    openDeletePopconfirm,
    openPopconfirm,
    closePopconfirm,
    handleBatchDelete
  }
}
const {handleToggleAuthorize,handleBatchAuthorize,openDeletePopconfirm,openPopconfirm,closePopconfirm,handleBatchDelete} = initAuthorize()
</script>
