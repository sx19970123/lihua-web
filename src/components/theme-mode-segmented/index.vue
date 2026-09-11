<template>
  <div class="pr-ant-base">
    <a-segmented :value="themeStore.themeMode" shape="round" :options="themeOptions"
                 :class="{'translucent-segmented': translucent}"
                 @change="(mode: string | number) => themeStore.changeThemeMode(mode as ThemeMode)"/>
  </div>
</template>

<script setup lang="ts">
import {h} from "vue";
import {MoonOutlined, SunOutlined, SyncOutlined} from "@antdv-next/icons";
import {useThemeStore} from "@/stores/theme";
import {type ThemeMode} from "@/settings";

// 半透明玻璃样式，用于玻璃/透明底面场景
const {translucent} = defineProps<{
  translucent?: boolean
}>()

const themeStore = useThemeStore()

const themeOptions = [
  {value: 'light', icon: h(SunOutlined)},
  {value: 'dark', icon: h(MoonOutlined)},
  {value: 'auto', icon: h(SyncOutlined)},
]
</script>

<style scoped>
/* 半透明模式：背景次透 + 毛玻璃；选中底色运动期由 .ant-segmented-thumb 元素承载、
   稳定后 thumb 隐藏改由 .ant-segmented-item-selected 承载（vc-segmented 以 !thumbShow 切换），
   两层必须同色才无跳变，取比轨道高一档的半透明白区分层级 */
:deep(.translucent-segmented.ant-segmented) {
  background: var(--lihua-alpha-4);
  backdrop-filter: var(--lihua-backdrop-filter-sm);
}

:deep(.translucent-segmented.ant-segmented .ant-segmented-thumb),
:deep(.translucent-segmented.ant-segmented .ant-segmented-item-selected) {
  background: var(--lihua-alpha-6);
}

/* 半透明底上组件库默认的淡色图标与实色 hover 底都会糊掉/突兀，显式压深图标、hover 改半透明；
   选中项须排除在 hover 规则外，否则 hover 特异性更高会把选中底顶成近全透 */
:deep(.translucent-segmented.ant-segmented .ant-segmented-item) {
  color: var(--ant-color-text, rgba(0, 0, 0, 0.88));
}

:deep(.translucent-segmented.ant-segmented .ant-segmented-item:not(.ant-segmented-item-selected):hover) {
  background: var(--lihua-alpha-2);
}
</style>
