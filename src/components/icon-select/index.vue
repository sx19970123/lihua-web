<template>
  <div :style="[geometryVars, {width}]">
    <div class="scrollbar mb-2px">
      <!-- margin 内联保留：.ant-flex 根级显式 margin:0 声明反杀工具类 -->
      <a-flex :gap="8" :style="{width: showSearch ? '412px' : 'auto'}" style="margin: 6px 0 6px 0">
        <!--      图标筛选-->
        <a-segmented v-model:value="segmentedValue" :options="segmentedData"/>
        <a-input placeholder="筛选图标"
                 v-if="showSearch"
                 class="max-w-140px"
                 v-model:value="searchKeyword"
                 allow-clear
        />
        <a-button @click="showSearch = !showSearch">
          <template #icon>
            <ZoomOutOutlined v-if="showSearch"/>
            <SearchOutlined v-else/>
          </template>
        </a-button>
      </a-flex>
    </div>
<!--    图标网格：按容器实测宽度切块成行，虚拟滚动只挂载可视窗口附近的行-->
    <div v-bind="containerProps" class="scrollbar" :style="{maxHeight: maxHeight}">
      <div v-bind="wrapperProps">
        <div v-for="{data: row, index} in list" :key="index" class="flex"
             :style="{height: geometry.cellHeight + 'px', gap: CELL_GAP + 'px', marginBottom: CELL_GAP + 'px'}">
          <div v-for="icon in row" :key="icon"
               class="group p-[var(--icon-padding)] rounded-ant-lg w-[var(--icon-width)] h-[var(--icon-height)] transition-all duration-200 hover:p-[var(--icon-padding-hover)] hover:cursor-pointer hover:text-white hover:bg-[var(--colorPrimary)]"
               :class="icon === modelValue ? 'bg-[var(--colorPrimary)] text-white' : ''"
               @click="clickIcon(icon)">
            <a-flex vertical align="center">
              <component class="text-[length:var(--icon-font-size)] transition-all duration-200 group-hover:text-[length:var(--icon-font-size-hover)]" :is="icon"/>
              <div class="truncate text-center w-[var(--text-width)]" v-if="size !== 'small'">
                <div>
                  <template v-for="(segment, i) in highlightSegments(icon)" :key="i">
                    <span v-if="i === 1 && segment" :style="{ color: icon === modelValue ? '#1f1f1f' : themeStore.getColorPrimary() }">{{ segment }}</span>
                    <span v-else>{{ segment }}</span>
                  </template>
                </div>
              </div>
            </a-flex>
          </div>
        </div>
      </div>
<!--      条件筛选无匹配图标空状态-->
      <!-- margin 内联保留：.ant-empty 根级 marginInline 声明会反杀 m-auto 工具类的 inline 轴 -->
      <a-empty v-if="activeList.length === 0" description="无匹配图标" style="margin: auto"/>
    </div>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, ref, watch} from "vue";
import {useResizeObserver, useVirtualList} from "@vueuse/core";
import {iconGroups} from "@/components/icon/registry";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore();

// 图标格间距（行内与行间一致）；虚拟滚动行高 = 格高 + 该间距
const CELL_GAP = 8;

// 三档尺寸几何表（px）：CSS 变量与虚拟滚动行高同源取数，改档位只动这一处
const SIZE_GEOMETRY = {
  small: {cellWidth: 60, cellHeight: 32, padding: 4, paddingHover: 6, fontSize: 18, fontSizeHover: 20, textWidth: 0},
  default: {cellWidth: 110, cellHeight: 60, padding: 6, paddingHover: 6, fontSize: 20, fontSizeHover: 26, textWidth: 110},
  large: {cellWidth: 180, cellHeight: 80, padding: 10, paddingHover: 10, fontSize: 24, fontSizeHover: 32, textWidth: 180},
} as const;

type IconType = keyof typeof iconGroups;

// 接收的参数：
// modelValue v-model 双向绑定的图标名（图标包导出名）
// size 尺寸档位，驱动图标格与字号的三档几何
// width 组件宽度
// maxHeight 图标区最大高度
const {modelValue, size = 'default', width = '100%', maxHeight = '350px'} = defineProps<{
  // v-model 双向绑定的图标名
  modelValue?: string,
  // 尺寸档位
  size?: 'small' | 'large' | 'default',
  // 组件宽度
  width?: string,
  // 图标区最大高度
  maxHeight?: string
}>()

const emit = defineEmits<{
  // v-model 双向绑定
  'update:modelValue': [value: string | null],
  click: [value: string | null]
}>()

// 点击已选中图标取消选中，否则选中
const clickIcon = (icon: string) => {
  const next = modelValue === icon ? null : icon
  emit('update:modelValue', next)
  emit('click', next)
}

// 显示图标搜索框
const showSearch = ref<boolean>(false)
// 图标搜索关键字
const searchKeyword = ref<string>('')
// 图标类型筛选（名单来自 registry：官方按导出名后缀分组，自定义来自 svg 文件名）
const segmentedData: { label: string, value: IconType }[] = [{
  label: '线框', value: 'outlined'
}, {
  label: '实底', value: 'filled'
}, {
  label: '双色', value: 'twoTone'
}, {
  label: '自定义', value: 'custom'
}];
const segmentedValue = ref<IconType>(segmentedData[0].value);

const geometry = computed(() => SIZE_GEOMETRY[size]);

// 三档几何注入为 CSS 变量，工具类以 var(--icon-*) 消费
const geometryVars = computed(() => {
  const g = geometry.value;
  return {
    '--icon-padding': `${g.padding}px`,
    '--icon-padding-hover': `${g.paddingHover}px`,
    '--icon-width': `${g.cellWidth}px`,
    '--icon-height': `${g.cellHeight}px`,
    '--icon-font-size': `${g.fontSize}px`,
    '--icon-font-size-hover': `${g.fontSizeHover}px`,
    '--text-width': `${g.textWidth}px`,
  };
});

// 当前类型的图标（按关键词过滤），四类切换即切换数据源
const activeList = computed(() => {
  const keyword = searchKeyword.value.toLowerCase();
  return iconGroups[segmentedValue.value].filter(name => name.toLowerCase().includes(keyword));
});

// 容器实测宽度 → 每行图标数；ResizeObserver 首次 observe 即回调，无需额外初测
const gridWidth = ref(0);
const columns = computed(() => {
  const cellPitch = geometry.value.cellWidth + CELL_GAP;
  return Math.max(1, Math.floor((gridWidth.value + CELL_GAP) / cellPitch));
});

// 图标按行切块，虚拟滚动以行为单位
const rows = computed(() => {
  const cols = columns.value;
  const icons = activeList.value;
  const rows: string[][] = [];
  for (let i = 0; i < icons.length; i += cols) {
    rows.push(icons.slice(i, i + cols));
  }
  return rows;
});

const {list, containerProps, wrapperProps, scrollTo} = useVirtualList(rows, {
  // 行高必须与行的实际占位（格高 + 行间距）一致，否则可视窗口计算错位
  itemHeight: () => geometry.value.cellHeight + CELL_GAP,
});

useResizeObserver(containerProps.ref, entries => {
  gridWidth.value = entries[0].contentRect.width;
});

// 切换类型或过滤后列表变化，回到顶部避免停留在失效的滚动位置
watch([segmentedValue, searchKeyword], () => {
  nextTick(() => scrollTo(0));
});

// 图标名按关键词切为三段：命中前 / 命中段（高亮）/ 命中后
const highlightSegments = (name: string): string[] => {
  const keyword = searchKeyword.value;
  const index = name.toLowerCase().indexOf(keyword.toLowerCase());
  if (index < 0) {
    return ['', '', name];
  }
  return [name.substring(0, index), name.substring(index, index + keyword.length), name.substring(index + keyword.length)];
};
</script>
