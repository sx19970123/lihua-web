<template>
  <div :class="{ 'cursor-pointer': clickable }" @click="emit('click')">
    <div class="lihua-user-select relative inline-block border border-solid border-[var(--ant-color-border)] rounded-20px p-[2px] m-ant-xxs shadow-[var(--ant-box-shadow-tertiary)] unselectable">
<!--      整颗 chip 悬停浮层：内容与行为由插槽消费方决定，组件只提供定位与显隐（贴合 chip 圆角）-->
      <span v-if="hasHoverSlot" class="chip-hover-layer">
        <slot name="hover"/>
      </span>
      <a-flex align="center" :gap="4" wrap="nowrap">
<!--        头像-->
        <user-avatar
            :value="avatar.value"
            :type="avatar.type"
            :url="avatar.url"
            :background-color="avatar.backgroundColor"
        />
<!--        昵称-->
        <a-typography class="nickname" ellipsis v-if="nickname">{{nickname}}</a-typography>
      </a-flex>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/user-avatar/index.vue'
import {useUserStore} from "@/stores/user.ts";
import type {AvatarType} from "@/api/system/profile/type/sys-profile.ts";
import {computed, getCurrentInstance, ref, useSlots} from "vue";
import {resolvePublicAttachmentUrl} from "@/api/system/attachment/attachment-storage.ts";

const userStore = useUserStore();

const {avatarJson, nickname} = defineProps<{
  avatarJson?: string,
  nickname?: string
}>()

const emit = defineEmits<{click: []}>()

const slots = useSlots()
const hasHoverSlot = computed(() => !!slots.hover)

// 绑定了 click 监听才显示可点击光标：纯展示场景（如通知预览）保持默认光标
const instance = getCurrentInstance()
const clickable = computed(() => !!instance?.vnode.props?.onClick)

// 回显头像
const avatar = ref<AvatarType>({})
try {
  if (avatarJson) {
    avatar.value = JSON.parse(avatarJson)
    // 处理图片类型头像：对象键按公开链直用（不 fetch 转 blob，缓存交由下载端 Cache-Control 接管）
    if (avatar.value.value && avatar.value.type === 'image') {
      avatar.value.url = resolvePublicAttachmentUrl(avatar.value.value)
    }
  } else {
    avatar.value = userStore.getDefaultAvatar()
    avatar.value.value = nickname
  }
} catch (e) {
  console.error("头像获取异常，重置为默认头像")
  avatar.value = userStore.getDefaultAvatar()
  avatar.value.value = nickname
}

</script>

<style scoped>
/* 昵称内边距：.ant-typography 根级 resetComponent 声明 padding，工具类同特异性会被 cssinjs 后注入反杀，维持 scoped */
.nickname {
  padding-right: var(--ant-padding-xxs);
  white-space: nowrap;
}

/* 整颗 chip 悬停浮层：毛玻璃为主 + 轻暗底（0.18），× 靠投影保证对比度；圆角贴合 chip 本体，仅当提供 hover 插槽时渲染 */
.chip-hover-layer {
  position: absolute;
  inset: 0;
  /* .ant-avatar 自带 position:relative，同为定位元素时按 DOM 序绘制会盖住浮层，显式提升层级 */
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.18);
  color: #fff;
  font-size: 14px;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  backdrop-filter: var(--lihua-backdrop-filter-lg);
  opacity: 0;
  transition: opacity 0.17s ease;
  pointer-events: none;
}

.lihua-user-select:hover .chip-hover-layer {
  opacity: 1;
}
</style>
