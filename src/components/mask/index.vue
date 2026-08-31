<template>
  <!-- mask 打开时背景蒙版 -->
  <Teleport to="body">
    <!-- lihua-mask 类名是 ground-glass.css 毛玻璃模式的全局样式钩子，不可移除 -->
    <div class="lihua-mask fixed top-0 left-0 w-screen h-screen bg-black/45"
         :style="{zIndex: zIndex}"
         v-if="showMask"
         @click="handleClickMask($event)"></div>
  </Teleport>
</template>

<script setup lang="ts">
import {onBeforeUnmount, watch} from "vue";
import {hiddenOverflowY, showOverflowY} from "@/utils/scrollbar.ts";
// 控制遮罩开关
const {showMask, zIndex = 1000} = defineProps<{
  showMask: boolean,
  zIndex?: number
}>()
const emits = defineEmits(['click'])
// 遮罩点击事件
const handleClickMask = (event: KeyboardEvent | MouseEvent) => {
  emits('click', event, 'mask')
}

// 组件卸载时处理显示滚动条
onBeforeUnmount(() => {
  showOverflowY()
})

// 判断遮罩是否打开，打开时调用隐藏Y轴滚动条，关闭时显示滚动条
watch(() => showMask, (value) => {
  if (value) {
    hiddenOverflowY()
  } else {
    showOverflowY()
  }
})
</script>
