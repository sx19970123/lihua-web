<template>
  <div class="unselectable rounded-ant-lg" :class="attrs.class" :style="attrs.style">
    <div v-if="showToolbar" class="mb-ant-xxs">
      <a-checkable-tag v-if="multiple" :checked="treeSetting.checked" @change="handleCheckedAll">全选/全不选</a-checkable-tag>
      <a-checkable-tag v-if="multiple" :checked="treeSetting.checkRelate" @change="handleCheckRelate">父子关联</a-checkable-tag>
      <a-checkable-tag :checked="treeSetting.expand" @change="handleExpandAll">展开/折叠</a-checkable-tag>
    </div>
    <a-card :styles="cardStyles" :variant="bordered ? 'outlined' : 'borderless'" class="shadow-none">
      <a-input v-if="showSearch" class="h-28px mb-ant-xs" :placeholder="searchPlaceholder" v-model:value="keyword" allowClear @change="handleKeywordChange"/>
      <!-- height（虚拟滚动）与 maxHeight（容器滚动）互斥，同传时以 height 为准 -->
      <div :style="maxHeight && height == null ? {maxHeight: maxHeight + 'px'} : {}" class="scrollbar" v-if="cloneTreeData && cloneTreeData.length > 0">
        <a-tree v-bind="treeAttrs"
                :tree-data="cloneTreeData"
                :field-names="fieldNames"
                :check-strictly="!treeSetting.checkRelate"
                v-model:expanded-keys="expandKeys"
                v-model:checked-keys="checkedKeys"
                :selected-keys="selectedKeys"
                :selectable="!multiple"
                :checkable="multiple"
                :height="height"
                :virtual="virtual"
                @check="handleSelect"
                @select="handleSelect"
                @expand="handleExpand"
                class="p-ant-xxs"
        >
          <template #titleRender="item" v-if="hasTitleSlot">
            <slot name="title" v-bind="{ ...item, keyword, segments: buildSegments(item[fieldNames.title]) }"/>
          </template>
          <template #titleRender="data" v-else>
            <span v-for="(segment, index) in buildSegments(data[fieldNames.title])" :key="index"
                  :style="segment.hit ? {color: themeStore.getColorPrimary()} : undefined">{{segment.text}}</span>
          </template>
        </a-tree>
      </div>
      <div v-else>
        <a-empty class="mt-ant-xs"/>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import {computed, onUnmounted, ref, useAttrs, useSlots, watch} from "vue";
import type {CSSProperties} from "vue";
import {traverse} from "@/utils/tree.ts";
import {cloneDeep, debounce} from 'lodash-es'
import {useThemeStore} from "@/stores/theme.ts";

// class/style 由根容器承接，其余透传属性（showLine/blockNode/height 等 a-tree 属性）作用于树
defineOptions({
  inheritAttrs: false
})

const attrs = useAttrs()
const treeAttrs = computed(() => {
  const {class: _cls, style: _style, ...rest} = attrs
  return rest
})

const themeStore = useThemeStore();
// 是否使用具名插槽title
const slots = useSlots();
const hasTitleSlot = computed(() => !!slots.title)
// 接收的参数：
// treeData 树形结构数据；
// fieldNames 树形结构字段对应别名
// defaultExpandAll 是否默认展开全部
// checkRelate 是否父子关联勾选
// multiple 是否支持多选
// showToolbar 是否显示工具栏
// showSearch 显示搜索框
// searchPlaceholder 搜索框提示词
// bodyStyle 卡片body样式
// maxHeight 最大高度
// bordered 展示边框
// modelValue v-model双向绑定
const {treeData, fieldNames = {
  children: 'children',
  title: 'label',
  key: 'id'
}, defaultExpandAll = false, checkRelate = false, multiple = true, showToolbar = true, showSearch = true, searchPlaceholder = "请输入关键词", searchDebounce = 300, bodyStyle = {padding: 'var(--ant-padding-xs)',borderRadius: 'var(--ant-border-radius-lg)'}, maxHeight, height, virtual, bordered = true, modelValue} = defineProps<{
  // 树形结构数据
  treeData: Array<Record<string, any>>,
  // 树形结构别名
  fieldNames?: {
    children: string,
    title: string,
    key: string
  },
  // 是否默认展开全部
  defaultExpandAll?: boolean,
  // 是否父子关联勾选
  checkRelate?: boolean,
  // 是否支持多选
  multiple?: boolean,
  // 显示工具栏
  showToolbar?: boolean,
  // 显示搜索框
  showSearch?: boolean,
  // 搜索框提示词
  searchPlaceholder?: string,
  // 搜索过滤防抖时间（ms），大树可调大以减少过滤频率
  searchDebounce?: number,
  // 卡片body样式
  bodyStyle?: CSSProperties,
  // 可视最大高度（px）：限制外层容器高度、超出滚动，节点 DOM 全量渲染，适合中小规模树；
  // 与 height 互斥，同传时以 height 为准（本属性失效）
  maxHeight?: number,
  // 树渲染高度（px）：设置后启用虚拟滚动（配合 virtual，默认 true），树体内部滚动、仅渲染可视区域节点，
  // 适合上千节点的大树；与 maxHeight 互斥，同传时本属性优先
  height?: number,
  // 是否启用虚拟滚动（默认 true，需设置 height 后才生效）
  virtual?: boolean,
  // 展示边框
  bordered?: boolean,
  // 双向绑定数据
  modelValue: any[] | any,
}>()

// update:modelValue：v-model 双向绑定
// change 双向绑定值发生变化时触发
const emits = defineEmits<{
  'update:modelValue': [value: any[] | any],
  'change': [value: any[] | any]
}>()

// 命令式 API：与工具栏同源的动作方法（基于当前可见节点范围）
defineExpose({
  // 重置组件
  reset: () => handleReset(),
  // 全选
  checkAll: () => handleCheckedAll(true),
  // 全不选
  uncheckAll: () => handleCheckedAll(false),
  // 展开全部
  expandAll: () => handleExpandAll(true),
  // 折叠全部
  collapseAll: () => handleExpandAll(false),
})

// 树形结构设置类型
type TreeSettingType = {
  // 是否全部展开
  expand: boolean,
  // 是否父子关联勾选
  checkRelate: boolean
  // 是否全部选中
  checked: boolean,
}
// 树形结构控制属性
const treeSetting = ref<TreeSettingType>({expand: defaultExpandAll, checkRelate: checkRelate, checked: false});
// 展开的节点
const expandKeys = ref<any[]>([])
// 选中的节点
const checkedKeys = ref<any[]>([])
// 全部节点
const allKeys = ref<any[]>([])
// 全部父级节点（children）
const allParentKeys = ref<any[]>([])
// 模糊搜索
const keyword = ref<string>('')
// 过滤后的树形数据，值会跟随关键词变化
const cloneTreeData = ref<any[]>([])

// 多选模式下勾选框已表达选中状态，selected 高亮通道仅服务单选
const EMPTY_SELECTED_KEYS: any[] = []
const selectedKeys = computed(() => multiple ? EMPTY_SELECTED_KEYS : checkedKeys.value)

// 卡片 body 样式
const cardStyles = computed(() => ({body: bodyStyle}))

// 勾选集合（全选回显判断用）
const checkedKeySet = computed(() => new Set(checkedKeys.value))

// 当前可见（过滤命中链路）的全部节点 key，全选操作与回显均基于可见范围
const visibleKeys = computed(() => {
  const keys: any[] = []
  traverse(cloneTreeData.value, (item) => {
    if (item?.[fieldNames.key] != null) {
      keys.push(item[fieldNames.key])
    }
  }, fieldNames.children)
  return keys
})

// 按关键词将标题切分为片段（命中片段由渲染方高亮）
const buildSegments = (title: unknown): Array<{text: string, hit: boolean}> => {
  const text = String(title ?? '')
  const index = keyword.value ? text.indexOf(keyword.value) : -1
  if (index > -1) {
    return [
      {text: text.substring(0, index), hit: false},
      {text: keyword.value, hit: true},
      {text: text.substring(index + keyword.value.length), hit: false},
    ]
  }
  return [{text, hit: false}]
}

// 处理工具栏全选/全不选（以事件参数为准：change 触发时勾选状态尚未写回）：
// 仅操作当前可见节点，未显示的已勾选项保持不变
const handleCheckedAll = (checked: boolean) => {
  const keySet = new Set(checkedKeys.value)
  if (checked) {
    visibleKeys.value.forEach(key => keySet.add(key))
  } else {
    visibleKeys.value.forEach(key => keySet.delete(key))
  }
  checkedKeys.value = [...keySet]
  syncCheckedTag()
  handleUpdateModelValue(checkedKeys.value)
}

// 展开或折叠全部节点
const applyExpandAll = (expand: boolean) => {
  expandKeys.value = expand ? [...allParentKeys.value] : []
}

// 处理工具栏展开/折叠
const handleExpandAll = (expand: boolean) => {
  treeSetting.value.expand = expand
  applyExpandAll(expand)
}

// 处理工具栏父子关联：开启关联后勾选父节点会级联勾选全部后代，
// 需将已勾选集合按关联语义展开，保证勾选状态与双向绑定值一致
const handleCheckRelate = (checked: boolean) => {
  treeSetting.value.checkRelate = checked
  if (checked) {
    expandCheckedKeys()
    handleUpdateModelValue(checkedKeys.value)
  }
}

// 将勾选集合中每个节点的全部后代 key 补入集合
const expandCheckedKeys = () => {
  const checkedSet = new Set(checkedKeys.value)
  traverse(treeData, (item) => {
    const key = item?.[fieldNames.key]
    if (key == null || !checkedSet.has(key)) {
      return
    }
    const children = item[fieldNames.children]
    if (children?.length) {
      traverse<Record<string, any>>(children, (child) => {
        const childKey = child?.[fieldNames.key]
        if (childKey != null) {
          checkedSet.add(childKey)
        }
      }, fieldNames.children)
    }
  }, fieldNames.children)
  checkedKeys.value = [...checkedSet]
}

// 处理重置组件：恢复展开与关联初始状态、全部取消选中，清空keyword关键字，双向绑定数据清空
const handleReset = () => {
  // 取消进行中的防抖过滤，避免重置后被旧关键词状态覆盖
  handleKeywordChange.cancel()
  keyword.value = ''
  checkedKeys.value = []
  treeSetting.value.expand = defaultExpandAll
  treeSetting.value.checkRelate = checkRelate
  handleChangeKeyWord()
  handleUpdateModelValue([])
}

// 处理勾选/点击选中数据（父子不关联的多选模式下 @check 载荷为 {checked} 对象，其余为数组）
const handleSelect = (selectedKeys: {checked: any[]} | any[]) => {
  let selected: any[]
  if (multiple && !treeSetting.value.checkRelate) {
    selected = (selectedKeys as {checked: any[]}).checked ?? []
  } else {
    selected = selectedKeys as any[]
  }

  // 处理全选回显
  syncCheckedTag()
  // 处理双向绑定
  handleUpdateModelValue(selected)
}

// 处理关键词过滤
const handleChangeKeyWord = () => {
  if (keyword.value) {
    // 命中时展开全部树形结构
    treeSetting.value.expand = true
  } else {
    treeSetting.value.expand = defaultExpandAll
  }
  rebuildTreeData()
  applyExpandAll(treeSetting.value.expand)
  syncCheckedTag()
}

// 按 keyword 状态重建渲染树（keyword 非空时仅保留命中链路）
const rebuildTreeData = () => {
  cloneTreeData.value = keyword.value ? handleFilterTree(treeData, keyword.value) : cloneDeep(treeData)
}

// 处理过滤树：按关键词裁剪树形结构，仅克隆命中的链路节点
const handleFilterTree = (data: Array<Record<string, any>>, keyword: string) => {
  const filterNode = (node: Record<string, any>): Record<string, any> | null => {
    const children = node[fieldNames.children]
    const filteredChildren = children?.length
      ? (children as Array<Record<string, any>>).map(filterNode).filter((child) => !!child)
      : undefined
    // 标题命中或存在命中后代时保留节点
    const title = String(node[fieldNames.title] ?? '')
    if (!title.includes(keyword) && !(filteredChildren && filteredChildren.length > 0)) {
      return null
    }
    const clone = {...node}
    if (filteredChildren) {
      clone[fieldNames.children] = filteredChildren
    }
    return clone
  }

  return data.map(filterNode).filter((node) => !!node)
}

// 关键词输入防抖（reset 等需要立即生效的路径直接调 handleChangeKeyWord）
const handleKeywordChange = debounce(handleChangeKeyWord, searchDebounce)
onUnmounted(() => handleKeywordChange.cancel())

// 处理双向绑定（克隆后抛出，避免与父组件共享数组引用；单选取消选中统一为 null）
const handleUpdateModelValue = (selected: any[]) => {
  const value = cloneDeep(selected)
  // 多选情况下，v-model绑定数组
  if (multiple) {
    emits('update:modelValue', value)
    emits('change', value)
  }
  // 反之绑定单个元素
  else {
    const single = value[0] ?? null
    emits('update:modelValue', single)
    emits('change', single)
  }
}

// 全选tag回显：可见节点非空且全部勾选时激活
const syncCheckedTag = () => {
  treeSetting.value.checked = visibleKeys.value.length > 0 && visibleKeys.value.every(key => checkedKeySet.value.has(key))
}

// 展开折叠tag回显：存在父节点且全部展开时激活
const handleExpand = () => {
  treeSetting.value.expand = allParentKeys.value.length > 0 && expandKeys.value.length === allParentKeys.value.length
}

// 处理选中节点回显（克隆赋值，不持有父组件数组引用）
const handleCheckedKey = () => {
  if (modelValue == null) {
    checkedKeys.value = []
    syncCheckedTag()
    return
  }
  if (multiple) {
    checkedKeys.value = Array.isArray(modelValue) ? [...modelValue] : [modelValue]
  } else {
    checkedKeys.value = [modelValue]
  }
  // 处理全选回显
  syncCheckedTag()
}

// 剔除已不存在于树中的勾选项（数据刷新后旧勾选残留会污染双向绑定值）
const pruneCheckedKeys = () => {
  if (checkedKeys.value.length === 0) {
    return
  }
  const keySet = new Set(allKeys.value)
  const pruned = checkedKeys.value.filter(key => keySet.has(key))
  if (pruned.length !== checkedKeys.value.length) {
    checkedKeys.value = pruned
    syncCheckedTag()
    handleUpdateModelValue(checkedKeys.value)
  }
}

// 将树形结构key收集到 allKeys/allParentKeys 中
const handleAllKeys = () => {
  allKeys.value = []
  allParentKeys.value = []
  traverse(treeData, (item) => {
    if (item && item[fieldNames.key] != null) {
      // 全部key
      allKeys.value.push(item[fieldNames.key])
      // 全部父节点key
      if (item[fieldNames.children]?.length > 0) {
        allParentKeys.value.push(item[fieldNames.key])
      }
    }
  }, fieldNames.children)
  // 按当前展开状态重建
  applyExpandAll(treeSetting.value.expand)
  // 处理全选回显
  syncCheckedTag()
}

// 监听modelValue双向绑定变化
watch(() => modelValue, () => {
  handleCheckedKey()
}, {immediate: true})

// 监听treeData变化：重建渲染树与节点集合，剔除已不存在于树中的勾选项
watch(() => treeData, () => {
  rebuildTreeData()
  handleAllKeys()
  pruneCheckedKeys()
}, {immediate: true})
</script>
