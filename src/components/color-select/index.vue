<template>
  <a-flex>
    <template v-for="item in dataSource">
      <a-tooltip :title="item.name" :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
        <div class="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-ant-lg mr-ant-xs" :style="{ background: item.color, boxShadow: swatchShadow(item.color) }" @click="selectedColor(item)">
          <div v-if="color">
            <CheckOutlined class="c-white font-bold text-ant" :style="checkStyleFor(item)" v-if="item.color === color"/>
          </div>
          <div v-else-if="value">
            <CheckOutlined class="c-white font-bold text-ant" :style="checkStyleFor(item)" v-if="item.key === value"/>
          </div>
        </div>
      </a-tooltip>
    </template>
    <!-- 自定义颜色入口（仅 v-model:color 模式）：未自定义过显示彩虹占位，此后常显上次选中色；
         非彩虹态点击即直接应用该色（面板仍打开供继续微调，但无需操作）。
         tooltip 须内层直接包色块：ColorPicker 为 Trigger 系 fragment 根，tooltip 套其外层无法定位 -->
    <a-color-picker v-if="allowCustom"
                    :value="customColor"
                    format="hex"
                    :allow-clear="false"
                    :disabled-alpha="true"
                    @update:value="(v: ColorValueType) => customColor = v"
                    @open-change="handleCustomPanelOpen"
                    @change-complete="handleCustomChange"
    >
      <a-tooltip title="自定义" :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
        <div class="custom-swatch flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-ant-lg mr-ant-xs"
             :style="{ background: customBackground, boxShadow: swatchShadow(customBackground) }"
             @click="handleCustomSwatchClick"
        >
          <CheckOutlined v-if="isCustomActive" class="c-white font-bold text-ant" :style="contrastCheckStyle(customBackground)"/>
        </div>
      </a-tooltip>
    </a-color-picker>
  </a-flex>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
import type {ColorValueType} from "antdv-next";

type ColorSelectItem = { name: string, color: string, key?: string, checkColor?: string }
// 接收全部颜色 items 和 双向绑定的颜色值 modelValue
const {dataSource, color, value, allowCustom} = defineProps<{
  dataSource: Array<ColorSelectItem>
  color?: string
  value?: string
  // 自定义颜色入口开关（仅 v-model:color 模式生效）：开启后尾部追加取色器项
  allowCustom?: boolean
}>()
// 使用 update:modelValue 定义 更新v-model 方法
const emit = defineEmits<{
  'update:color': [color: string],
  'update:value': [value: string | undefined],
  click: [payload: {color: string, name: string, key?: string}]
}>()

// 仅 rgb()/rgba()/#hex 可解析；var() 等运行时颜色返回 false，走同色光晕
const isNearWhite = (color: string) => {
  const rgb = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]].every(v => v >= 235)
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const expanded = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
    return [0, 2, 4].every(i => parseInt(expanded.slice(i, i + 2), 16) >= 235)
  }
  return false
}

// 色块带同色柔光阴影；接近白的浅色块同色光晕在浅底上不可见，回退中性阴影；
// 渐变色（如头像的"跟随系统"块）无法参与 color-mix 混色，跳过
const swatchShadow = (color: string) => {
  if (color.includes('gradient')) return undefined
  if (isNearWhite(color)) return `0 2px 6px color-mix(in srgb, var(--ant-color-text) 25%, transparent)`
  return `0 2px 6px color-mix(in srgb, ${color} 40%, transparent)`
}

// 解析 rgb()/rgba()/#hex 为 [r,g,b]；渐变/var 等运行时颜色返回 undefined
const parseColor = (color: string): [number, number, number] | undefined => {
  const rgb = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hex) {
    const expanded = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
    return [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16)) as [number, number, number]
  }
  return undefined
}

// 勾形颜色按底色亮度动态取黑/白（WCAG 相对亮度；gamma 校正后合成）。
// 阈值取 0.6（刻意克制）：仅接近白的很浅底色用黑勾，彩色与深色一律白勾——
// 白勾视觉更协调，不按对比度最优（0.179）切换，避免中等亮度的彩色也被判黑。
const contrastCheckStyle = (background: string) => {
  const rgb = parseColor(background)
  if (!rgb) {
    return undefined
  }
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const luminance = 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2])
  return luminance > 0.6 ? { color: 'rgba(0, 0, 0, 0.88)' } : undefined
}

// 预置块勾形：显式 checkColor 优先（如导航亮色块的主题色勾），否则按对比度动态
const checkStyleFor = (item: ColorSelectItem) => {
  if (item.checkColor) {
    return { color: item.checkColor }
  }
  return contrastCheckStyle(item.color)
}

// 点击对应颜色返回颜色值，赋值给v-model。执行 @click 方法
const selectedColor = ({color, name, key}: ColorSelectItem) => {
  emit('update:color',color)
  emit('update:value',key)
  emit('click',{color, name, key})
};

// ---------- 自定义颜色（allowCustom） ----------
// 未自定义过时的占位底色（彩虹渐变表达「任意色」语义，仅出现一次）
const RAINBOW_GRADIENT = 'conic-gradient(from 90deg, #ff4d4f, #faad14, #52c41a, #1677ff, #722ed1, #ff4d4f)'

// 上次确认的自定义色记忆（localStorage，本机维度跨会话保留）：setup 读一次，确认选色时更新
const CUSTOM_COLOR_STORAGE_KEY = 'colorSelectCustomColor'

const readStoredCustomColor = () => {
  const stored = localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY)
  return stored && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(stored) ? stored : undefined
}

const storedCustomColor = ref<string | undefined>(readStoredCustomColor())

// 选中态：当前主题色即上次自定义色时打勾（hex 精确匹配；预置色板为 rgb() 字符串，同色不等价）
const isCustomActive = computed(() => !!color && !!storedCustomColor.value && color === storedCustomColor.value)

// 块底色：自定义过即常显该色（不随主题切回预置色退回彩虹），未自定义过显示彩虹占位
const customBackground = computed(() => storedCustomColor.value ?? RAINBOW_GRADIENT)

// 取色器面板色：打开时从上次自定义色起步，无记录回退当前主题色；确认（changeComplete）才对外应用
const customColor = ref<ColorValueType>()

const handleCustomPanelOpen = (open: boolean) => {
  if (open) {
    customColor.value = storedCustomColor.value ?? color
  }
}

// 非彩虹态点击即应用（ColorPicker 面板仍会随点击打开，可继续微调但无需操作）
const handleCustomSwatchClick = () => {
  if (storedCustomColor.value) {
    emit('update:color', storedCustomColor.value)
    emit('click', {color: storedCustomColor.value, name: '自定义'})
  }
}

const handleCustomChange = (value: { toHexString: () => string }) => {
  const hex = value.toHexString()
  storedCustomColor.value = hex
  localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, hex)
  customColor.value = hex
  emit('update:color', hex)
  emit('click', {color: hex, name: '自定义'})
}
</script>

<style scoped>
/* 自定义入口色块：彩虹渐变底无法靠背景区分边界，加中性描边标识可点击区域 */
.custom-swatch {
  border: 1px solid var(--ant-color-border);
}
</style>
