<template>
  <div :class="{ 'cursor-pointer': clickable }" @click="emit('click')">
    <div class="lihua-user-select relative inline-block border border-solid border-[var(--ant-color-border)] rounded-20px p-[2px] m-ant-xxs shadow-[var(--ant-box-shadow-tertiary)] unselectable">
<!--      整颗 chip 悬停浮层：内容与行为由插槽消费方决定，组件只提供定位与显隐（贴合 chip 圆角）-->
      <span v-if="hasHoverSlot" class="chip-hover-layer">
        <slot name="hover"/>
      </span>
      <a-flex align="center" :gap="4" wrap="nowrap">
<!--        头像（json 解析在 user-avatar 内部完成）-->
        <user-avatar :avatar-json="displayJson"/>
<!--        昵称-->
        <a-typography class="nickname" ellipsis v-if="nickname">{{nickname}}</a-typography>
      </a-flex>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/user-avatar/index.vue'
import {useUserStore} from "@/stores/user.ts";
import {computed, getCurrentInstance, useSlots} from "vue";

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

// 未传头像 json 时回退默认头像（昵称文字头像）
const displayJson = computed(() => avatarJson || JSON.stringify(userStore.getDefaultAvatar(nickname)))

</script>

<style scoped>
/* 昵称内边距：.ant-typography 根级 resetComponent 声明 padding，工具类同特异性会被 cssinjs 后注入反杀，维持 scoped */
.nickname {
  padding-right: var(--ant-padding-xxs);
}
</style>
