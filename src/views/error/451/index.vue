<template>
  <a-card :styles="{root: {height: '100vh'}, body: {height: '100%', 'box-sizing': 'border-box'}}">
    <div class="error-container">
      <img class="error-image" :src="themeStore.isDarkTheme ? errHei : errMiao" alt="451">
      <a-typography-title style="margin: 0">Service to the area is temporarily unavailable</a-typography-title>
      <a-typography-text type="secondary">暂时无法为该地区提供服务</a-typography-text>
    </div>
  </a-card>
</template>
<script setup lang="ts">
import {useThemeStore} from "@/stores/theme";
import errMiao from '@/assets/error/451-miao.png'
import errHei from '@/assets/error/451-hei.png'

// 错误插画：亮色模式 miao / 暗色模式 hei
const themeStore = useThemeStore()
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
