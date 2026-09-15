<template>
  <div class="title-content unselectable cursor-pointer" @click="goHome" :style="{maxWidth: maxWidth + 'px'}">
    <a-flex gap="middle" align="center" justify="center">
      <!--      系统logo：亮色模式 miao / 暗色模式 hei（徽章自带圆底，直接展示；名称与图片均取 app-info）-->
      <img class="size-8" :src="themeStore.isDarkTheme ? appInfo.appLogo.dark : appInfo.appLogo.light" :alt="appInfo.appEnname"/>
      <!--    系统名称-->
      <!--margin: 0 保证与头像同轴线；样式走 styles 语义 prop（scoped 样式无法穿透组件深层渲染链）-->
      <a-typography-title :level="4" ellipsis v-if="showTitle"
                          :styles="{root: {margin: 0, overflow: 'hidden', color: darkSiderColor ? 'var(--lihua-alpha-5)' : undefined}}">
        {{ appInfo.appEnname }}
      </a-typography-title>
    </a-flex>
  </div>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme";
import {useRouter} from 'vue-router'
import {computed} from "vue";
import appInfo from "@/app-info.ts"

const router = useRouter()
const themeStore = useThemeStore()
const {showTitle = true, maxWidth, autoColor = true} = defineProps<{
  // 显示标题
  showTitle?: boolean,
  // 最大宽度
  maxWidth?: number,
  // 自动匹配深浅菜单颜色
  autoColor?: boolean,
}>()
// 点击回到首页
const goHome = async () => {
  await router.push("/index");
}

// 菜单栏为暗色并主题不为暗色时，使用自定义的标题颜色
const darkSiderColor = computed(() => {
  if (autoColor) {
    return themeStore.siderTheme === 'dark' && !themeStore.isDarkTheme
  }
  return autoColor
})
</script>

