<template>
  <a-flex>
    <template v-for="item in dataSource">
      <a-tooltip :title="item.name" :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
        <div class="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-ant-lg mr-ant-xs" :style="{ background: item.displayColor ?? item.color, boxShadow: swatchShadow(item.displayColor ?? item.color) }" @click="selectedColor(item)">
          <div v-if="color">
            <CheckOutlined class="c-white font-bold text-ant" :style="checkStyleFor(item)" v-if="item.color === color"/>
          </div>
          <div v-else-if="value">
            <CheckOutlined class="c-white font-bold text-ant" :style="checkStyleFor(item)" v-if="item.key === value"/>
          </div>
        </div>
      </a-tooltip>
    </template>
    <!-- 自定义颜色入口（仅 v-model:color 模式）三态：未自定义=透明底+A 标记（任意色入口，不用彩色
         占位——与预置渐变块如头像「跟随系统」视觉打架）；自定义过但当前选的是预置色=常显记忆色（可点击快捷重选）；
         当前即自定义色=显示该色并打勾。点击行为：仅面板打开起步于当前色，应用记忆色只发生在非自定义选中态。
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
          <span v-else-if="!storedCustomColor" class="custom-swatch-auto-a">A</span>
        </div>
      </a-tooltip>
    </a-color-picker>
  </a-flex>
</template>

<script setup lang="ts">
import {computed, ref} from "vue";
import type {ColorValueType} from "antdv-next";

// displayColor：色块展示值（v-model 值仍走 color）——用于「值与展示分离」的选项，如头像「跟随系统」存 'auto'、展示渐变
type ColorSelectItem = { name: string, color: string, key?: string, checkColor?: string, displayColor?: string }
// 接收全部颜色 items 和 双向绑定的颜色值 modelValue
const {dataSource, color, value, allowCustom, customColorStorageKey} = defineProps<{
  dataSource: Array<ColorSelectItem>
  color?: string
  value?: string
  // 自定义颜色入口开关（仅 v-model:color 模式生效）：开启后尾部追加取色器项
  allowCustom?: boolean
  // 自定义色记忆的 localStorage 键（开启 allowCustom 时必传——共享键会跨场景相互覆盖，如头像与主题）
  customColorStorageKey?: string
}>()

// 加载检查：开启自定义颜色却未指定记忆键——多场景共用单键会相互覆盖，必须显式传入
if (allowCustom && !customColorStorageKey) {
  console.error("[color-select] 开启 allowCustom 时必须指定 customColorStorageKey（自定义色记忆的 localStorage 键），多场景共享键会相互覆盖")
}

// 运行时兜底键（仅漏传检查失效时兜住读写，勿作为不传键的理由）
const storageKey = () => customColorStorageKey ?? 'colorSelectCustomColor'
// 使用 update:modelValue 定义 更新v-model 方法
const emit = defineEmits<{
  'update:color': [color: string],
  'update:value': [value: string | undefined],
  click: [payload: {color: string, name: string, key?: string}]
}>()

// 合法 3/6 位 hex（自定义色的持久化与面板起步判定共用）
const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

// 解析 rgb()/rgba()/#hex 为 [r,g,b]；渐变/var 等运行时颜色返回 undefined
const parseColor = (color: string): [number, number, number] | undefined => {
  const rgb = color.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  const hex = color.match(HEX_COLOR_PATTERN)
  if (hex) {
    const expanded = hex[1].length === 3 ? hex[1].split('').map(c => c + c).join('') : hex[1]
    return [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16)) as [number, number, number]
  }
  return undefined
}

// 仅 rgb()/rgba()/#hex 可解析；var()/渐变等运行时颜色返回 false，走同色光晕
const isNearWhite = (color: string) => {
  const rgb = parseColor(color)
  return !!rgb && rgb.every(v => v >= 235)
}

// 色块带同色柔光阴影；接近白的浅色块同色光晕在浅底上不可见，回退中性阴影；
// 渐变色（如头像的"跟随系统"块）与透明占位无法参与 color-mix 混色，跳过
const swatchShadow = (color: string) => {
  if (color.includes('gradient') || color === 'transparent') return undefined
  if (isNearWhite(color)) return `0 2px 6px color-mix(in srgb, var(--ant-color-text) 25%, transparent)`
  return `0 2px 6px color-mix(in srgb, ${color} 40%, transparent)`
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
const selectedColor = ({color: itemColor, name, key}: ColorSelectItem) => {
  emit('update:color',itemColor)
  emit('update:value',key)
  emit('click',{color: itemColor, name, key})
};

// ---------- 自定义颜色（allowCustom） ----------
// 上次确认的自定义色记忆（localStorage，本机维度跨会话保留；键由 customColorStorageKey 按场景隔离）
const readStoredCustomColor = () => {
  const stored = localStorage.getItem(storageKey())
  return stored && HEX_COLOR_PATTERN.test(stored) ? stored : undefined
}

const storedCustomColor = ref<string | undefined>(readStoredCustomColor())

// 选中态（仅 allowCustom 场景有意义）：当前颜色不在预置候选中即为自定义选中
// （含跨设备/清记忆场景——同色换机器也正确回显勾），不依赖本机记忆色比对；
// 按字符串等值判定——候选项 color 需与 v-model 值同形（同色不同写法会被判为自定义）
const isCustomActive = computed(() => !!allowCustom && !!color && !dataSource.some(item => item.color === color))

// 块底色：当前选中即自定义色时直接显示该色（与勾同源，跨设备/无记忆也正确显色）；
// 否则自定义过常显记忆色，都没有则透明（A 标记见模板——不用彩色占位，避免与预置渐变块打架）
const customBackground = computed<string>(() => {
  if (isCustomActive.value && color) {
    return color
  }
  return storedCustomColor.value ?? 'transparent'
})

// 取色器面板色（打开时按下方优先级赋起步值；确认 changeComplete 才对外应用）
const customColor = ref<ColorValueType>()

// 取色器面板起步色：优先当前 v-model 色——多账号同机时各自的当前色才是修改起点（记忆是上一用户的会错意）；
// v-model 非合法 hex（预置 rgb()/'auto' 等非自定义形态）时回退本机记忆色，再无则交面板默认
const handleCustomPanelOpen = (open: boolean) => {
  if (open) {
    const currentHex = HEX_COLOR_PATTERN.test(color ?? '') ? color as string : undefined
    customColor.value = currentHex ?? storedCustomColor.value
  }
}

// 有记忆且当前非自定义选中态：点击快捷应用记忆色（快速重选上次的色，面板仍打开可继续微调）；
// 当前已是自定义色（带值来修改）：仅打开面板起步于当前色，不应用记忆（多账号同机时记忆是他人的）
const handleCustomSwatchClick = () => {
  if (storedCustomColor.value && !isCustomActive.value) {
    emit('update:color', storedCustomColor.value)
    emit('click', {color: storedCustomColor.value, name: '自定义'})
  }
}

const handleCustomChange = (value: { toHexString: () => string }) => {
  const hex = value.toHexString()
  storedCustomColor.value = hex
  localStorage.setItem(storageKey(), hex)
  customColor.value = hex
  emit('update:color', hex)
  emit('click', {color: hex, name: '自定义'})
}
</script>

<style scoped>
/* 自定义入口色块：透明态靠背景区分不了边界，加中性描边标识可点击区域 */
.custom-swatch {
  border: 1px solid var(--ant-color-border);
}

/* 未自定义态的 A 标记（任意色入口）：弱化文字色，与勾形区分 */
.custom-swatch-auto-a {
  font-size: 12px;
  line-height: 1;
  color: var(--ant-color-text-tertiary);
}
</style>
