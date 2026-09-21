<template>
  <a-card :styles="{root: {height: '100vh'}, body: {height: '100%', 'box-sizing': 'border-box'}}">
    <div class="error-container">
      <img class="error-image" :src="themeStore.isDarkTheme ? errHei : errMiao" alt="403">
      <a-typography-title style="margin: 0">403 Forbidden Access</a-typography-title>
      <a-typography-text type="secondary">您没有权限访问此页面</a-typography-text>
      <a-button type="primary" @click="toIndex">回到首页</a-button>
    </div>
  </a-card>
</template>
<script setup lang="ts">
import {useRouter} from "vue-router";
import {useThemeStore} from "@/stores/theme";
import errMiao from '@/assets/error/403-miao.png'
import errHei from '@/assets/error/403-hei.png'

// 错误插画：亮色模式 miao / 暗色模式 hei
const themeStore = useThemeStore()

// 经路由守卫回首页（未登录会被引导至登录页）
const router = useRouter()
const toIndex = () => {
  router.push("/index")
}
</script>
<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 16px;
  height: 100%;
  padding-top: 15vh;
  box-sizing: border-box;
  text-align: center;
}
.error-image {
  height: 240px;
  width: auto;
  max-width: 100%;
}
</style>
