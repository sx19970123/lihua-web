<template>
  <div>
    <!-- box-shadow 内联保留：.ant-card:not(.ant-card-bordered) 根级 boxShadowTertiary（(0,2,0) 反杀 shadow-none 工具类） -->
    <a-card :variant="bordered ? 'outlined' : 'borderless'"
            :styles="cardStyles"
            style="box-shadow: none;"
            :style="{width: width + 'px'}">
      <!-- 三栏 header/body 同构：header 统一 42px 使分割线连成一条线，拖拽竖条调整各栏宽度，双击竖条重置比例 -->
      <div class="user-select-splitter" :style="{'--region-body-h': height + 'px'}">
        <a-splitter @resize="handleSplitterResize" @dragger-double-click="handleSplitterReset">
        <!--        部门检索组件-->
        <a-splitter-panel :size="splitterSizes[0]" min="20%" max="50%">
          <div class="flex flex-col h-full overflow-hidden">
            <div class="flex flex-none items-center h-42px px-ant-xs border-0 border-b border-solid border-[var(--ant-color-split)]">
              <a-input placeholder="请输入部门名称"
                       v-model:value="deptKeyword"
                       size="small"
                       allowClear
                       @change="handleChangeKeyword"
                       class="w-full">
                <template #suffix>
                  <SearchOutlined/>
                </template>
              </a-input>
            </div>
            <div class="flex-1 min-h-0 overflow-hidden py-4px">
              <a-spin :spinning="loadingTree" class="region-fill">
                <a-tree
                    v-if="sysDeptList && sysDeptList.length > 0"
                    :tree-data="sysDeptList"
                    :field-names="{children:'children', title:'name', key: 'id' }"
                    :height="height"
                    default-expand-all
                    v-model:expanded-keys="expandKeys"
                    @select="handleClickTree"
                >
                  <template #titleRender="{ name }">
                    <div v-if="name.indexOf(deptKeyword) > -1">
                      <span>{{name.substring(0,name.indexOf(deptKeyword))}}</span>
                      <span :style="{'color':  themeStore.getColorPrimary()}">{{deptKeyword}}</span>
                      <span>{{name.substring(name.indexOf(deptKeyword) + deptKeyword.length)}}</span>
                    </div>
                    <span v-else>{{ name }}</span>
                  </template>
                </a-tree>
                <a-empty v-else class="mt-ant-xs" :description="emptyDescription"/>
              </a-spin>
            </div>
          </div>
        </a-splitter-panel>
        <!--        用户勾选组件（表头即中栏 header，表体虚拟滚动）-->
        <!-- min 为列宽总和（48+110+110）加滚动条余量：面板窄于它时表头会折行、列会溢出 -->
        <!-- min 必须传数字：字符串会被按百分比解析；值为列宽总和（40+100+100）加滚动条余量，面板低于它时表格内容会被裁剪 -->
        <a-splitter-panel :size="splitterSizes[1]" :min="255">
          <div class="flex flex-col h-full overflow-hidden">
            <a-table :key="tableRenderKey"
                     :columns="userColumn"
                     :loading="loadingUser"
                     :row-selection="userRowSelectionType"
                     :on-row="handleRowClick"
                     :scroll="{y: height}"
                     :virtual="true"
                     :pagination="false"
                     :data-source="userList"
                     row-class-name="hover-cursor-pointer"
                     :styles="tableStyles"
                     class="w-full"
                     size="small"
                     row-key="id"
            />
          </div>
        </a-splitter-panel>
        <!--        已选用户组件-->
        <a-splitter-panel :size="splitterSizes[2]" min="20%" max="50%">
          <div class="flex flex-col h-full overflow-hidden">
            <div class="flex flex-none items-center h-42px px-ant-xs border-0 border-b border-solid border-[var(--ant-color-split)]">
              <a-flex justify="space-between" class="w-full">
                <div>
                   {{selectedIds.length}} 人
                </div>
                <a-button size="small"
                          danger
                          type="text"
                          :disabled="selectedIds.length === 0"
                          @click="() => selectedIds = []"
                >
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                   全部清空
                </a-button>
              </a-flex>
            </div>
            <div class="flex-1 min-h-0 overflow-y-auto scrollbar">
              <a-flex wrap="wrap" gap="small">
                <user-show :key="user.id"
                           @click="handleCancelSelect(user)"
                           v-for="user in selectUsers"
                           :avatar-json="user.avatar"
                           :nickname="user.nickname">
                  <template #hover>
                    <CloseOutlined/>
                  </template>
                </user-show>
              </a-flex>
            </div>
          </div>
        </a-splitter-panel>
      </a-splitter>
      </div>
    </a-card>
  </div>
</template>
<script lang="ts" setup>
import {getDeptOption} from "@/api/system/dept/dept.ts";
import {flattenTree} from "@/utils/tree.ts";
import {computed, onMounted, ref, watch} from "vue";
import type {CSSProperties} from "vue";
import {useThemeStore} from "@/stores/theme.ts";
import {useUserStore} from "@/stores/user.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import {cloneDeep} from "lodash-es";
import type {SysUser} from "@/api/system/user/type/sys-user.ts";
import UserShow from "@/components/user-show/index.vue"
import {CloseOutlined} from "@antdv-next/icons";
import {getUserOption, getUserOptionByUserIds} from "@/api/system/user/user.ts";
import {message} from "@/antd-adapter";

const themeStore = useThemeStore();

// 接收的参数：
// height 三个分栏的滚动区高度
// width 卡片宽度
// bordered 卡片边框
// bodyStyle 卡片body样式
// value/nickname/username v-model:id/nickname/username 的回显入参
// allDeptData 部门树是否取全量数据（false 时取当前用户可见部门）
// emptyDescription 空数据描述
const {height = 151, width = 750, bordered = true, bodyStyle = {padding: 0}, value, nickname, username, allDeptData = true, emptyDescription} = defineProps<{
  // 三个分栏的滚动区高度
  height?: number,
  // 卡片宽度
  width?: number,
  // 卡片边框
  bordered?: boolean,
  // 卡片body样式
  bodyStyle?: CSSProperties,
  // v-model:id 回显的用户id集合
  value?: string[],
  // v-model:nickname 回显的用户昵称集合
  nickname?: string[],
  // v-model:username 回显的用户名集合
  username?: string[],
  // 部门树是否取全量数据
  allDeptData?: boolean,
  // 空数据描述
  emptyDescription?: string
}>()

// Card 样式语义化结构：bodyStyle 对应 styles.body
const cardStyles = computed(() => ({body: bodyStyle}))

// 表头样式：cell 42px 与左右 region header 等高、底部分割线同色连成一条线（wrapper 槽位在 1.5.3 未接线到 fixHeader 容器，容器圆角走下方 CSS 覆盖）
const tableStyles = {
  header: {
    cell: {
      height: '42px',
      borderRadius: 0,
      borderBottom: '1px solid var(--ant-color-split)',
    }
  }
}

const emit = defineEmits<{
  'update:id': [ids: (string | undefined)[]],
  'update:nickname': [nicknames: (string | undefined)[]],
  'update:username': [usernames: (string | undefined)[]],
  change: [users: SysUser[]]
}>()

// 三栏宽度受控：拖拽时 onResize 回传 px 数组；双击拖拽条重置为默认比例（Splitter 只提供双击回调，重置需自行实现）
const DEFAULT_SPLITTER_SIZES = ['30%', '40%', '30%']
const splitterSizes = ref<Array<string | number>>([...DEFAULT_SPLITTER_SIZES])
// 表格重挂 key（随双击复位递增）
const tableRenderKey = ref(0)
const handleSplitterResize = (sizes: number[]) => {
  splitterSizes.value = sizes
}
const handleSplitterReset = () => {
  splitterSizes.value = [...DEFAULT_SPLITTER_SIZES]
  // 宽度跳变后表格的横向滚动/固定列阴影状态不会自动重算，key 换代强制重挂以清除残留状态
  tableRenderKey.value++
}

// 部门相关
const initDeptTree = () => {
  // 部门信息
  const sysDeptList = ref<Array<SysDept>>([])
  // 没有进行双向绑定的单位树
  let originDeptTree: Array<SysDept> = ([])
  // 所有树型节点id
  const deptIds: string[] = []
  // 部门树检索关键字
  const deptKeyword = ref<string>('')
  // 部门树配置信息
  const expandKeys = ref<string[]>([])
  // 树加载
  const loadingTree = ref<boolean>(false)
  // 初始化部门数据
  const initDept = async () => {
    // 非全量数据，从userStore中获取部门信息
    if (!allDeptData) {
      const userStore = useUserStore();
      handleDeptData(userStore.deptTrees)
     return;
    }

    // 全量数据，从后端查询
    loadingTree.value = true
    try {
      const resp = await getDeptOption()
      if (resp.code === 200) {
        handleDeptData(resp.data)
      } else {
        message.error(resp.msg)
      }
    } finally {
      loadingTree.value = false
    }
  }

  // 处理部门数据
  const handleDeptData = (data: Array<SysDept>) => {
    // 单位树
    sysDeptList.value = data
    // 未双向绑定的单位树
    originDeptTree = data
    // 处理为扁平化数据
    const flattenDeptList = flattenTree(data)
    // 获取全部部门id
    const mapIds = flattenDeptList.filter(item => item.id).map(item => item.id)
    deptIds.push(... (mapIds as string[]))
  }

  // 处理展开折叠
  const handleExpanded = () => {
    // 全部展开
    expandKeys.value = []
    expandKeys.value.push(... deptIds)
  }

  // 处理关键词过滤
  const filterTreeByLabel = (tree: Array<SysDept>, keyword: string): Array<SysDept> => {
    const cloneTree = cloneDeep(tree);

    const filterNode = (node: SysDept): SysDept | null => {
      if (node.children) {
        node.children = node.children.map(filterNode).filter((child): child is SysDept => child !== null);
      }
      return node.name?.includes(keyword) || (node.children && node.children.length > 0) ? node : null;
    };

    return cloneTree.map(filterNode).filter((node: SysDept | null): node is SysDept => node !== null);
  };
  // 关键词变化时进行过滤
  const handleChangeKeyword = () => {
    const value = deptKeyword.value
    if (value) {
      // 关键词输入时全部展开
      handleExpanded()
      // 对树型结构进行过滤
      sysDeptList.value = filterTreeByLabel(originDeptTree, value)
    } else {
      // value 为空时，还原树
      sysDeptList.value = cloneDeep(originDeptTree)
    }
  }

  initDept()
  return {
    deptKeyword,
    sysDeptList,
    expandKeys,
    loadingTree,
    handleChangeKeyword
  }
}
const  { deptKeyword, sysDeptList, expandKeys, loadingTree, handleChangeKeyword } = initDeptTree()

// 用户相关
const initUserTable = () => {
  // 选中的数据id集合
  const selectedIds = ref<Array<string>>([])
  // 选中的用户集合
  const selectUsers = ref<SysUser[]>([])
  // 用户加载
  const loadingUser = ref<boolean>(false)
  // 用户列表
  const userList = ref<SysUser[]>([])
  // 列表列：仅声明模板消费字段的本地结构类型，避免依赖组件库各版本漂移的列类型定义
  // width 必须显式声明：virtual 表体是 flex 行按列内联宽度排布，与表头 table 布局的均分算法不一致，缺省时会列边界错位
  type UserColumn = { title: string, key: string, dataIndex: string, width: number }
  const userColumn: UserColumn[] = [
    {
      title: '用户名',
      key: 'username',
      dataIndex: 'username',
      width: 100
    },
    {
      title: '用户昵称',
      key: 'nickname',
      dataIndex: 'nickname',
      width: 100
    }
  ]
  // 列表勾选对象（computed 保证 selectedRowKeys 始终是数组：vnext 内部会展开迭代该字段，直接传 ref 会在勾选联动时抛 not iterable）
  const userRowSelectionType = computed(() => ({
    type: 'checkbox' as const,
    // 勾选列宽度需与数据列一同显式声明，保证表头表体列边界一致
    columnWidth: 40,
    // 跨页勾选
    preserveSelectedRowKeys: true,
    // 指定选中id的数据集合，操作完后可手动清空
    selectedRowKeys: selectedIds.value,
    // 点击复选框触发
    onChange: (ids: Array<string>) => {
      selectedIds.value = ids
    },
  }))
  // 点击数据行选中
  const handleRowClick = (record:SysUser) => {
    return {
      onClick: () => {
        if (record.id) {
          const selected = [...selectedIds.value]
          if (selected.includes(record.id)) {
            selected.splice(selected.indexOf(record.id),1)
          } else {
            selected.push(record.id)
          }
          selectedIds.value = selected
        }
      }
    }
  }

  // 点击部门节点（select 事件载荷为选中 keys）
  const handleClickTree = async (selectedKeys: string[]) => {
    if (selectedKeys.length > 0) {
      loadingUser.value = true
      try {
        const resp = await getUserOption(selectedKeys[0])
        if (resp.code === 200) {
          userList.value = resp.data
        } else {
          message.error(resp.msg)
        }
      } finally {
        loadingUser.value = false
      }
    }
  }

  // 取消选中用户
  const handleCancelSelect = (user: SysUser) => {
    selectedIds.value = selectedIds.value.filter(id => id !== user.id)
  }

  return {
    userColumn,
    userRowSelectionType,
    userList,
    selectedIds,
    selectUsers,
    loadingUser,
    handleCancelSelect,
    handleClickTree,
    handleRowClick
  }
}
const { userColumn, userRowSelectionType, userList, selectedIds, selectUsers, loadingUser, handleCancelSelect, handleClickTree, handleRowClick } = initUserTable()

// 用户id回显相关
const initModelUserId = async () => {
  const userIds = value
  if (!userIds || userIds.length === 0) {
    return
  }

  // 根据id获取用户信息（id、昵称、头像、部门）
  const resp = await getUserOptionByUserIds(userIds)
  if (resp.code === 200) {
    userList.value = resp.data
    selectedIds.value = resp.data.filter(user => user.id !== undefined).map(user => user.id) as string[]
  } else {
    message.error(resp.msg)
  }
}

// 监听选中用户id获取selectUsers进行已选头像的显示和双向绑定赋值
watch(() => selectedIds.value, (value, oldValue) => {
  // 新增：差集找出新增 id，再从用户列表补入已选头像集合（Set 防大量勾选时 O(n²)）
  if (value.length > oldValue.length) {
    const oldIdSet = new Set(oldValue)
    const shownIdSet = new Set(selectUsers.value.map(item => item.id))
    userList.value.forEach(user => {
      if (user.id && !oldIdSet.has(user.id) && value.includes(user.id) && !shownIdSet.has(user.id)) {
        selectUsers.value.push(user)
      }
    })
  } else {
    // 减少，获取到减少的id，从 selectUsers中删除对应数据
    const decreaseIds = new Set(oldValue.filter(old => !value.includes(old)))
    selectUsers.value = selectUsers.value.filter(user => user.id && !decreaseIds.has(user.id))
  }

  emit('update:nickname', selectUsers.value.map(user => user.nickname))
  emit('update:id', selectUsers.value.map(user => user.id))
  emit('update:username', selectUsers.value.map(user => user.username))
  emit('change', selectUsers.value)
})

onMounted(() => {
  initModelUserId()
})
</script>

<style scoped>
/* splitter 高度 = header 42 + body 高：三栏面板等高，body 由 flex:1 天然对齐 */
.user-select-splitter {
  height: calc(42px + var(--region-body-h));
}

.user-select-splitter :deep(.ant-splitter) {
  height: 100%;
}

.user-select-splitter :deep(.ant-splitter-panel) {
  overflow: hidden;
}

/* 表头容器去上圆角：该容器无语义化样式槽位（fixHeader 的 FixedHolder 不透传 styles.header.wrapper），
   以完整链特异性 (0,4,0) 压过 cssinjs 的 .ant-table-wrapper .ant-table .ant-table-header (0,3,0)；
   空数据走另一条渲染分支（圆角挂在 .ant-table/.ant-table-container 上），一并取直角 */
.user-select-splitter :deep(.ant-table-wrapper .ant-table .ant-table-header),
.user-select-splitter :deep(.ant-table-wrapper .ant-table > .ant-table-container) {
  border-radius: 0;
}

/* a-spin 撑满 body，树虚拟滚动容器在其内 */
.region-fill {
  height: 100%;
}

.region-fill :deep(.ant-spin-container) {
  height: 100%;
}

/* thin 滚动条：树虚拟容器 / 表虚拟容器 / 表空态回退容器 */
:deep(.ant-tree-list-holder),
:deep(.ant-table-tbody-virtual-holder),
:deep(.ant-table-body) {
  scrollbar-width: thin;
}

/* 勾选列与首个数据列之间的短分隔线：antd 的 thead 分隔线规则显式排除了勾选列，
   这里按同款几何与分割色补一条（top 50% 居中、1px 宽、1.6em 高、主题 token 色） */
.user-select-splitter :deep(.ant-table-thead > tr > th.ant-table-selection-column::before) {
  position: absolute;
  top: 50%;
  inset-inline-end: 0;
  width: 1px;
  height: 1.6em;
  background-color: var(--ant-table-header-split-color);
  transform: translateY(-50%);
  content: "";
}

/* 空态占位撑满 body；virtual 模式下 antd 以高特异性给 placeholder cell 补了边框，这里以更高特异性去底线 */
:deep(.ant-table-placeholder > td) {
  height: var(--region-body-h);
}

.user-select-splitter :deep(.ant-table-wrapper .ant-table.ant-table-virtual .ant-table-placeholder .ant-table-cell),
.user-select-splitter :deep(.ant-table-placeholder .ant-table-cell) {
  border-bottom: none;
}

:deep(.ant-table-placeholder .ant-empty) {
  margin: 8px 0;
}
</style>
