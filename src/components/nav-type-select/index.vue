<template>
  <a-flex :gap="16">
    <a-tooltip title="侧边导航">
      <div class="relative h-[43px] w-[53px] cursor-pointer rounded-ant-lg bg-ant-layout shadow-ant-ter" @click="handleClockNavType('side-navigation')">
        <div class="float-right h-[30%] w-[70%] rounded-tr-ant-lg bg-ant-container"/>
        <div class="nav-select-menu-left"/>
        <CheckOutlined class="absolute bottom-1.5 right-1.5 font-bold text-ant" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'side-navigation'"/>
      </div>
    </a-tooltip>

    <a-tooltip title="混合导航">
      <div class="relative h-[43px] w-[53px] cursor-pointer rounded-ant-lg bg-ant-layout shadow-ant-ter" @click="handleClockNavType('mix-navigation')">
        <div class="h-[30%] w-full rounded-t-ant-lg bg-ant-container"/>
        <div class="nav-select-menu-sub-left"/>
        <CheckOutlined class="absolute bottom-1.5 right-1.5 font-bold text-ant" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'mix-navigation'"/>
      </div>
    </a-tooltip>

    <a-tooltip title="顶部导航">
      <div class="relative h-[43px] w-[53px] cursor-pointer rounded-ant-lg bg-ant-layout shadow-ant-ter" @click="handleClockNavType('top-navigation')">
        <div class="nav-select-menu-top"/>
        <CheckOutlined class="absolute bottom-1.5 right-1.5 font-bold text-ant" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'top-navigation'"/>
      </div>
    </a-tooltip>
  </a-flex>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme.ts";

const props = defineProps<{
  modelValue: string
}>()
const emits = defineEmits(['update:modelValue','click','change'])

const themeStore = useThemeStore()

const handleClockNavType = (key: string) => {
  emits('update:modelValue',key)
  emits('click',key)
  emits('change',key)
}
</script>

<style scoped>
/* 三个深色导航示意块的底色需随 html[data-theme] 整体切换，内联样式会压过类选择器，
   因此保留在 CSS 层而不上移为工具类/内联 */
.nav-select-menu-left {
  width: 30%;
  height: 100%;
  background: var(--lihua-sider-dark-color);
  border-top-left-radius: var(--ant-border-radius-lg);
  border-bottom-left-radius: var(--ant-border-radius-lg);
}

.nav-select-menu-sub-left {
  width: 30%;
  height: 70%;
  background: var(--lihua-sider-dark-color);
  border-bottom-left-radius: var(--ant-border-radius-lg);
}

.nav-select-menu-top {
  width: 100%;
  height: 30%;
  background: var(--lihua-sider-dark-color);
  border-top-left-radius: var(--ant-border-radius-lg);
  border-top-right-radius: var(--ant-border-radius-lg);
}

[data-theme = 'dark'] {
  .nav-select-menu-left,
  .nav-select-menu-sub-left,
  .nav-select-menu-top {
    background: var(--ant-color-bg-elevated);
  }
}
</style>
