<template>
  <HappyProvider :enabled="themeStore.clickEffect === 'happy'" v-slot="{ wave: happyWave }">
    <a-config-provider :theme="themeStore.themeConfig" :locale="local" :component-size="themeStore.componentSize"
                     :wave="happyWave ?? waveConfig"
                     :modal="{centered: true, mask: glassMaskConfig, styles: {mask: glassMaskStyle}}"
                     :drawer="{mask: glassMaskConfig, styles: {mask: glassMaskStyle}}">
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
<!--    a-app 默认渲染一层 div.ant-app(component=false 的 Fragment 分支在 antdv-next 1.5.2 下不渲染插槽内容,不可用)-->
    <a-app ref="appApiRef">
      <router-view/>
    </a-app>
  </a-config-provider>
  </HappyProvider>
</template>

<script setup lang="ts">
import {getBrowserMajorVersion, getBrowserType} from "@/utils/browser.ts"
import {useThemeStore} from "@/stores/theme"
import {usePermissionStore} from "@/stores/permission.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {clickEffectWaveConfig} from "@/helpers/wave-effects";
import {HappyProvider} from "@antdv-next/happy-work-theme";
import zhCN from 'antdv-next/locale/zh_CN';
import {onMounted, onUnmounted, ref, useTemplateRef, watch, computed} from "vue";
import 'dayjs/locale/zh-cn';
import dayjs from 'dayjs';
import {bindAppApi, type AppApi} from "@/antd-adapter";
import {initPageScrollbar, bridgeAntdScrollLock} from "@/utils/scrollbar.ts";

const themeStore = useThemeStore()
const permissionStore = usePermissionStore()
// <a-app> 暴露的 message/notification/modal 上下文内实例，挂载后供静态方法出口转发
const appApiRef = useTemplateRef<AppApi>("appApiRef")
// 全局主题引导：登录页不走 initApp 的主题初始化链，须在此做一次全量同步（算法+html属性+主题色），
// 避免 store 状态、antd 算法、DOM 属性三者起始不一致；主题色同步由 store 内部完成
// （不可用根级 useToken 取色：App.vue 在自身渲染的 ConfigProvider 之外，只会拿到库默认 token）
themeStore.applyThemeMode()

// 初始化系统配置
const settingStore = useSettingStore()

// 配置中文
const local = ref(zhCN)
dayjs.locale(zhCN.locale)

// 弹层 mask 毛玻璃统一走组件库原生 mask.blur，跟随高级材质开关（仅影响其后新打开的弹层）。
// 仅 Modal/Drawer：二者遮罩独立于内容动画，模糊自第一帧恒定生效。
// Image 预览不参与：其为单根整体淡入结构（遮罩是 opacity 过渡根的子元素），过渡期间遮罩的
// backdrop-filter 被祖先 opacity 合成组隔离无法取样页面，过渡结束瞬间虚化突跳——保持库默认纯暗底遮罩
const glassMaskConfig = computed(() => ({blur: themeStore.groundGlass}))
// mask 模糊强度统一取本体系 sm 档（组件库内置 blur(4px) 偏弱），以内联样式覆盖
const glassMaskStyle = computed(() => themeStore.groundGlass
    ? {backdropFilter: 'var(--lihua-backdrop-filter-sm)'}
    : {})

// 点击效果映射；快乐工作档由 HappyProvider 作用域插槽提供官方配置（模板中优先取插槽值），此处回落空配置
const waveConfig = computed(() => {
  if (themeStore.clickEffect === 'happy') return {}
  return clickEffectWaveConfig[themeStore.clickEffect] ?? {}
})

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

  return {
    handleFollowSystemTheme
  }

}
const {handleFollowSystemTheme} = initTheme()

// 监听自动档接管（系统偏好监听器的挂载/卸载）；档位持久化由 changeThemeMode 收口
watch(() => themeStore.themeMode === 'auto', () => {
  handleFollowSystemTheme()
})

// 分组导航开关变更需重建菜单数据；watch 挂在应用层而非样式布局页，
// 保证跨窗主题同步重放、以及未来任何来源的变更都能刷新菜单
watch(() => themeStore.siderGroup, () => {
  permissionStore.reloadMenu()
})

// 监听灰色模式
watch(() => settingStore.enableGrayMode, () => {
  themeStore.enableGrayModel(settingStore.enableGrayMode)
})

onMounted(() => {
  // 页面级悬浮滚动条接管，登录页同样生效
  initPageScrollbar()
  // antd 弹层滚动锁镜像桥接（body 裁切已反杀防塌缩跳顶，锁定效果经 OS 视口通道补回）
  bridgeAntdScrollLock()
  // 注入上下文内实例，使静态形式的 message/notification/Modal 应用当前主题
  if (appApiRef.value) bindAppApi(appApiRef.value)
  // 初始化基础设置
  settingStore.initBaseSetting()
  // 主题跟随系统
  handleFollowSystemTheme()
  // 挂接跨窗主题同步（主窗与小窗画中画 iframe 间全量广播，替代原 storage 事件方案）
  themeStore.subscribeThemeBroadcast()
})

</script>

