<template>
  <!--拖拽期间本体以 opacity:0 占位（乐观排序让位动画的锚点），拖拽视觉由外层 DragOverlay 浮层呈现-->
  <a-flex ref="rowRef" align="center" :gap="8" :style="isDragging ? {opacity: 0} : undefined">
    <!--              拖动图标（拖拽手柄）-->
    <HolderOutlined ref="handleRef" class="hover:cursor-grab active:cursor-grabbing hover:text-[var(--colorPrimary)]"/>
    <!--              是否显示-->
    <a-checkbox v-model:checked="setting.display" @change="emit('displayChange')">
      <div class="w-[60px]">
        <a-tooltip :title="setting.label">
          <a-typography-text ellipsis>{{ setting.label }}</a-typography-text>
        </a-tooltip>
      </div>
    </a-checkbox>
    <a-flex class="right-content" :gap="8">
      <!--              宽度控制-->
      <a-slider class="slider"
                v-model:value="setting.width"
                :min="sliderMin"
                :max="sliderMax"
                v-show="setting.display"
                v-if="enableWidthSetting"
                @change="emit('widthChange')"
      />
      <!--              左固定（character 渲染的 vnode 不带本组件 scopeId，图钉样式只能内联）-->
      <a-rate :count="1"
              v-model:value="setting.leftFixed"
              :character="leftPin"
              @change="(value: number) => emit('leftFixedChange', value)"
              :style="{color: themeStore.getColorPrimary()}"/>
      <!--              右固定（水平翻转）-->
      <a-rate :count="1"
              v-model:value="setting.rightFixed"
              :character="rightPin"
              @change="(value: number) => emit('rightFixedChange', value)"
              :style="{color: themeStore.getColorPrimary()}"/>
    </a-flex>
  </a-flex>
</template>
<script setup lang="ts">
import {computed, h, ref} from "vue";
import {useSortable} from "@dnd-kit/vue/sortable";
import {RestrictToVerticalAxis} from "@dnd-kit/abstract/modifiers";
import {PushpinOutlined} from "@antdv-next/icons";
import {useThemeStore} from "@/stores/theme.ts";
import type {TableSettingType} from "@/components/table-setting/TableSettingType.ts";

const {setting, index, enableWidthSetting, minWidth, maxWidth} = defineProps<{
  // 该行的列配置
  setting: TableSettingType,
  // 行索引（随拖拽排序实时变化）
  index: number,
  // 是否开启宽度控制
  enableWidthSetting: boolean,
  // 宽度调节最小值
  minWidth: number,
  // 宽度调节最大值
  maxWidth: number
}>()

// 轴锁修饰器（模块级稳定引用）：拖拽位移只保留纵向分量
const verticalAxisModifiers = [RestrictToVerticalAxis]

// 滑杆范围基于基准宽（defaultWidth：列定义宽或 DOM 实测宽，拖动不改变它）：
// 若依赖实时 width，拖到上限会令上限重算抬高，形成正反馈失控增长；上限在基准之上留
// 100px 调节余量，下限收缩到基准可保持原值（defaultWidth 为 0 表示未测量，不参与收缩）
const sliderMin = computed(() => setting.defaultWidth > 0 ? Math.min(minWidth, setting.defaultWidth) : minWidth)
const sliderMax = computed(() => Math.max(maxWidth, setting.defaultWidth + 100))

const emit = defineEmits<{
  displayChange: [],
  widthChange: [],
  leftFixedChange: [value: number],
  rightFixedChange: [value: number]
}>()

const themeStore = useThemeStore();

// 左固定图钉
const leftPin = () => h(PushpinOutlined)
// 右固定图钉（水平翻转 + 右侧间距，内联原因见模板注释）
const rightPin = () => h(PushpinOutlined, {style: {transform: "scaleX(-1)", marginRight: "var(--ant-margin-xs)"}})

// 拖拽注册：element/target 为行根；handle 限定在拖拽图标，避免与复选框/滑杆/图钉的点击冲突
const rowRef = ref()
const handleRef = ref()
const {isDragging} = useSortable({
  id: () => setting.key,
  index: () => index,
  element: rowRef,
  target: rowRef,
  handle: handleRef,
  modifiers: verticalAxisModifiers,
  transition: {duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)"}
})
</script>

<style scoped>
/* 均为组件根 cssinjs 声明反杀的保留项（A.2 #47）：.ant-flex 根有 margin:0、.ant-slider 根有 resetComponent + 显式 margin */
.right-content {
  margin-left: auto;
}
.slider {
  width: 100px;
  margin: auto
}
</style>
