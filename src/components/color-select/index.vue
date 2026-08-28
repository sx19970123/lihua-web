<template>
  <a-flex>
    <template v-for="item in data.dataSource">
      <a-tooltip :title="item.name" :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
        <div class="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-ant-lg mr-ant-xs" :style="{ background: item.color, boxShadow: swatchShadow(item.color) }" @click="selectedColor(item)">
          <div v-if="data.color">
            <CheckOutlined class="c-white font-bold text-ant" :style="item.checkColor ? { color: item.checkColor } : undefined" v-if="item.color === data.color"/>
          </div>
          <div v-else-if="data.value">
            <CheckOutlined class="c-white font-bold text-ant" :style="item.checkColor ? { color: item.checkColor } : undefined" v-if="item.key === data.value"/>
          </div>
        </div>
      </a-tooltip>
    </template>
  </a-flex>
</template>

<script setup lang="ts">
type ColorSelectItem = { name: string, color: string, key?: string, checkColor?: string }
// 接收全部颜色 items 和 双向绑定的颜色值 modelValue
const data = defineProps<{
  dataSource: Array<ColorSelectItem>
  color?: string
  value?: string
}>();
// 使用 update:modelValue 定义 更新 v-model 方法
const emits = defineEmits(['update:color','update:value','click'])

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

// 点击对应颜色返回颜色值，赋值给v-model。执行 @click 方法
const selectedColor = ({color, name, key}: ColorSelectItem) => {
  emits('update:color',color)
  emits('update:value',key)
  emits('click',{color, name, key})
};
</script>
