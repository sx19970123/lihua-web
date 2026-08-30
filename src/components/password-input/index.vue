<template>
  <div>
    <a-input-password v-model:value="password"
                      @change="handleChangePassword"
                      :placeholder="placeholder"
                      :maxlength="MAX_LENGTH"
                      :style="{height: height}"
    >
      <template #prefix v-if="prefixIcon">
        <LockOutlined class="input-prefix-icon-color"/>
      </template>
    </a-input-password>
    <!-- margin 内联保留：.ant-progress 根级 resetComponent margin:0 反杀 m-0 工具类 -->
    <a-progress style="margin: 0;"
                v-show="showProgress"
                :showInfo="false"
                :size="[progressWidth, 3]"
                :steps="3"
                :percent="passwordLevel"
                :strokeColor="STRENGTH_STEP_COLORS"/>
  </div>
</template>

<script setup lang="ts">
import {onMounted, ref, watch} from "vue";

// 密码长度上限
const MAX_LENGTH = 30;
// 三步强度条配色（弱/中/强）
const STRENGTH_STEP_COLORS = ['#ff4d4f', '#faad14', '#52c41a'];
// 强度等级（以三步条的点亮百分比表达）
const STRENGTH_LEVELS = {
  // 弱：仅达到最小长度
  weak: 30,
  // 中：字母 + 数字
  medium: 60,
  // 强：字母 + 数字 + 特殊字符
  strong: 90,
  // 空值或未达弱标准
  none: 10
} as const;

const weakRegex = /^.{6,}$/;
const mediumRegex = /^(?=.*\p{L})(?=.*\d).{8,}$/u;
const strongRegex = /^(?=.*\p{L})(?=.*\d)(?=.*[^\p{L}\d]).{10,}$/u;

// 接收的参数：
// modelValue v-model 双向绑定密码值
// placeholder 输入框占位提示
// progressWidth 强度条宽度（px）
// height 输入框高度
// prefixIcon 是否显示前缀锁图标
// showProgress 是否显示强度条
const {modelValue, placeholder, progressWidth = 90, height, prefixIcon = false, showProgress = true} = defineProps<{
  // v-model 双向绑定密码值
  modelValue?: string,
  // 输入框占位提示
  placeholder?: string,
  // 强度条宽度（px）
  progressWidth?: number,
  // 输入框高度
  height?: string,
  // 是否显示前缀锁图标
  prefixIcon?: boolean,
  // 是否显示强度条
  showProgress?: boolean
}>()

const emits = defineEmits<{
  // v-model 双向绑定
  'update:modelValue': [value?: string]
}>()

// 输入中的密码
const password = ref<string | undefined>(modelValue)
// 强度等级（三步条百分比）
const passwordLevel = ref<number>(STRENGTH_LEVELS.none)

const handleChangePassword = () => {
  const passwordValue = password.value
  if (passwordValue) {
    if (strongRegex.test(passwordValue)) {
      passwordLevel.value = STRENGTH_LEVELS.strong
    } else if (mediumRegex.test(passwordValue)) {
      passwordLevel.value = STRENGTH_LEVELS.medium
    } else if (weakRegex.test(passwordValue)) {
      passwordLevel.value = STRENGTH_LEVELS.weak
    } else {
      passwordLevel.value = STRENGTH_LEVELS.none
    }
  } else {
    passwordLevel.value = STRENGTH_LEVELS.none
  }
  emits('update:modelValue', passwordValue)
}

onMounted(() => {
  handleChangePassword()
})

// 外部值变化时同步并重算强度
watch(() => modelValue, () => {
  password.value = modelValue
  handleChangePassword()
})
</script>
