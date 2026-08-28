<template>
  <div class="color-container">
    <a-tooltip title="亮色">
      <div class="color-block" style="background: #ffffff" @click="handleClickNavColor('light')">
        <CheckOutlined class="color-selected" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'light'"/>
      </div>
    </a-tooltip>
    <a-tooltip title="暗色">
      <div class="color-block" style="background: #021524" @click="handleClickNavColor('dark')">
        <CheckOutlined class="color-selected" style="color: #ffffff" v-if="props.modelValue === 'dark'"/>
      </div>
    </a-tooltip>
  </div>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme.ts";
// 接收全部颜色 items 和 双向绑定的颜色值 modelValue
const props = defineProps<{
  modelValue: string
}>();

// 使用 update:modelValue 定义 更新 v-model 方法
const emits = defineEmits(['update:modelValue','click'])

const themeStore = useThemeStore()

const handleClickNavColor = (key: string) => {
  emits('update:modelValue',key)
  emits('click',key)
}
</script>

<style scoped>
.color-container {
  display: flex;
  flex-wrap: nowrap;
}

.color-block {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  width: 24px;
  border-radius: var(--ant-border-radius-lg);
  cursor: pointer;
  margin-right: var(--ant-margin-xs);
  box-shadow: var(--ant-box-shadow-tertiary);
}

.color-selected {
  color: #1677ff;
  font-weight: 700;
  font-size: var(--ant-font-size);
}
</style>
