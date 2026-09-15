<template>
  <div>
    <a-avatar class="modify"
              :size="size"
              :style="avatar.type !== 'image' ? {background: avatarBackgroundColor} : {}"
              :src="imageUrl"
    >
      <template v-if="avatar.type === 'icon'" #icon>
        <component :is="avatar.value"/>
      </template>
      <template v-if="avatar.type === 'text'">
        {{ avatar.value }}
      </template>
    </a-avatar>
  </div>
</template>

<script setup lang="ts">
import {computed} from 'vue';
import {useThemeStore} from "@/stores/theme.ts";
import {resolveAvatarBackgroundColor} from "@/helpers/avatar.ts";
import {resolveAttachmentEntryUrl} from "@/api/system/attachment/attachment-storage.ts";
import type {AvatarType} from "@/api/system/profile/type/sys-profile.ts";

const themeStore = useThemeStore();

// 接收的参数：
// avatarJson 头像配置 JSON（后端下发单字段；image 型 value 为可直接访问的相对链）
// size 头像尺寸
const {
    // 头像配置 JSON
    avatarJson = '',
    // 头像尺寸
    size = 32
} = defineProps<{
    // 头像配置 JSON
    avatarJson?: string,
    // 头像尺寸
    size?: number
}>()

// json 解析在组件内部完成：解析失败/为空按无配置处理
const avatar = computed<AvatarType>(() => {
    if (!avatarJson) {
        return {}
    }
    try {
        return JSON.parse(avatarJson)
    } catch {
        return {}
    }
})

// image 型访问链：后端相对链拼部署态前缀；blob:/http(s) 本地预览地址直用
const imageUrl = computed(() => {
    const value = avatar.value.value
    if (avatar.value.type !== 'image' || !value) {
        return ''
    }
    return value.startsWith("blob:") || value.startsWith("http") ? value : resolveAttachmentEntryUrl(value)
})

// 背景色渲染：auto 跟随主题色（主题切换实时生效）、合法纯色原样、非法值（含历史渐变串）兜底灰
const avatarBackgroundColor = computed(() => resolveAvatarBackgroundColor(avatar.value.backgroundColor, themeStore.getColorPrimary()))
</script>
