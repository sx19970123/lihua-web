<template>
  <a-spin :spinning="loading">
    <a-flex :gap="gap" :wrap="vertical ? 'nowrap' : 'wrap'" :vertical="vertical" class="scrollbar selectable-container" ref="selectableRef" :style="{'max-height': vertical ? maxHeight + 'px' : 'none', ...cardStyle}">
      <template v-if="dataSource && dataSource.length > 0">
        <div class="menu-card-item" :style="itemStyle" v-for="(item,index) in dataSource" :key="item[itemKey]">
          <div class="selectable-card-item rounded-ant-lg p-ant-base border border-solid border-ant-border mr-[3px] hover:cursor-pointer hover:border-[var(--colorPrimary)]"
             role="button"
             tabindex="0"
             :aria-pressed="activeCardValueList.includes(item[itemKey])"
             @click.stop="handleClickCard(item)"
             @keydown="handleKeydownCard($event, item)"
             :style="activeCardValueList.includes(item[itemKey]) ? bodyStyle : undefined">
            <!--      具名插槽 content-->
            <!--      返回参数 dataSource：传入的option-->
            <!--      返回参数 item：option遍历出的元素-->
            <!--      返回参数 index：option遍历索引-->
            <!--      返回参数 isSelected：是否为当前选中元素-->
            <!--      返回参数 color：当前主题颜色-->
            <slot name="content"
                  :dataSource="dataSource"
                  :item="item"
                  :index="index"
                  :isSelected="activeCardValueList.includes(item[itemKey])"
                  :color="token.colorPrimary"/>
          </div>
        </div>
      </template>
      <!--    空状态-->
      <div class="rounded-ant-lg p-ant-base border border-solid border-ant-border mr-[3px]" v-else :style="itemStyle">
        <a-empty :description="emptyDescription" />
      </div>
    </a-flex>
  </a-spin>

</template>

<script setup lang="ts">
// 接受父组件传递参数
import {computed, reactive, useTemplateRef, watch} from "vue";
import type {CSSProperties} from "vue";
import type {Flex} from "antdv-next"
import {cloneDeep} from 'lodash-es'
import {theme} from "antdv-next";

const {token} = theme.useToken()

// 定义父级传入的配置项
const {gap = 16, cardStyle = {}, itemStyle = {}, vertical = false, maxHeight = 300, multiple = false,
  itemKey, dataSource, emptyDescription, scrollViewIndex = 0, loading = false, modelValue} = defineProps<{
  // 卡片间距
  gap?: number,
  // 容器样式
  cardStyle?: CSSProperties,
  // 元素样式
  itemStyle?: CSSProperties,
  // 是否垂直排列
  vertical?: boolean,
  // 最大高度（仅对垂直排列生效）
  maxHeight?: number,
  // 是否支持多选
  multiple?: boolean,
  // dataSource 对象中的唯一值
  itemKey: string,
  // 可选的数据列表
  dataSource: Array<any>,
  // 空状态描述
  emptyDescription?: string,
  // 需要显示的元素索引
  scrollViewIndex?: number,
  // 加载中
  loading?: boolean,
  // v-model 绑定值（单选为单值，多选为数组）
  modelValue?: any
}>()

// 选中/取消选中事件载荷
interface SelectPayload {
  // 本次操作的卡片元素
  item: any,
  // 操作后的绑定值（单选为单值或取消时的 null；多选为选中值数组）
  value: any[] | any | null
}

// 定义 v-model 双向绑定和抛出的事件
const emit = defineEmits<{
  'update:modelValue': [value: any[] | any | null],
  // 点击卡片时触发（无论本次点击是选中还是取消选中）
  click: [payload: {item: any, activeValueList: any[]}],
  // 本次点击选中卡片时触发
  select: [payload: SelectPayload],
  // 本次点击取消选中卡片时触发
  unselect: [payload: SelectPayload],
  // 绑定值变化时触发（选中与取消选中均触发）
  change: [payload: {value: any[] | any | null, item: any}]
}>()

// 选中的元素集合
const activeCardValueList = reactive<Array<any>>([])

// 组件ref
const selectableRef = useTemplateRef<InstanceType<typeof Flex>>('selectableRef')

// 处理点击卡片
const handleClickCard = (item: any): void => {
  const keyItem = item[itemKey]
  if (keyItem == null) {
    console.error("key 不是 option 集合对象的属性");
    return;
  }
  // 取消选中
  if (activeCardValueList.includes(keyItem)) {
    activeCardValueList.splice(activeCardValueList.indexOf(keyItem), 1)
    const value = multiple ? cloneDeep(activeCardValueList) : null
    emit('update:modelValue', value)
    emit('click', {activeValueList: cloneDeep(activeCardValueList), item: cloneDeep(item)})
    emit('unselect', {item: cloneDeep(item), value})
    emit('change', {value, item: cloneDeep(item)})
    return;
  }

  // 处理单选/多选
  if (multiple) {
    activeCardValueList.push(keyItem)
  } else {
    clearActiveCardValueList()
    activeCardValueList.push(keyItem)
  }
  const value = multiple ? cloneDeep(activeCardValueList) : cloneDeep(keyItem)

  emit('update:modelValue', value)
  emit('click', {activeValueList: cloneDeep(activeCardValueList), item: cloneDeep(item)})
  emit('select', {item: cloneDeep(item), value})
  emit('change', {value, item: cloneDeep(item)})
}

// 清空选中集合
const clearActiveCardValueList = () => {
  activeCardValueList.length = 0
}

// 键盘触发选中（Enter/Space）：div 上的 role=button 浏览器不会自动合成 click，须手动触发；Space 需阻止页面滚动
const handleKeydownCard = (event: KeyboardEvent, item: any): void => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  handleClickCard(item)
}

// 处理双向绑定回显
const handleVmodel = () => {
  // 绑定值不存在时清空已选项（0/false/'' 为合法选中值，不做清空）
  if (modelValue == null) {
    clearActiveCardValueList()
    return;
  }

  const type = Array.isArray(modelValue) ? 'array' : typeof modelValue;

  if (type === 'array') {
    if (!multiple) {
      console.error("错误：双向绑定数据类型不匹配，期望接收单一元素，但实际接收到的是一个数组。");
      return;
    }
    clearActiveCardValueList();
    for (const item of modelValue as Array<any>) {
      activeCardValueList.push(item);
    }

  } else {
    if (multiple) {
      console.error("错误：双向绑定数据类型不匹配，期望接收数组，但实际接收到的是单一元素。");
      return;
    }
    clearActiveCardValueList();
    activeCardValueList.push(modelValue);
  }
}
// 第一次调用
handleVmodel()

/**
 * 设置滚动条位置
 * 保证目标元素在可见范围
 * @param index 元素索引
 */
const scrollIntoView = (index: number) => {
  const el = selectableRef.value?.$el
  if (!el) return

  if (index === -1) {
    el.scrollTop = 0
    return;
  }

  const target = el.children[index]
  if (!target) return
  const containerRect = el.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()

  const isAbove = targetRect.top < containerRect.top
  const isBelow = targetRect.bottom > containerRect.bottom

  if (isAbove) {
    el.scrollTop -= (containerRect.top - targetRect.top)
  } else if (isBelow) {
    el.scrollTop += (targetRect.bottom - containerRect.bottom)
  }
}


watch(() => scrollViewIndex, (value) => {
  scrollIntoView(value)
}, {immediate: true})

// 选中的卡片样式（跟随主题色）
const bodyStyle = computed<CSSProperties>(() => ({
  border: '1px solid ' + token.value.colorPrimary,
  'box-shadow': 'inset 0 0 0 1px ' + token.value.colorPrimary,
}))

// 监听外部 modelValue 值变化时反应到组件中
watch(() => modelValue,() => {
  handleVmodel()
},{deep: true})

// 深度监听 dataSource 变化，当dataSource减少时，删除双向绑定中对应的数据
watch(() => dataSource, () => {
  // 绑定值不存在时清空已选项
  if (modelValue == null) {
    clearActiveCardValueList()
    return;
  }
  // 双向绑定modelValue
  const type = Array.isArray(modelValue) ? 'array' : typeof modelValue;
  // 是否多选
  if (dataSource && dataSource.length > 0) {
    // 全部可选集合
    const allList = dataSource.map(item => item[itemKey])
    // 多选情况下
    if (multiple) {
      if (type === 'array') {
        const modelValueList = modelValue as Array<any>; // 将 modelValue 转换为数组
        const isSubset = modelValueList.every(item => allList.includes(item));
        if (!isSubset || modelValueList.length > allList.length) {
          // 计算 modelValue 与 allList 的交集
          const intersection = modelValueList.filter(item => allList.includes(item));
          emit('update:modelValue', cloneDeep(intersection));
        }
      } else {
        console.error("错误：双向绑定数据类型不匹配，期望接收数组，但实际接收到的是单一元素。");
      }
    }
    // 单选情况下
    else {
      if (type === 'array') {
        console.error("错误：双向绑定数据类型不匹配，期望接收单一元素，但实际接收到的是一个数组。");
      } else {
        if (!allList.includes(modelValue)) {
          emit('update:modelValue', null)
        }
      }
    }

  } else {
    // dataSource 不存在时直接清空 modelValue
    if (multiple) {
      emit('update:modelValue', [])
    } else {
      emit('update:modelValue', null)
    }
  }

}, {deep: true})
</script>

<style scoped>
/* 容器四周留 5px（3px 间隙 + 2px 环宽）收纳卡外焦点环：.scrollbar 的 overflow:auto 会裁掉
   伸出容器盒的 outline，环必须收进来；负 margin 抵消 padding 的布局偏移。
   走 scoped 而非工具类：ant-flex 根级样式显式置 margin/padding 为 0，单类工具类压不过 */
.selectable-container {
  padding: 5px;
  margin: -5px;
}

/* 键盘聚焦环：仅 :focus-visible 命中（Tab 聚焦），鼠标点击不画环；
   画在卡片外一圈（3px 间隙），与贴边的边框及选中态主色描边拉开视觉区分 */
.selectable-card-item:focus-visible {
  outline: 2px solid var(--ant-color-primary);
  outline-offset: 3px;
}
</style>
