<template>
  <iframe class="lihua-iframe" v-if="isInner" :src="src"/>
  <div v-else>
    <a-card class="lihua-iframe" :styles="{body: {height: '100%', 'box-sizing': 'border-box'}}">
      <a-flex :gap="16" justify="flex-start" vertical align="center" class="h-full linkopen-container">
        <img class="linkopen-image" :src="themeStore.isDarkTheme ? linkopenHei : linkopenMiao" alt="页面已在新标签页打开">
        <a-typography-title style="margin: 0">页面已加载至浏览器新标签页</a-typography-title>
        <a-typography-link @click="open">再次打开</a-typography-link>
      </a-flex>
    </a-card>
  </div>
</template>
<script setup lang="ts">
import {useRoute} from "vue-router";
import {onMounted, onUnmounted, ref} from "vue";
import {useThemeStore} from "@/stores/theme";
import linkopenMiao from '@/assets/error/linkopen-miao.png'
import linkopenHei from '@/assets/error/linkopen-hei.png'

// 显式组件名与首页（两者按文件名推断均为 'index'）解耦：keep-alive include 按组件名匹配，
// 外链实例不再命中首页常驻的 'index' 缓存名额（link 路由本无 meta.cache，不入缓存）
defineOptions({ name: 'LinkIFrame' })

// prop 名与本地 src/isInner ref 同名，解构重命名避免冲突（image-cropper 先例）
const {src: srcProp, isInner: isInnerProp} = defineProps<{
  src?: string,
  isInner?: boolean
}>()

const route = useRoute()

// 外链插画：亮色模式 miao / 暗色模式 hei
const themeStore = useThemeStore()

const src = ref<string>()
const isInner = ref<boolean>()

if (srcProp) {
  src.value = srcProp
} else {
  src.value = route.meta.link as string
}

if (isInnerProp) {
  isInner.value = isInnerProp
} else {
  isInner.value = route.meta.linkOpenType === 'inner'
}

const handleOpen = () => {
  // 只有第一次进入页面时会打开连接
  if (!sessionStorage.getItem('isRefreshed' + src.value)) {
    // 不为内部链接时打开新标签页
    if (!isInner.value && src.value) {
      open()
    }
    sessionStorage.setItem('isRefreshed' + src.value, 'true');
  }
}

// 打开页面
const open = () => {
  window.open(src.value)
}

// 组件加载完成
onMounted(() => {
  handleOpen()
})

// 组件销毁
onUnmounted(() =>  sessionStorage.removeItem('isRefreshed' + src.value))
</script>
<style>
.lihua-iframe {
  width: 100%;
  border-radius: var(--ant-border-radius-lg);
  border: none;
}

/*
 头部/多标签/页脚的显示高度由 store 切换时直写的 display 变量提供（variable.css 内置默认值）：
 var(--layout-display-height)：头部高度
 var(--tab-display-height)：view-tabs高度
 var(--ant-margin)：上下外边距高度
 3px：微调偏移量
 var(--footer-display-height)：页脚高度
 */
.lihua-iframe {
  height: calc(100vh - var(--layout-display-height) - var(--tab-display-height) - var(--ant-margin) - var(--ant-margin) - 3px - var(--footer-display-height));
}
</style>
<style scoped>
.linkopen-container {
  box-sizing: border-box;
  padding-top: 8vh;
}
.linkopen-image {
  height: 240px;
  width: auto;
  max-width: 100%;
}
</style>
