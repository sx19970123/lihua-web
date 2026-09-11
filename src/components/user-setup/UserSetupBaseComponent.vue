<template>
  <a-card class="login-setting-card" :styles="{body: {margin: 'var(--ant-margin-xl)', 'padding-right': 'var(--ant-padding)'}}">
    <a-button class="login-setting-prev-btn" type="text" v-if="back" @click="handleBack">
      <template #icon>
        <LeftOutlined />
      </template>
    </a-button>
    <a-flex justify="center" align="center" vertical="vertical" :gap="16">
<!--        图标-->
      <component class="login-setting-icon" :is="icon" :style="{color: themeStore.getColorPrimary()}"/>
      <div class="login-setting-text">
<!--        标题-->
        <a-typography-title :level="2">{{title}}</a-typography-title>
<!--        描述-->
        <a-typography-text type="secondary" v-if="description">{{description}}</a-typography-text>
      </div>
      <div class="login-setting-content scrollbar">
<!--      设置插槽-->
        <slot name="content"/>
      </div>
      <div class="login-setting-bottom-btn">
        <a-flex vertical="vertical" :gap="8">
          <a-button type="primary" @click="handleNext" :loading="mainBtnLoading">
            {{mainBtnTitle}}
            <RightOutlined v-if="showMainBtnIcon"/>
          </a-button>
<!--            跳过-->
          <a-popconfirm v-if="skip && skipMsg" :title="skipMsg" @confirm="handleSkip">
            <a-button type="link" :loading="skipBtnLoading">
              以后再说
            </a-button>
          </a-popconfirm>
          <a-button type="link" v-else-if="skip" @click="handleSkip" :loading="skipBtnLoading">
            以后再说
          </a-button>
          <a-button type="link" v-if="showGoLoginBtn" @click="handleGoLogin">
            返回登录
          </a-button>
        </a-flex>
      </div>
    </a-flex>
  </a-card>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme.ts";
import {ref} from "vue";
import type {Ref} from "vue";

const themeStore = useThemeStore();
// 父组件传值配置
const { icon, title, description, skip = true, skipMsg, back = true, mainBtnTitle = '下一步', showMainBtnIcon = true , showGoLoginBtn = false} = defineProps<{
  // 图标
  icon: string;
  // 标题
  title: string;
  // 描述
  description?: string;
  // 跳过
  skip?: boolean;
  // 点击跳过提示词
  skipMsg?: string;
  // 返回
  back?: boolean;
  // 主按钮文本
  mainBtnTitle?: string;
  // 下一步图标
  showMainBtnIcon?: boolean;
  // 返回登录
  showGoLoginBtn?: boolean;
}>()

// 主按钮加载
const mainBtnLoading = ref<boolean>(false)
// 跳过按钮加载
const skipBtnLoading = ref<boolean>(false)

// 抛出函数：next/skip 载荷为按钮 loading 的 Ref 本体——包装组件接收后写 .value 控制按钮加载态
const emit = defineEmits<{
  next: [loading: Ref<boolean>],
  skip: [loading: Ref<boolean>],
  back: [],
  goLogin: []
}>()

// 下一步
const handleNext = () => {
  emit("next", mainBtnLoading)
}
// 跳过
const handleSkip = () => {
  emit("skip", skipBtnLoading)
}
// 返回
const handleBack = () => {
  emit("back")
}
// 退回登录
const handleGoLogin = () => {
  emit('goLogin')
}
</script>

<style scoped>
.login-setting-card {
  width: 100%;
  border-radius: 24px;
}
.login-setting-prev-btn {
  position: absolute;
  top: 16px;
  left: 16px
}
.login-setting-icon {
  font-size: 60px
}
.login-setting-text {
  text-align: center;
  height: 75px;
}
.login-setting-content {
  margin-top: var(--ant-margin);
  height: 240px
}
.login-setting-bottom-btn {
  width: 220px;
  height: 72px;
}
</style>
