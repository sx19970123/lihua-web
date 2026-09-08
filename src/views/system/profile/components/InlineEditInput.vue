<template>
  <a-input v-model:value="value"
           size="large"
           :class="bordered || isGetFocus ? 'inline-edit-active' : 'inline-edit-idle'"
           :readonly="loading"
           ref="inputRef"
           @mouseover="bordered = true"
           @mouseout="bordered = false"
           @focus="handleFocus"
           @blur="handleBlur"
           @pressEnter="handleSubmit"
  >
    <template #suffix>
      <!-- mousedown.prevent：阻止点击确认按钮时输入框失焦，失焦回调因此只承担「取消编辑回滚」语义 -->
      <a-button v-if="isGetFocus"
                class="inline-edit-confirm"
                size="small"
                type="text"
                :loading="loading"
                :style="{color: themeStore.getColorPrimary()}"
                @mousedown.prevent
                @click="handleSubmit"
      >
        <template #icon>
          <CheckOutlined/>
        </template>
      </a-button>
      <EditOutlined v-else class="input-prefix-icon-color"/>
    </template>
  </a-input>
</template>

<script setup lang="ts">
import {ref, useTemplateRef, watch} from "vue";
import type {InputRef} from "antdv-next";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()

// 接收的参数：
// modelValue v-model 双向绑定值
// required 必填：为空时不触发提交
// onSubmit 提交函数：返回 true 视为成功（落定编辑值并退出编辑态），false 或抛异常视为失败（保持聚焦，允许修改后重试）
const {modelValue, required = false, onSubmit} = defineProps<{
  // v-model 双向绑定值
  modelValue?: string,
  // 必填：为空时不触发提交
  required?: boolean,
  // 提交函数
  onSubmit: (value?: string) => Promise<boolean> | boolean
}>()

const emits = defineEmits<{
  // v-model 双向绑定
  'update:modelValue': [value?: string],
  // 取消编辑回滚到已落定值时触发（父级用于清除校验提示）
  reset: [value?: string]
}>()

const inputRef = useTemplateRef<InputRef>("inputRef")
// 已落定的值（上次成功提交的值），取消编辑时回滚到它
const finalValue = ref<string | undefined>(modelValue)
// 编辑中的值
const value = ref<string | undefined>(modelValue)
// 提交 loading
const loading = ref<boolean>(false)
// 悬停时显示边框
const bordered = ref<boolean>(false)
// 聚焦编辑态
const isGetFocus = ref<boolean>(false)

// 编辑值实时同步给 v-model：form-item 监听 model 值变化自动触发 change 校验（实时红框/清除）；
// 取消编辑时 blur 回滚会再同步回已落定值，提交成功时 blur 落定同值
watch(value, (v) => emits('update:modelValue', v))

const handleFocus = () => {
  isGetFocus.value = true
}

// 失焦即取消编辑：回滚到已落定值；提交过程中失焦则把编辑值暂存为已落定值，等待提交结果
const handleBlur = () => {
  if (loading.value) {
    finalValue.value = value.value
  } else {
    value.value = finalValue.value
    emits('update:modelValue', value.value)
    emits('reset', finalValue.value)
  }
  isGetFocus.value = false
}

const handleSubmit = async () => {
  // 确认按钮点击/回车后保持聚焦，避免触发失焦回滚
  inputRef.value?.focus()
  if (required && !value.value) {
    return
  }
  if (loading.value) {
    return
  }
  loading.value = true
  let success = true
  try {
    const result = await onSubmit(value.value)
    success = result !== false
  } catch (e) {
    console.error(e)
    success = false
  }
  loading.value = false
  if (success) {
    finalValue.value = value.value
    isGetFocus.value = false
    inputRef.value?.blur()
  }
}
</script>

<style scoped>
/* 行内编辑边框：平时透明、悬停/聚焦主色（token 变量随主题切换）。
   改用 class 而非内联：组件库 form 校验错误态的边框规则带 :not() 伪类、特异性 (0,3,0)，
   可自然压过此处两类状态 (0,2,0)——错误红优先于悬停/聚焦主色，无需组件感知校验状态 */
.inline-edit-idle {
  border-color: var(--lihua-alpha-0);
}

.inline-edit-active {
  border-color: var(--ant-color-primary);
}

/* form 校验错误态（根元素挂 ant-input-status-error）时隐藏确认按钮：
   当前值非法不提供提交动作，值改为合法后错误态实时清除、按钮恢复 */
.ant-input-status-error .inline-edit-confirm {
  display: none;
}
</style>
