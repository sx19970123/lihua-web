<template>
  <div class="ml-auto" :id="tableSettingKey">
    <a-popover v-model:open="visiblePopover" @openChange="changePopover" placement="bottomRight" :arrow="false" trigger="click">
      <template #content>
        <!--         header-->
        <a-flex class="header unselectable" align="center" :gap="8">
          <a-checkbox class="all-select"
                      v-model:checked="checkboxState.allChecked"
                      :indeterminate="checkboxState.indeterminate"
                      @change="checkAllChange"
          >全选</a-checkbox>
          <a-button type="link" class="reset" @click="reset">重置</a-button>
        </a-flex>
        <a-divider class="divider"/>
        <!--         content-->
        <!--DragDropProvider 为 slot-only 渲染：rows 容器仍是其直接布局子节点；DragOverlay 未拖拽时渲染空元素，
            须与 rows 容器并列而非嵌在其 flex 布局内-->
        <DragDropProvider :sensors="sensors" :modifiers="dragModifiers" @drag-end="onDragEnd">
          <a-flex :key="listRenderKey" vertical :gap="8"
                  class="scrollbar unselectable content max-h-[300px]"
                  :class="enableWidthSetting ? 'w-[300px]' : 'w-[200px]'">
            <SettingRow v-for="(tableSetting, index) in tableSettings"
                        :key="tableSetting.key || `row-${index}`"
                        :setting="tableSetting"
                        :index="index"
                        :enable-width-setting="enableWidthSetting"
                        :min-width="minWidth"
                        :max-width="maxWidth"
                        @display-change="updateAllCheckedStatus"
                        @width-change="() => changeSlide(index)"
                        @left-fixed-change="(value: number) => changeLeftFixed(value, index)"
                        @right-fixed-change="(value: number) => changeRightFixed(value, index)"
            />
          </a-flex>
          <!--拖拽浮层：轴锁后纵向跟随指针，本体以 opacity:0 占位让位；宽度对齐 rows 容器（其挂在弹层根下，100% 会偏宽）-->
          <DragOverlay :drop-animation="null" :style="{width: enableWidthSetting ? '300px' : '200px', boxSizing: 'border-box'}">
            <template #default="{ source }">
              <div class="flex items-center gap-[8px] cursor-grabbing py-ant-xxs px-ant-xs bg-ant-container rounded-ant-xs shadow-ant-secondary">
                <HolderOutlined/>
                <div class="w-[60px]">
                  <a-typography-text ellipsis>{{ labelOf(source) }}</a-typography-text>
                </div>
              </div>
            </template>
          </DragOverlay>
        </DragDropProvider>
      </template>
      <a-button>
        <template #icon>
          <SettingOutlined />
        </template>
      </a-button>
    </a-popover>
  </div>
</template>
<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, reactive, ref, watch} from "vue";
import type {DragEndEvent} from '@dnd-kit/vue'
import {DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor} from '@dnd-kit/vue'
import {PointerActivationConstraints} from '@dnd-kit/dom'
import {RestrictToVerticalAxis} from '@dnd-kit/abstract/modifiers'
import {isSortable} from '@dnd-kit/vue/sortable'
import {isMobile} from 'is-mobile'
import {useRouter} from "vue-router";
import {cloneDeep, debounce} from "lodash-es"
import {message} from "@/antd-adapter";
import SettingRow from "@/components/table-setting/SettingRow.vue";
import type {SettingColumnType, TableSettingType} from "@/components/table-setting/TableSettingType.ts";

const router = useRouter();
// 控制弹出卡片是否显示
const visiblePopover = ref<boolean>(false)
// 组件参数
const {modelValue, minWidth = 80, maxWidth = 400, settingKey = "", anchor} = defineProps<{
  // 宽度调节最小值
  minWidth?: number,
  // 宽度调节最大值
  maxWidth?: number,
  // 双向绑定
  modelValue: SettingColumnType[],
  // 组件唯一标识，同一vue组件中有多个table时区分使用
  settingKey?: string,
  // 宽度测量锚点：表格 DOM 的定位方式（selector / 元素 / getter，ref 直传经 props 浅解包同样生效），
  // 组件放在 a-table 子树外时必须提供
  anchor?: string | HTMLElement | (() => string | HTMLElement | null | undefined)
}>()
const emit = defineEmits<{
  // 双向绑定回写
  'update:modelValue': [columns: SettingColumnType[]]
}>()
// 组件名称
const componentName = router.currentRoute.value.name as string
// 表格设置key
const tableSettingKey = `table-setting-${componentName}-${settingKey}`
// localStorage 存储结构版本（结构演进时递增，低版本记录整体丢弃）
const STORAGE_VERSION = 1
// 开启宽度控制
const enableWidthSetting = ref<boolean>(false)
// 上次向父组件提交的列配置，用于识别 modelValue 变化是否为自身 emit 的回写
let lastEmitted: SettingColumnType[] | undefined
// watch 提交抑制标记：程序化赋值（本地读取/按默认重建）不触发落盘与 emit
let suspendWatch = false

// 默认列配置快照：跟随父组件列定义的外部变化重建（自身 emit 引发的回写不算）
const defaultSettings = ref<SettingColumnType[]>(cloneDeep(modelValue))
watch(() => modelValue, (value) => {
  if (value === lastEmitted || JSON.stringify(value) === JSON.stringify(lastEmitted)) {
    return
  }
  defaultSettings.value = cloneDeep(value)
})

// 列配置签名：key 与标题的有序集合，识别发版后的列增删改
const signatureOf = (columns: SettingColumnType[]) => JSON.stringify(columns.map(column => [column.key, column.title]))

// 表格设置
const tableSettings = ref<TableSettingType[]>([])
// 列表强制重建计数：拖拽被拒绝时数据未变、Vue keyed diff 不重渲染，而 dnd-kit 乐观排序
// 已物理移动过 DOM，须整体重建列表使 DOM 回到数据顺序
const listRenderKey = ref(0)

// 向父组件提交列配置
const emitColumns = (columns: SettingColumnType[]) => {
  lastEmitted = columns
  emit("update:modelValue", columns)
}

// 按当前设置从默认列配置投影出父组件列（仅 emit，不落盘）
const emitModelValue = () => {
  const vModelColumn: SettingColumnType[] = []
  tableSettings.value.filter(setting => setting.display).forEach(outSetting => {
    cloneDeep(defaultSettings.value).forEach((innerSetting: SettingColumnType) => {
      if (outSetting.key === innerSetting.key) {
        innerSetting.width = outSetting.width !== outSetting.defaultWidth ? outSetting.width + 'px' : innerSetting.width
        innerSetting.fixed = outSetting.rightFixed === 1 ? 'right' : outSetting.leftFixed === 1 ? 'left' : false
        vModelColumn.push(innerSetting)
      }
    })
  })
  emitColumns(vModelColumn)
}

// 表格设置落盘（附带列签名，列配置变更后存量自动失效）
const persist = () => {
  localStorage.setItem(tableSettingKey, JSON.stringify({
    version: STORAGE_VERSION,
    signature: signatureOf(defaultSettings.value),
    settings: tableSettings.value
  }))
}

// 初始化组件
const init = () => {
  // 静默赋值：初始化路径不触发 watch 提交
  const applySettingsSilently = (settings: TableSettingType[]) => {
    suspendWatch = true
    tableSettings.value = settings
    nextTick(() => {
      suspendWatch = false
    })
  }

  // 从 localStorage 中获取数据，无数据再通过VModel获取
  const initTableSettings = () => {
    const initComplete = initFromLocal()
    if (!initComplete) {
      initFromVModel()
    }
  }

  // 根据VModel初始化赋值，不包含列表宽度
  const initFromVModel = () => {
    const settings: TableSettingType[] = []
    defaultSettings.value.forEach((setting, index: number) => {
      const width = typeof setting.width === "string" ? Number.parseInt(setting.width.replace("px", "")) : setting.width as number | undefined
      const tableSetting: TableSettingType = {
        label: typeof setting.title === 'string' ? setting.title : "无法识别的title",
        display: true,
        sort: index,
        width: width ? width : 0,
        defaultWidth: width ? width : 0,
        setDefaultWidth: !!width,
        widthChanged: false,
        leftFixed: setting.fixed === true || setting.fixed === 'left' ? 1 : 0,
        rightFixed: setting.fixed === 'right' ? 1 : 0,
        key: typeof setting.key === 'string' ? setting.key : "",
        hasChildren: Array.isArray(setting.children) && setting.children.length > 0
      }
      if (tableSetting.key === "") {
        console.error("title：" + String(setting.title), "中column key值为空，请检查配置")
      }
      settings.push(tableSetting)
    })
    applySettingsSilently(settings)
    // 默认配置同步给父组件（不落盘，未发生过用户变更时不产生存储记录）
    emitModelValue()
  }

  // 从localStorage中取出列表设置值；存储版本或列签名不符的过期记录直接丢弃
  const initFromLocal = (): boolean => {
    const localStorageSetting = localStorage.getItem(tableSettingKey)
    if (localStorageSetting) {
      const record = JSON.parse(localStorageSetting)
      if (record && record.version === STORAGE_VERSION && record.signature === signatureOf(defaultSettings.value)) {
        applySettingsSilently(record.settings as TableSettingType[])
        // 存量配置同步给父组件（读路径不回写存储）
        emitModelValue()
        return true
      }
      localStorage.removeItem(tableSettingKey)
    }
    return false
  }

  return {
    initTableSettings,
    initFromLocal
  }
}
const {initTableSettings, initFromLocal} = init()

// 初始化checkbox相关操作
const initCheckbox = () => {
  const checkboxState = reactive<{
    allChecked: boolean,          // 全选
    indeterminate: boolean        // 非全选
  }>({
    indeterminate: false,
    allChecked: true
  })

  // 全选/全不选
  const checkAllChange = () => {
    checkboxState.indeterminate = false
    tableSettings.value.forEach(setting => setting.display = checkboxState.allChecked)
    // 重新计算宽度
    nextTick(() => debounceWidth())
  }

  // 更新全选状态
  const updateAllCheckedStatus = () => {
    const hiddenList = tableSettings.value.filter(setting => !setting.display)
    if (hiddenList.length === tableSettings.value.length) {
      // 隐藏数量与tableSettings总数相等，状态全为false
      checkboxState.indeterminate = false
      checkboxState.allChecked = false
    } else if (hiddenList.length > 0) {
      // 有部分隐藏，全选为false，indeterminate为true
      checkboxState.indeterminate = true
      checkboxState.allChecked = false
    } else {
      // 没有隐藏，全选为true，indeterminate为false
      checkboxState.indeterminate = false
      checkboxState.allChecked = true
    }
    // 重新计算宽度
    nextTick(() => debounceWidth())
  }
  return {
    checkboxState,
    checkAllChange,
    updateAllCheckedStatus
  }
}
const {checkboxState, checkAllChange, updateAllCheckedStatus} = initCheckbox()

// 重置列表
const reset = () => {
  emitColumns(cloneDeep(defaultSettings.value))
  localStorage.removeItem(tableSettingKey)
  visiblePopover.value = false
  message.success("重置完成")
  setTimeout(() => enableWidthSetting.value = false, 200)
}

// 用户变更（勾选/宽度/固定/拖拽/位置约束修正）统一提交口：emit + 落盘
watch(tableSettings, (newVal, oldValue) => {
  if (suspendWatch || !oldValue || oldValue.length === 0) {
    return
  }
  emitModelValue()
  persist()
}, {deep: true})

// 初始化处理左右固定和固定时调整顺序相关函数
const initChangeFixedDrag = () => {
  // 查找符合条件的目标索引
  const findTargetIndex = (filterFn: (ts: TableSettingType) => boolean, last: boolean) => {
    const tss = tableSettings.value
    const targetSettings = tss.filter(filterFn)
    if (targetSettings.length > 0) {
      const targetItem = last ? targetSettings[targetSettings.length - 1] : targetSettings[0]
      return tss.findIndex(item => item === targetItem)
    }
    return -1
  }

  // 处理左固定，点击左固定判断前一个元素是否为左固定，不是的话移动到最近的左固定元素后
  const changeLeftFixed = (value: number, index: number) => {
    const tss = tableSettings.value
    const tableSetting = tss[index]

    if (value === 1) {
      // 左固定，取消右固定
      tableSetting.rightFixed = 0
      const prevItem = tss[index - 1]

      if (prevItem && prevItem.leftFixed !== value) {
        const targetIndex = findTargetIndex(ts => ts.leftFixed === value && ts !== tableSetting, true)
        moveTableSettingItemToAfter(index, targetIndex)
      }
    } else {
      // 取消左固定
      const nextItem = tss[index + 1]

      if (nextItem && nextItem.leftFixed !== value) {
        const targetIndex = findTargetIndex(ts => ts.leftFixed === value && ts !== tableSetting, false)
        moveTableSettingItemToBefore(index, targetIndex !== -1 ? targetIndex : tss.length)
      }
    }
  }

  // 处理右固定，点击右固定判断后一个元素是否为右固定，不是的话移动到最近的右固定元素前
  const changeRightFixed = (value: number, index: number) => {
    const tss = tableSettings.value
    const tableSetting = tss[index]

    if (value === 1) {
      // 右固定，取消左固定
      tableSetting.leftFixed = 0
      const nextItem = tss[index + 1]

      if (nextItem && nextItem.rightFixed !== value) {
        const targetIndex = findTargetIndex(ts => ts.rightFixed === value && ts !== tableSetting, false)
        moveTableSettingItemToBefore(index, targetIndex !== -1 ? targetIndex : tss.length)
      }
    } else {
      // 取消右固定
      const prevItem = tss[index - 1]

      if (prevItem && prevItem.rightFixed !== value) {
        const targetIndex = findTargetIndex(ts => ts.rightFixed === value && ts !== tableSetting, true)
        moveTableSettingItemToAfter(index, targetIndex)
      }
    }
  }

  // 将fromIndex位置的元素移动到toIndex的后面
  const moveTableSettingItemToAfter = (fromIndex: number, toIndex: number) => {
    const arr = tableSettings.value
    // 边界检查
    if (fromIndex < -1 || toIndex < -1 || fromIndex >= arr.length || toIndex >= arr.length) return;

    // 移动元素
    const [movedItem] = arr.splice(fromIndex, 1);
    arr.splice(toIndex + 1, 0, movedItem);
  }
  // 将fromIndex位置的元素移动到toIndex的前面
  const moveTableSettingItemToBefore = (fromIndex: number, toIndex: number) => {
    const arr = tableSettings.value
    // 边界检查
    if (fromIndex < 0 || toIndex < 0 || fromIndex >= arr.length + 1 || toIndex >= arr.length + 1) return;

    // 移动元素
    const [movedItem] = arr.splice(fromIndex, 1);
    arr.splice(toIndex -1, 0, movedItem);
  }

  return {
    changeLeftFixed,
    changeRightFixed
  }
}

const {changeLeftFixed, changeRightFixed} = initChangeFixedDrag()

// 初始化拖拽排序（@dnd-kit/vue 标准乐观排序，等宽纵向列表无换位歧义区）
const initDrag = () => {
  // 拖拽传感器：4px 距离激活防误触；移动端不启用
  const sensors = isMobile() ? [] : [
    PointerSensor.configure({activationConstraints: [new PointerActivationConstraints.Distance({value: 4})]}),
    KeyboardSensor,
  ]
  // 轴锁修饰器（provider 级，稳定引用防重复解析）：拖拽位移只保留纵向分量，不脱离列表轨道；
  // 行组件 useSortable 另配 sortable 级同款保底（source 级修饰优先于 manager 级生效）
  const dragModifiers = [RestrictToVerticalAxis]

  const arrayMove = (array: TableSettingType[], from: number, to: number) => {
    const copy = array.slice()
    copy.splice(to, 0, copy.splice(from, 1)[0])
    return copy
  }

  // 在给定顺序中查找满足条件的索引（last 取最后一个，否则第一个）
  const findIndexBy = (settings: TableSettingType[], filterFn: (ts: TableSettingType) => boolean, last: boolean) => {
    const targets = settings.filter(filterFn)
    if (targets.length === 0) {
      return -1
    }
    const target = last ? targets[targets.length - 1] : targets[0]
    return settings.findIndex(item => item === target)
  }

  // 固定列位置约束检查（纯检查不修正）：普通列不得落入固定区、固定列不得离开所属固定区；
  // 返回违例提示文案，合法返回 null
  const findFixedViolation = (settings: TableSettingType[], movedIndex: number): string | null => {
    const dragItem = settings[movedIndex]
    if (!dragItem) {
      return null
    }
    const leftFixed = dragItem.leftFixed
    const rightFixed = dragItem.rightFixed

    // 未固定列：不得落在左固定块内部或右固定块及其后
    if (leftFixed === 0 && rightFixed === 0) {
      if (findIndexBy(settings, ts => ts.leftFixed === 1, true) > movedIndex) {
        return "无法移动至固定元素左边"
      }
      if (movedIndex > findIndexBy(settings, ts => ts.rightFixed === 1, false)) {
        return "无法移动至固定元素右边"
      }
      return null
    }

    // 左固定列：其余左固定元素必须全部紧邻其前方（自身仍是左固定块尾）
    if (leftFixed === 1) {
      if (movedIndex - 1 > findIndexBy(settings, ts => ts.leftFixed === 1 && ts !== dragItem, true)) {
        return "左固定元素无法移动至右边"
      }
      return null
    }

    // 右固定列：其余右固定元素必须紧随其后；自身是唯一右固定时必须在末位
    const rightFixedFirstIndex = findIndexBy(settings, ts => ts.rightFixed === 1 && ts !== dragItem, false)
    if (rightFixedFirstIndex === -1 ? movedIndex !== settings.length - 1 : rightFixedFirstIndex - 1 > movedIndex) {
      return "右固定元素无法移动至左边"
    }
    return null
  }

  // 拖拽浮层显示的列标签
  const labelOf = (source: {id: unknown}) =>
      tableSettings.value.find(setting => setting.key === String(source.id))?.label ?? ""

  // 拖拽结束：按乐观排序的投影索引提交新顺序（拖拽期间 DOM 已呈现该顺序）；
  // 落点违反固定列约束时整体拒绝——数据不提交、提示后强制重建列表把 DOM 还原回拖前顺序；
  // 取消（Esc）时数据未动、DOM 由乐观排序自行还原，无需回滚
  const onDragEnd = (event: DragEndEvent) => {
    if (event.canceled) {
      return
    }
    const {source} = event.operation
    if (!source || !isSortable(source)) {
      return
    }
    const {initialIndex, index} = source
    if (initialIndex === index
        || initialIndex < 0 || initialIndex >= tableSettings.value.length
        || index < 0 || index >= tableSettings.value.length) {
      return
    }
    const next = arrayMove(tableSettings.value, initialIndex, index)
    const violation = findFixedViolation(next, index)
    if (violation) {
      message.warning(violation)
      // nextTick 后重建：先让 dnd-kit 完成 drag-end 对旧 DOM 的清理，再整体换新
      nextTick(() => {
        listRenderKey.value++
      })
      return
    }
    tableSettings.value = next
  }

  return {
    sensors,
    dragModifiers,
    labelOf,
    onDragEnd
  }
}
const {sensors, dragModifiers, labelOf, onDragEnd} = initDrag()


type ColumnWidthType = {
  // 表格标题
  text: string,
  // 表格宽度
  width: number
}

// 初始化列宽度集合，通过dom节点获取表格对应宽度
// 契约：宽度测量依赖定位到 .ant-table——组件挂在 a-table 子树内（消费页惯例为 #title 插槽）时自动向上查找；
// 放在表格外时须提供 anchor prop 指定表格位置。且表头单元格 textContent 与列 title 一致
// （自定义表头渲染会破坏该前提，宽度调节将被禁用）
const initColumnWidth = () => {
  // 定位表格容器：优先 anchor prop（支持组件放在表格外），否则从组件自身向上找
  const resolveTable = (): HTMLElement | null => {
    if (anchor) {
      const resolved = typeof anchor === "function" ? anchor() : anchor
      const scope = typeof resolved === "string" ? document.querySelector<HTMLElement>(resolved) : resolved ?? null
      if (scope) {
        const table = scope.matches(".ant-table") ? scope : scope.querySelector<HTMLElement>(".ant-table")
        if (!table) {
          console.error("table-setting：anchor 内未找到 .ant-table，宽度调节不可用")
        }
        return table
      }
      console.error("table-setting：anchor 未解析到元素，宽度调节不可用")
      return null
    }
    return document.getElementById(tableSettingKey)?.closest<HTMLElement>(".ant-table") ?? null
  }
  // 多级表头时叶子列测量无法与顶层列定义对齐，不可调节宽度
  if (tableSettings.value.filter(ts => ts.hasChildren).length > 0) {
    return;
  }
  // 列表宽度集合
  const columnWidthList: ColumnWidthType[] = []
  // 定位表格容器
  const target = resolveTable()
  if (target) {
    // 获取匹配到的第一个tr标签
    const tr = target.querySelector("tr")
    if (tr) {
      // 找到所有tr标签
      const allTh = tr.querySelectorAll("th")
      allTh.forEach(el => {
        // 元素宽度
        const width = el.offsetWidth
        // 元素文本
        const text = el.textContent
        if (text) {
          columnWidthList.push({ text: text, width:width })
        }
      })
    }
  }
  // 当dom元素中的列数量与tableSettings长度相同时，允许控制列宽度
  const targetTableSettings = tableSettings.value.filter(item => item.display)
  enableWidthSetting.value = targetTableSettings.length === columnWidthList.length
  // columnWidthList
  if (enableWidthSetting.value) {
    for (let i = 0; i < columnWidthList.length; i++) {
      const cw = columnWidthList[i]     // 列宽-label集合
      const ts = targetTableSettings[i] // 操作的主要配置
      // 同一索引判断名称是否相同
      if (cw.text === ts.label) {
        // 首次加载或未调整过宽度，在窗口大小变化时，为width、defaultWidth赋初值
        if (!ts.setDefaultWidth && !ts.widthChanged){
          ts.width = cw.width
          ts.defaultWidth = cw.width
        }
      } else {
        console.error("dom中获取名称与prop中不同")
        enableWidthSetting.value = false
        return
      }
    }
  }
}

// 处理防抖
const debounceWidth = debounce(initColumnWidth, 300)

// visible显示时才进行加载，关闭时销毁监听
const changePopover = (visible: boolean) => {
  // enableWidthSetting 为false时加载一次初始化宽度
  if (!enableWidthSetting.value) {
    initTableSettings()
  }
  if (visible) {
    initColumnWidth()
    window.addEventListener("resize", debounceWidth)
  } else {
    window.removeEventListener("resize", debounceWidth)
  }
}

// 卸载兜底：浮层开着时切走路由（keep-alive 离开）不会触发 changePopover(false)，resize 监听残留累积
onUnmounted(() => window.removeEventListener("resize", debounceWidth))

// 拖动宽度条
const changeSlide = (index: number) => {
  // 拖动宽度条标记宽度已改变
  const target = tableSettings.value[index]
  if (!target.widthChanged) {
    target.widthChanged = true
  }
  debounceWidth()
}

// 组件加载完成后先从localStorage读取表头数据
onMounted(() => {
  initFromLocal()
})
</script>

<style scoped>
/* 以下 margin/padding 均为组件根 cssinjs 声明反杀的保留项（A.2 #47）：.ant-btn/.ant-divider-horizontal 根有 margin、.ant-checkbox-wrapper/.ant-flex 根有 resetComponent */
.all-select {
  margin-left: 22px
}
.reset {
  margin-left: auto
}
.divider {
  margin: var(--ant-margin-xxs) 0 var(--ant-margin-xxs) 0
}
.content {
  padding-bottom: 2px;
  /* 压过 .scrollbar 的 overflow:auto 简写（custom.css 晚于 uno.css 加载，同特异性下工具类
     overflow-x-hidden 必被反杀，须用 scoped (0,2,0) 收口）：行内图钉 a-rate 悬浮
     scale(1.1) 的视觉溢出会闪现横向滚动条，列表本身无横向滚动需求 */
  overflow-x: hidden;
}
</style>
