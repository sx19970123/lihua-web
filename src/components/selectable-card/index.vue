<template>
  <a-spin :spinning="loading">
    <a-flex :gap="gap" :wrap="vertical ? 'nowrap' : 'wrap'" :vertical="vertical" class="scrollbar" ref="selectableRef" :style="{'max-height': vertical ? maxHeight + 'px' : 'none', ...cardStyle}">
      <div class="menu-card-item" :style="itemStyle" v-if="dataSource && dataSource.length > 0" v-for="(item,index) in dataSource">
        <div class="rounded-ant-lg p-ant-base border border-solid border-ant-border mr-[3px] hover:cursor-pointer hover:border-[var(--colorPrimary)]"
             @click.stop="handleClickCard(item)"
             :style="item[itemKey] && activeCardValueList.includes(item[itemKey]) ? bodyStyle : ''">
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
      <!--    空状态-->
      <div class="rounded-ant-lg p-ant-base border border-solid border-ant-border mr-[3px] hover:cursor-pointer" v-else :style="itemStyle">
        <a-empty :description="emptyDescription" />
      </div>
    </a-flex>
  </a-spin>

</template>

<script setup lang="ts">
// 接受父组件传递参数
import {reactive, ref, useTemplateRef, watch} from "vue";
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


// 定义 v-model 双向绑定和抛出的函数
const emit = defineEmits(['update:modelValue','click','change'])

// 选中的元素集合
const activeCardValueList = reactive<Array<any>>([])

// 组件ref
const selectableRef = useTemplateRef<InstanceType<typeof Flex>>('selectableRef')

// 处理点击选中
const handleClickCard = (item: any): void => {
  const keyItem = item[itemKey]
  if (!keyItem) {
    console.error("key 不是 option 集合对象的属性");
    return;
  }
  // 取消选中
  if (activeCardValueList.includes(keyItem)) {
    activeCardValueList.splice(activeCardValueList.indexOf(keyItem),1)
    multiple ? emit('update:modelValue', cloneDeep(activeCardValueList)) : emit('update:modelValue', null)
    multiple ? emit('change', cloneDeep(activeCardValueList)) : emit('change',{})
    return;
  }

  // 处理单选/多选
  if (multiple) {
    activeCardValueList.push(keyItem)
    // 多选情况下，返回选中值的集合
    emit('update:modelValue', cloneDeep(activeCardValueList))
  } else {
    clearActiveCardValueList()
    activeCardValueList.push(keyItem)
    // 单选情况下返回选中的值
    emit('update:modelValue', cloneDeep(keyItem))
  }

  // 向父级抛出点击事件
  emit('click',{activeValueList: cloneDeep(activeCardValueList) ,item: cloneDeep(item)})
  emit('change',{item: cloneDeep(item)})
}

// 清空选中集合
const clearActiveCardValueList = () => {
  activeCardValueList.length = 0
}

// 处理双向绑定回显
const handleVmodel = () => {
  // 双向绑定modelValue
  if (!modelValue) {
    return;
  }

  const type = Array.isArray(modelValue) ? 'array' : typeof modelValue;
  // 是否多选

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
})

// 选中的卡片样式
const bodyStyle = ref<{
  'border': string,
  'box-shadow': string
}>({
  'border': '1px solid ' + token.value.colorPrimary,
  'box-shadow': 'inset 0 0 0 1px ' + token.value.colorPrimary,
})
// 监听主题变化同步卡片样式
watch(() => token.value.colorPrimary, () => {
  bodyStyle.value = {
    'border': '1px solid ' + token.value.colorPrimary,
    'box-shadow': 'inset 0 0 0 1px ' + token.value.colorPrimary,
  }
})

// 监听外部 modelValue 值变化时反应到组件中
watch(() => modelValue,() => {
  handleVmodel()
},{deep: true})

// 深度监听 dataSource 变化，当dataSource减少时，删除双向绑定中对应的数据
watch(() => dataSource, () => {
  // modelValue 未选中值时不进行操作
  if (!modelValue || modelValue === 0) {
    // 双向绑定值不存在时，清空已选项
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
          // 清空 modelValue 并将交集元素添加回去
          // modelValue.length = 0;
          // modelValue.push(...intersection);
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

})
</script>
