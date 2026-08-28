<template>
  <a-flex :gap="16">
    <a-tooltip title="侧边导航">
      <div class="nav-select-content" @click="handleClockNavType('side-navigation')">
        <div class="nav-select-sub-top"/>
        <div class="nav-select-menu-left"/>
        <CheckOutlined class="nav-select-check-icon" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'side-navigation'"/>
      </div>
    </a-tooltip>

    <a-tooltip title="混合导航">
      <div class="nav-select-content" @click="handleClockNavType('mix-navigation')">
        <div class="nav-select-top"/>
        <div class="nav-select-menu-sub-left"/>
        <CheckOutlined class="nav-select-check-icon" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'mix-navigation'"/>
      </div>
    </a-tooltip>

    <a-tooltip title="顶部导航">
      <div class="nav-select-content" @click="handleClockNavType('top-navigation')">
        <div class="nav-select-menu-top"/>
        <CheckOutlined class="nav-select-check-icon" :style="{color: themeStore.colorPrimary}" v-if="props.modelValue === 'top-navigation'"/>
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
.nav-select-check-icon {
  position: absolute;
  bottom: 6px;
  right: 6px;
  font-weight: 700;
  font-size: var(--ant-font-size);
}

.nav-select-content {
  position: relative;
  width: 53px;
  height: 43px;
  background: var(--ant-color-bg-layout);
  border-radius: var(--ant-border-radius-lg);
  cursor: pointer;
  box-shadow: var(--ant-box-shadow-tertiary);
}

.nav-select-sub-top {
  width: 70%;
  height: 30%;
  background: var(--ant-color-bg-container);
  float: right;
  border-top-right-radius: var(--ant-border-radius-lg);
}

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

.nav-select-top {
  width: 100%;
  height: 30%;
  background: var(--ant-color-bg-container);
  border-top-left-radius: var(--ant-border-radius-lg);
  border-top-right-radius: var(--ant-border-radius-lg);
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
