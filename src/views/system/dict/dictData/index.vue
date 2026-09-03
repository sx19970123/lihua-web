<template>
  <a-flex vertical :gap="16">
    <a-card class="mt-ant-lg" :styles="{body: {'padding-bottom': '0'}}">
      <a-form :colon="false">
        <a-row :gutter="16">
          <a-col>
            <a-form-item label="标签">
              <a-input v-model:value="dictDataQuery.label" allow-clear placeholder="请输入字典标签"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="值">
              <a-input v-model:value="dictDataQuery.value" allow-clear placeholder="请输入字典值"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item label="状态">
              <a-select v-model:value="dictDataQuery.status" allow-clear placeholder="请选择" :options="sys_status"/>
            </a-form-item>
          </a-col>
          <a-col>
            <a-form-item>
              <a-space size="small">
                <a-button type="primary"
                          @click="handleQueryList"
                          :loading="tableLoading"
                >
                  <template #icon>
                    <SearchOutlined />
                  </template>
                  查 询
                </a-button>
                <a-button @click="resetList"
                          :loading="tableLoading"
                >
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
    <a-card :styles="{body: {padding: 0}}">
        <a-table
            :scroll="{ x: 1000 }"
            :columns="dictDataColumn"
            :data-source="dictDataList"
            :loading="tableLoading"
            :pagination="false"
            v-model:expandedRowKeys="expandedRowKeys"
            rowKey="id"
            sticky
        >
          <template #title>
            <a-flex :gap="8">
              <a-button type="primary" @click="handleAdd">
                <template #icon>
                  <PlusOutlined />
                </template>
                新 增
              </a-button>
              <a-button v-if="editingCount >= 2" @click="handleBatchSave" :loading="tableLoading">
                <template #icon>
                  <SaveOutlined />
                </template>
                批量保存
              </a-button>
              <!-- settingKey 用于和同路由的主表设置隔离存储 -->
              <table-setting v-model="dictDataColumn" setting-key="dictData"/>
            </a-flex>
          </template>

          <template #bodyCell="{column,text,record}">
            <!--            可编辑内容-->
            <!--          标签-->
            <template v-if="'label' === column.dataIndex">
              <a-input
                  v-if="editableData[record.id]"
                  class="err-placeholder"
                  :class="record.id"
                  placeholder="请输入标签"
                  :status="editableData[record.id].label?'':'error'"
                  v-model:value="editableData[record.id].label"
                  allow-clear/>
              <template v-else>
                {{ text }}
              </template>
            </template>
            <!--          值-->
            <template v-if="'value' === column.dataIndex">
              <a-input
                  v-if="editableData[record.id]"
                  class="err-placeholder"
                  placeholder="请输入值"
                  :status="editableData[record.id].value?'':'error'"
                  v-model:value="editableData[record.id].value"
                  allow-clear
                  @change="() => { if (editableData[record.id].dictTypeCode === 'sys_dict_tag_style') editableData[record.id].tagStyle = editableData[record.id].value }"
              />
              <!--当编辑字典为标签样式时，调用change方法，设置tagStyle值为value-->
              <template v-else>
                {{ text }}
              </template>
            </template>
            <!--          标签样式-->
            <template v-if="'tagStyle' === column.dataIndex">
              <!--当编辑字典为标签样式时，不展示选择框，进行标签样式预览-->
              <template v-if="editableData[record.id] && editableData[record.id].dictTypeCode === 'sys_dict_tag_style'">
                <a-tag :color="editableData[record.id].value" variant="outlined">{{editableData[record.id].label}}</a-tag>
              </template>
              <template v-else-if="editableData[record.id] && editableData[record.id].dictTypeCode !== 'sys_dict_tag_style'">
                <a-select v-model:value="editableData[record.id].tagStyle" placeholder="请选择" :options="tagStyleOptions"/>
              </template>
              <template v-else>
                <dict-tag :dict-data-value="text" :dict-data-option="sys_dict_tag_style"/>
              </template>
            </template>
            <!--          状态-->
            <template v-if="'status' === column.dataIndex">
              <a-select v-if="editableData[record.id]"  v-model:value="editableData[record.id].status" :options="sys_status"/>
              <template v-else>
                <dict-tag :dict-data-value="text" :dict-data-option="sys_status"/>
              </template>
            </template>
            <!--          排序-->
            <template v-if="'sort' === column.dataIndex">
              <a-input-number
                  v-if="editableData[record.id]"
                  class="err-placeholder"
                  placeholder="请输入排序值"
                  :status="editableData[record.id].sort?'':'error'"
                  v-model:value="editableData[record.id].sort"
                  allow-clear
              />
              <template v-else>
                {{ text }}
              </template>
            </template>
            <!--          备注-->
            <template v-if="'remark' === column.dataIndex">
              <a-form-item class="form-item-single-line">
                <a-input v-if="editableData[record.id]"
                         placeholder="请输入备注"
                         v-model:value="editableData[record.id].remark"
                         allow-clear
                />
                <template v-else>
                  {{ text }}
                </template>
              </a-form-item>
            </template>
            <template v-if="column.key === 'action'">
              <!--            编辑列-->
              <template v-if="editableData[record.id]">
                <a-button type="link" size="small" html-type="submit" @click="handleSave(record.id)">
                  保存
                </a-button>
                <a-divider :vertical="true"/>
                <a-button type="link" size="small" danger @click="handleCancel(record.id, true)">
                  取消
                </a-button>
              </template>
              <template v-else>
                <a-button type="link" size="small" @click="handleEdit(record)">
                  编辑
                </a-button>
                <template v-if="props.type === '1'">
                  <a-divider :vertical="true"/>
                  <a-button type="link" size="small" @click="handleAddChildren(record)">
                    添加下级
                  </a-button>
                </template>
                <a-divider :vertical="true"/>
                <a-popconfirm title="删除后不可恢复，是否删除？"
                              ok-text="确 定"
                              cancel-text="取 消"
                              placement="bottomRight"
                              @confirm="handleDelete(record.id)"
                >
                  <a-button type="link" danger size="small">
                    删除
                  </a-button>
                </a-popconfirm>
              </template>
            </template>
          </template>
        </a-table>
    </a-card>
  </a-flex>
</template>

<script setup lang="ts">
// 接收父组件传入的typeId
import {deleteData, queryList, save} from "@/api/system/dict/dict-data.ts";
import type {UnwrapRef} from 'vue';
import {computed, h, nextTick, reactive, ref} from "vue";
import {Tag} from "antdv-next";
import {message, type TableColumnsType} from "@/antd-adapter";
import {cloneDeep} from 'lodash-es';
import {initDict, reLoadDict} from "@/helpers/dict.ts";
import dictTag from "@/components/dict-tag/index.vue"
import TableSetting from "@/components/table-setting/index.vue";
import type {SysDictDataType, SysDictDataTypeDTO} from "@/api/system/dict/type/sys-dict-data-type.ts";
import {v4 as uuidv4} from "uuid";

const props = defineProps<{
  typeCode: string,
  type: string
}>()

const {sys_status,sys_dict_tag_style} = initDict("sys_status","sys_dict_tag_style")

// 标签样式选项以彩色 tag 作为选项内容，选中回显同样渲染 tag
const tagStyleOptions = computed(() => sys_dict_tag_style.value.map(item => ({
  value: item.value,
  label: h(Tag, {color: item.value, variant: 'filled'}, () => item.label)
})))

// 查询
const initSearch = () => {
  // 定义表头
  const dictDataColumn = ref<TableColumnsType>([
    {
      title: '标签',
      dataIndex: 'label',
      key: 'label',
      width: 200
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '样式',
      dataIndex: 'tagStyle',
      key: 'tagStyle',
      align: 'center',
      width: 110
    },
    {
      title: '状态',
      dataIndex: 'status',
      align: 'center',
      key: 'status',
      width: 100
    },
    {
      title: '排序',
      dataIndex: 'sort',
      align: 'center',
      key: 'sort',
      width: 106
    },
    {
      title: '备注',
      dataIndex: 'remark',
      key: 'remark'
    },
    {
      title: '操作',
      align: 'center',
      key: 'action',
      width: props.type === '1' ? 238 : 148,
      fixed: 'right'
    },
  ])
  // 定义查询条件对象
  const dictDataQuery = ref<SysDictDataTypeDTO>({dictTypeCode: props.typeCode,type: props.type})
  // 定义查询出的列表集合
  const dictDataList = ref<Array<SysDictDataType>>([])
  // 默认展开
  const expandedRowKeys = ref<Array<string>>([])
  // 定义列表加载
  const tableLoading = ref<boolean>(false)
  // 查询列表
  const handleQueryList = async () => {
    tableLoading.value = true
    try {
      const resp = await queryList(dictDataQuery.value)
      if (resp.code === 200) {
        dictDataList.value = resp.data
      } else {
        message.error(resp.msg)
      }
    } finally {
      tableLoading.value = false
    }
  }

  // 重置列表查询
  const resetList = () => {
    dictDataQuery.value.dictTypeCode = props.typeCode
    dictDataQuery.value.value = undefined
    dictDataQuery.value.label = undefined
    dictDataQuery.value.status = undefined
    handleQueryList()
  }

  handleQueryList()
  return {
    dictDataQuery,
    dictDataColumn,
    dictDataList,
    handleQueryList,
    resetList,
    tableLoading,
    expandedRowKeys
  }
}
const {dictDataQuery, dictDataColumn, dictDataList, handleQueryList, resetList, tableLoading, expandedRowKeys} = initSearch()

// 新增/新增下级
const initAdd = () => {
  // 编辑中数据
  const editableData:UnwrapRef<Record<string, SysDictDataType>> = reactive({})

  // 处理新增
  const handleAdd = () => {
    const tempId = generateTempId()
    // 新增默认数据
    const item: SysDictDataType = {
      id: tempId,
      status: '0',
      sort: generateDefaultSort(dictDataList.value),
      parentId: '0',
      tagStyle: 'default',
      dictTypeCode: props.typeCode
    }
    // 添加到集合
    dictDataList.value.push(item)
    handleEdit(item)
  }

  // 处理新增子集
  const handleAddChildren = (data: SysDictDataType) => {
    if (!data.children) {
      data.children = []
    }
    const tempId = generateTempId()
    const item = {
      id: tempId,
      status: '0',
      sort: generateDefaultSort(data.children),
      dictTypeCode: props.typeCode,
      parentId: data.id,
      tagStyle: 'default',
    }

    data.children.push(item)
    handleEdit(item)
    // 展开数据
    if (data.id) {
      expandedRowKeys.value.push(data.id)
    }
  }

  // 处理点击编辑
  const handleEdit = (data: SysDictDataType) => {
    if (data.id) {
      editableData[data.id] = cloneDeep(data)
      handleTreeIconFlex(data.id)
    }
  }

  // 处理点击取消
  const handleCancel = (id: string,deleteData: boolean) => {
    if (editableData[id]) {
      delete editableData[id]
    }

    if (deleteData && checkIsTempId(id)) {
      handleDelete(id)
    }

    if (Object.keys(editableData).length === 0) {
      recoverTreeIcon(id)
    }
  }

  // 生成临时序号
  const generateDefaultSort = (list: Array<SysDictDataType>): number => {
    if (!list) {
      return 1
    }

    const last = list[list.length - 1]
    if (last && last.sort) {
      return last.sort + 1
    }

    return 1
  }
  // 生成临时id
  const generateTempId = () => {
    return 'add-' + uuidv4()
  }
  // 检查是否为临时id
  const checkIsTempId = (id: string): boolean => {
    return /^add-/.test(id);
  }

  // 解决在树形表格编辑下，input框分行的问题
  const handleTreeIconFlex = (id: string) => {
    // dom 元素挂载完成执行
    nextTick(() => {
      const tdElements = document.getElementsByClassName('ant-table-cell-with-append');
      if (tdElements) {
        for (let i = 0; i < tdElements.length; i++) {
          const td = tdElements[i] as HTMLElement;
          const targetClassList = td.getElementsByClassName(id)
          const btnList = td.getElementsByTagName("button")
          if (targetClassList.length > 0) {
            td.style.display = 'flex';
            td.style.alignItems = 'center';
          }
          if (btnList && btnList.length == 1) {
            btnList[0].style.paddingRight = '15px'
          }
        }
      }
    })
  }
  // 编辑完成后，恢复原有样式
  const recoverTreeIcon = (id:string) => {
    const tdElements = document.getElementsByClassName('ant-table-cell-with-append');
    if (tdElements) {
      for (let i = 0; i < tdElements.length; i++) {
        const td = tdElements[i] as HTMLElement;
        const targetClassList = td.getElementsByClassName(id)
        const btnList = td.getElementsByTagName("button")
        if (targetClassList.length > 0) {
          td.style.display = '';
          td.style.alignItems = '';
        }
        if (btnList && btnList.length == 1) {
          btnList[0].style.paddingRight = '0'
        }
      }
    }
  }

  return {
    editableData,
    handleAdd,
    handleEdit,
    handleCancel,
    checkIsTempId,
    handleAddChildren
  }
}
const {editableData,handleAdd,handleEdit,handleCancel,checkIsTempId,handleAddChildren} = initAdd()
// 保存方法
const initSave = () => {
  // 校验编辑数据完整性，返回错误提示（空串表示通过；sort 允许为 0，仅排除空值）
  const checkRowValid = (data: SysDictDataType) => {
    if (!data?.label || !data?.value || data?.sort == null) {
      return '请将数据填写完整'
    }
    if (!data?.dictTypeCode) {
      return '数据类型编码为空'
    }
    return ''
  }

  // 保存单条编辑数据：提交并合并列表、关闭编辑态，返回成功提示文案，失败返回 null（单条/批量保存共用）
  const saveRow = async (id: string): Promise<string | null> => {
    const data = editableData[id]
    if (!data) {
      return null
    }
    // 临时 id 置空，由后端生成正式 id
    if (data.id && checkIsTempId(data.id)) {
      data.id = undefined
    }
    try {
      const resp = await save(data)
      if (resp.code === 200) {
        data.id = resp.data
        // 保存的数据合并回列表
        handleDeepSave(id, dictDataList.value, data)
        // 关闭编辑框
        handleCancel(id, false)
        // 重新排序
        handleSort(dictDataList.value)
        return resp.msg
      }
      message.error(resp.msg)
      return null
    } catch {
      // 请求异常已由拦截器统一提示，返回 null 让批量流程继续处理下一行
      return null
    }
  }

  // 单条保存（行内保存按钮）
  const handleSave = async (id: string) => {
    if (!editableData[id]) {
      message.error("没有可编辑的数据")
      return
    }
    const invalidMsg = checkRowValid(editableData[id])
    if (invalidMsg) {
      message.error(invalidMsg)
      return
    }
    tableLoading.value = true
    try {
      const msg = await saveRow(id)
      if (msg !== null) {
        message.success(msg)
        // 字典数据已变更，刷新 store 缓存使消费页即时更新
        reLoadDict(props.typeCode)
      }
    } finally {
      tableLoading.value = false
    }
  }

  // 批量保存所有编辑中的数据：先整体校验，再逐条提交，全部完成后统一提示
  const handleBatchSave = async () => {
    const ids = Object.keys(editableData)
    if (ids.length === 0) {
      message.warning("没有正在编辑的数据")
      return
    }
    for (const id of ids) {
      const invalidMsg = checkRowValid(editableData[id])
      if (invalidMsg) {
        message.error("存在未填写完整的数据，请补全后重试")
        return
      }
    }
    tableLoading.value = true
    let successCount = 0
    try {
      for (const id of ids) {
        if (await saveRow(id) !== null) {
          successCount++
        }
      }
      if (successCount === ids.length) {
        message.success(`批量保存成功（${successCount} 条）`)
      } else {
        message.error(`保存成功 ${successCount} 条，失败 ${ids.length - successCount} 条，失败项保留编辑状态`)
      }
      if (successCount > 0) {
        // 字典数据已变更，刷新 store 缓存使消费页即时更新（按字典类型只刷一次）
        reLoadDict(props.typeCode)
      }
    } finally {
      tableLoading.value = false
    }
  }

  // 保存成功后不重新加载列表，而是修改列表中的数据
  const handleDeepSave = (id: string, list: SysDictDataType[], data: SysDictDataType) => {
    for (let item of list) {
      if (item.id === id) {
        for (let dataKey in data) {
          (item as any)[dataKey] = (data as any)[dataKey];
        }
        // 匹配到了对应的项，不需要继续遍历其子项
        return;
      }
      if (item.children && item.children.length > 0) {
        // 使用类型断言告诉 TypeScript 对象的确切类型
        handleDeepSave(id, item.children as SysDictDataType[], data);
      }
    }
  };


  return {
    handleSave,
    handleBatchSave
  }
}
const { handleSave, handleBatchSave } = initSave()
// 删除方法
const initDelete = () => {
  // 处理删除
  const handleDelete = async (id: string) => {
    const list = dictDataList.value
    // 新增未保存的id直接删除前端数据
    if (checkIsTempId(id)) {
      handleDeleteTableData(id,list)
      message.success("成功")
    } else {
      // 其余数据从库中删除
      const resp = await deleteData([id])
      if (resp.code === 200) {
        handleDeleteTableData(id,list)
        message.success(resp.msg)
      } else {
        message.error(resp.msg)
      }
    }
    handleSort(list)
  }

  // 处理删除集合中的数据（id 唯一，命中即返回，避免 splice 后数组移位跳过兄弟项的子树检查）
  const handleDeleteTableData = (id: string, list: SysDictDataType[]) => {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (item.id === id) {
        list.splice(i, 1);
        return;
      }
      if (item.children && item.children.length > 0) {
        handleDeleteTableData(id, item.children);
        // 递归回调后子集删空则置 undefined
        if (item.children.length === 0) {
          item.children = undefined;
        }
      }
    }
  };

  return {
    handleDelete
  }
}
const { handleDelete } = initDelete()

// 正在编辑的行数（两行及以上展示批量保存入口）
const editingCount = computed(() => Object.keys(editableData).length)

// 处理排序
const handleSort = (list: SysDictDataType[]) => {
  if (list) {
    list.forEach(item => {
      if (item.children && item.children.length > 0) {
        handleSort(item.children);
      }
    })
    list.sort((a, b) => {
      if (a.sort !== undefined && b.sort !== undefined) {
        return a.sort - b.sort;
      } else if (a.sort === undefined && b.sort !== undefined) {
        return 1; // a.sort 为 undefined，排到后面
      } else if (a.sort !== undefined && b.sort === undefined) {
        return -1; // b.sort 为 undefined，排到前面
      } else {
        return 0; // 两者都为 undefined，保持原有顺序
      }
    });
  }
}

</script>

<style>
/* 抽屉体滚动条：套用全站内滚容器约定（thin + 主题色变量），暗色自动跟随 */
.ant-drawer-body {
    scrollbar-width: thin;
    scrollbar-color: var(--lihua-scrollbar-thumb-color);
}
.err-placeholder {
  .ant-input-number-input::placeholder,
  .ant-input::placeholder {
    color: rgba(255, 77, 79, 0.7) !important;
  }
}
</style>

