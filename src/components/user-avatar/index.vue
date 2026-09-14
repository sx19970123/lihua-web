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
import {computed} from 'vue';
import {useThemeStore} from "@/stores/theme.ts";
import {resolveAvatarBackgroundColor} from "@/helpers/avatar.ts";

const themeStore = useThemeStore();
// 接收的参数：
// type 头像类型
// backgroundColor 背景颜色（'auto' 跟随系统主题色，见 helpers/avatar.ts 契约）
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

// 背景色渲染：auto 跟随主题色（主题切换实时生效）、合法纯色原样、非法值（含历史渐变串）兜底灰
const avatarBackgroundColor = computed(() => resolveAvatarBackgroundColor(backgroundColor, themeStore.getColorPrimary()))
</script>
