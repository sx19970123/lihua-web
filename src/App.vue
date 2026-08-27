<template>
  <a-config-provider :theme="themeStore.themeConfig" :locale="local" :component-size="themeStore.componentSize">
<!--    浏览器兼容提示-->
    <a-alert type="warning" closable banner v-if="showOldBrowserAlert()">
      <template #message>
        当前浏览器版本过低，部分功能可能无法正常使用，请升级浏览器版本，推荐使用
          <a-typography-link href="https://www.google.com/intl/zh-CN/chrome/" target="_blank">Chrome</a-typography-link>&nbsp;
          <a-typography-link href="https://www.microsoft.com/zh-cn/edge/" target="_blank">Edge</a-typography-link>&nbsp;
          <a-typography-link href="https://www.apple.com.cn/safari/" target="_blank">Safari</a-typography-link>&nbsp;
        等现代浏览器。
      </template>
    </a-alert>
<!--    网站主要内容-->
    <router-view/>
  </a-config-provider>
</template>

<script setup lang="ts">
import {getBrowserMajorVersion, getBrowserType} from "@/utils/browser.ts"
import {useThemeStore} from "@/stores/theme"
import {usePermissionStore} from "@/stores/permission.ts";
import {useSettingStore} from "@/stores/setting.ts";
import zhCN from 'antdv-next/locale/zh_CN';
import {onMounted, onUnmounted, ref, watch} from "vue";
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import {theme} from "antdv-next";

const { token } = theme.useToken()
const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
// 应用html-root主题颜色
themeStore.changeDocumentElement(token.value.colorPrimary)
// 全局主题引导：登录页不走 initApp 的主题初始化链，须在此做一次全量同步（算法+html属性），
// 避免 store 状态、antd 算法、DOM 属性三者起始不一致
themeStore.applyThemeMode()

// 初始化系统配置
const settingStore = useSettingStore()

// 配置中文
const local = ref(zhCN)
dayjs.locale(zhCN.locale)

// 当浏览器版本过低时，显示浏览器兼容性提示
const showOldBrowserAlert = () => {
  const browserType = getBrowserType()
  const version = getBrowserMajorVersion()

  switch (browserType) {
    case 'Chrome': {
      return version < 111
    }
    case 'Opera': {
      return version < 97
    }
    case 'Safari': {
      return false
    }
    case 'Firefox': {
      return true
    }
    default: {
      return true
    }
  }
}

// 加载主题相关
const initTheme = () => {
  // 匹配系统主题
  const marchSystemTheme = matchMedia('(prefers-color-scheme: dark)')

  // 处理跟随系统主题
  const handleFollowSystemTheme = () => {
    // 自动档接管：系统偏好变化时重推导实际态；登录页同样生效，不受服务端主题加载状态限制
    if (themeStore.themeMode === 'auto') {
      themeStore.applyThemeMode()
      marchSystemTheme.addEventListener('change', handleFollowSystemTheme)
    } else {
      marchSystemTheme.removeEventListener('change', handleFollowSystemTheme)
    }
  }

  // 将主题同步到其他标签页
  const syncTabTheme = (event: StorageEvent) => {
    // 同步外观模式（配置态），实际态由各端自行推导
    if (event.key === 'theme-mode' && event.newValue) {
      themeStore.changeThemeMode(event.newValue as 'light' | 'dark' | 'auto', true)
    }
    // 同步其他主题
    if (event.key === 'theme' && event.newValue) {
      themeStore.init(event.newValue)
      permissionStore.reloadMenu()
    }
  }

  return {
    handleFollowSystemTheme,
    syncTabTheme
  }

}
const {handleFollowSystemTheme, syncTabTheme} = initTheme()

// 监听token.value.colorPrimary修改html-root中主题颜色
watch(() => token.value.colorPrimary, () => {
  themeStore.changeDocumentElement(token.value.colorPrimary)
})

// 监听自动档接管（系统偏好监听器的挂载/卸载）；档位持久化由 changeThemeMode 收口
watch(() => themeStore.themeMode === 'auto', () => {
  handleFollowSystemTheme()
})

// 监听灰色模式
watch(() => settingStore.enableGrayMode, () => {
  themeStore.enableGrayModel(settingStore.enableGrayMode)
})

onMounted(() => {
  // 初始化基础设置
  settingStore.initBaseSetting()
  // 主题跟随系统
  handleFollowSystemTheme()
  // 启用监听storage以同步标签页间主题
  window.addEventListener('storage', syncTabTheme)
})

onUnmounted(() => {
  // 删除storage监听
  window.removeEventListener('storage', syncTabTheme)
})

</script>

