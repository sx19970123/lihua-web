<template>
  <!-- mouseenter/mouseleave 挂在原生 div 上：antdv-next Select 不透传鼠标监听到根节点 -->
  <div @mouseenter="bordered = true" @mouseleave="bordered = false">
    <a-select v-model:value="value"
              :options="options"
              :field-names="fieldNames"
              variant="borderless"
              size="large"
              :loading="loading"
              :style="{'border-color': bordered || isGetFocus ? themeStore.getColorPrimary() : 'var(--lihua-alpha-0)'}"
              @focus="isGetFocus = true"
              @blur="isGetFocus = false"
              @change="handleChange"
    >
      <template #suffixIcon>
        <EditOutlined class="input-prefix-icon-color" style="font-size: var(--ant-font-size-lg);"/>
      </template>
    </a-select>
  </div>
</template>

<script setup lang="ts">
import {ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()

// 接收的参数：
// modelValue v-model 双向绑定值
// options 下拉选项
// fieldNames 下拉字段属性绑定
// onSubmit 选中即提交函数：返回 false 或抛异常仅结束 loading，不回滚选中值（保持既有行为）
const {modelValue, options, fieldNames, onSubmit} = defineProps<{
  // v-model 双向绑定值
  modelValue?: string,
  // 下拉选项
  options: Array<Record<string, any>>,
  // 下拉字段属性绑定
  fieldNames?: Record<string, string>,
  // 选中即提交函数
  onSubmit: (value?: string) => Promise<boolean> | boolean
}>()

const emits = defineEmits<{
  // v-model 双向绑定
  'update:modelValue': [value?: string]
}>()

// 双向绑定值（选中即视为编辑值）
const value = ref<string | undefined>(modelValue)
// 提交 loading
const loading = ref<boolean>(false)
// 悬停时显示边框
const bordered = ref<boolean>(false)
// 聚焦（下拉展开）态
const isGetFocus = ref<boolean>(false)

// 选中即提交，提交结果由组件内收尾（change 可能先于 v-model 写回，取事件新值）
const handleChange = async (value: string) => {
  emits('update:modelValue', value)
  if (loading.value) {
    return
  }
  loading.value = true
  try {
    await onSubmit(value)
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}
</script>
