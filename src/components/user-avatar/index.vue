<template>
  <div>
    <a-avatar class="modify"
              :size="size"
              :style="type !== 'image' ? {background: avatarBackgroundColor} : {}"
              :src="type === 'image' ? url : ''"
    >
      <template v-if="type === 'icon'" #icon>
        <component :is="value"/>
      </template>
      <template v-if="type === 'text'">
        {{ value }}
      </template>
    </a-avatar>
  </div>
</template>

<script setup lang="ts">
import {ref, watch} from 'vue';
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();
// 接收的参数：
// type 头像类型
// backgroundColor 背景颜色
// value 头像值（图标/文本）
// size 头像尺寸
// url 头像链接（图片）
const {
  // 头像类型
  type = '',
  // 背景颜色
  backgroundColor = '',
  // 头像值（图标/文本）
  value = '',
  // 头像尺寸
  size = 32,
  // 头像链接（图片）
  url = ''
} = defineProps<{
  // 头像类型
  type?: string,
  // 背景颜色
  backgroundColor?: string,
  // 头像值（图标/文本）
  value?: string,
  // 头像尺寸
  size?: number,
  // 头像链接（图片）
  url?: string
}>()

// 当设置颜色为跟随系统时，获取colorPrimary设置为背景颜色
const avatarBackgroundColor = ref<string>(backgroundColor)
const setColorPrimary = () => {
  if (backgroundColor.startsWith("conic-gradient")) {
    avatarBackgroundColor.value = themeStore.getColorPrimary()
  } else {
    avatarBackgroundColor.value = backgroundColor
  }
}
setColorPrimary()

// 监听系统主题变化
watch(() => themeStore.$state.antColorPrimary, () => {
  setColorPrimary()
})
watch(() => backgroundColor, () => {
  setColorPrimary()
})
</script>
