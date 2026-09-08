<template>
  <a-card>
    <a-form layout="vertical">
      <!-- 主题设置 -->
      <a-typography-title :level="5">主题设置</a-typography-title>
      <a-form-item>
        <theme-mode-segmented/>
      </a-form-item>
      <a-form-item label="主题颜色">
        <color-select :dataSource="colorList" v-model:color="themeStore.colorPrimary" allow-custom @click="themeStore.changeColorPrimary()"/>
      </a-form-item>
      <a-form-item label="导航颜色" v-if="!themeStore.isDarkTheme">
        <color-select :dataSource="navColors" v-model:value="themeStore.siderTheme"/>
      </a-form-item>
      <a-divider/>

      <!-- 布局设置 -->
      <a-typography-title :level="5">布局设置</a-typography-title>
      <a-form-item label="导航类型" v-if="!themeStore.isSmallWindow">
        <nav-select v-model="themeStore.layoutType"/>
      </a-form-item>
      <a-form-item label="导航宽度" v-if="themeStore.layoutType !== 'top-navigation' || themeStore.isSmallWindow">
        <a-slider class="w-[230px]" v-model:value="themeStore.siderWith" @change="themeStore.changeSiderWidth" dots :max="400" :min="80" :step="20"></a-slider>
      </a-form-item>
      <a-form-item label="分组导航" v-if="themeStore.layoutType !== 'top-navigation' || themeStore.isSmallWindow">
        <a-switch v-model:checked="themeStore.siderGroup"/>
      </a-form-item>
      <a-form-item label="固定头部">
        <a-switch v-model:checked="themeStore.affixHead"/>
      </a-form-item>
      <a-form-item label="多任务栏" v-if="viewTabsStore.$state.showLayout && !isMiniWindow">
        <a-switch v-model:checked="themeStore.showViewTabs"/>
      </a-form-item>
      <a-form-item label="显示页脚">
        <a-switch v-model:checked="themeStore.showFooter"/>
      </a-form-item>
      <a-divider/>

      <!-- 其他设置 -->
      <a-typography-title :level="5">其他设置</a-typography-title>
      <a-form-item label="高级材质">
        <a-switch v-model:checked="themeStore.groundGlass"/>
      </a-form-item>
      <a-form-item label="组件尺寸">
        <a-radio-group v-model:value="themeStore.componentSize">
          <a-radio value="small">更小</a-radio>
          <a-radio value="default">适中（推荐）</a-radio>
          <a-radio value="large">更大</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="界面圆角">
        <a-slider class="w-[230px]" v-model:value="themeStore.borderRadius" :min="2" :max="16" dots/>
      </a-form-item>
      <a-form-item label="点击反馈">
        <a-select style="width: 200px" v-model:value="themeStore.clickEffect" :options="clickEffectList"/>
      </a-form-item>
      <a-form-item label="切换动画">
        <a-select style="width: 200px" v-model:value="themeStore.routeTransition" :options="transitionOptions"/>
      </a-form-item>
      <a-form-item>
        <a-popconfirm title="恢复默认主题？" @confirm="themeStore.resetState()">
          <a-button>恢复默认</a-button>
        </a-popconfirm>
      </a-form-item>
    </a-form>
  </a-card>

</template>
<script setup lang="ts">
import ThemeModeSegmented from "@/components/theme-mode-segmented/index.vue";
import ColorSelect from "@/components/color-select/index.vue"
import NavSelect from "@/components/nav-type-select/index.vue"
import settings from "@/settings";
import {useUserStore} from "@/stores/user";
import {serializeThemeState, useThemeStore} from "@/stores/theme";
import {usePermissionStore} from "@/stores/permission.ts";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import {computed, onUnmounted, ref, watch} from "vue";
import {ResponseError} from "@/api/global/type.ts";
import {message} from "@/antd-adapter";

const themeStore = useThemeStore()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const viewTabsStore = useViewTabsStore()
// 主题颜色
const colorList = ref<Array<{name: string,color: string}>>(settings.colorOptions)
// 点击效果选项
const clickEffectList = settings.clickEffectOptions
// 导航颜色：亮色块勾用主题色（白色勾在白色块上不可见）；暗色块底色取自有 sider 深色变量
const navColors = computed(() => [
  { name: '亮色', color: '#ffffff', key: 'light', checkColor: themeStore.colorPrimary },
  { name: '暗色', color: 'var(--lihua-sider-dark-color)', key: 'dark' }
])
const transitionOptions = [
  { value: 'none', label: '无' },
  { value: 'zoom', label: '变焦' },
  { value: 'fade', label: '淡入淡出' },
  { value: 'breathe', label: '呼吸' },
  { value: 'top', label: '上升' },
  { value: 'down', label: '切换' },
  { value: 'switch', label: '交换' },
  { value: 'trick', label: '整活' }
]
const isMiniWindow = ref<boolean>(window.location.href.includes("miniWindow=true"))
// 卸载组件时触发，同步主题到服务端（本地缓存已由 store 变更即写；内容无变化时 saveTheme 内部去重不发请求）
onUnmounted(()=> {
  userStore.saveTheme(serializeThemeState(themeStore.$state)).catch((e) => {
    if (e instanceof ResponseError) {
      message.error(e.msg)
    } else {
      console.log(e)
    }
  })
})

// Switch 的 change 事件先于 v-model 写回触发，回调内读状态是旧值，统一改为 watch 驱动
watch(() => themeStore.siderGroup, () => permissionStore.reloadMenu())
watch(() => themeStore.borderRadius, () => themeStore.changeBorderRadius())
watch(() => themeStore.showViewTabs, () => themeStore.changeShowViewTabs())
watch(() => themeStore.showFooter, () => themeStore.changeFooter())
watch(() => themeStore.groundGlass, () => themeStore.changeGroundGlass())
</script>