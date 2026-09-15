<template>
  <expandable-card class="w-full h-full"
             :expanded-width="600"
             :expanded-height="610"
             @beforeCardClose="resetContent"
  >
    <template #overview>
      <div class="p-ant-lg">
        <!-- 版本号跟随标题：更新日志 + 主题色版本号；日期灰色展示 -->
        <a-flex :gap="8" align="center">
          <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">更新日志</a-typography-title>
          <span v-for="version in latestGroup.versions"
                :key="(version.platforms ?? []).join('-') + version.version"
                class="text-ant-sm leading-[20px] px-[8px] rounded-ant-sm"
                :style="{color: themeStore.getColorPrimary(), backgroundColor: `${themeStore.getColorPrimary()}1a`}">
            v{{version.version}}
          </span>
        </a-flex>
        <div style="margin-top: var(--ant-margin-xxs)">
          <a-typography-text type="secondary">{{latestGroup.updateDate}}</a-typography-text>
        </div>
        <!-- 预览行数与左侧「后端相关依赖文档」卡等高对齐（多一行会把整行卡片撑高） -->
        <div v-for="(line, index) in previewLines" :key="index" style="margin-top: var(--ant-margin-xxs)">
          <a-typography-text ellipsis>{{line}}</a-typography-text>
        </div>
        <a-typography-text v-if="latestGroupLines.length > previewLines.length" style="margin-top: var(--ant-margin-xxs)">
          ...
        </a-typography-text>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">更新日志</a-typography-title>
        <div ref="contentRef" class="scrollbar h-[484px] mt-ant-xs">
          <!-- 时间轴：更新日期作为一级标题（内容区右侧），版本号是其下的二级标题，
               同一日期下挂多个仓库的版本号；
               antdv-next 的 Timeline 按内部标记只认 a-timeline-item 直接子节点，包装元素会被过滤为空；
               条目过滤用 slice（v-if 优先级高于 v-for，不能同元素引用 v-for 变量），按钮移出时间轴 -->
          <a-timeline style="margin-top: var(--ant-margin-xs)">
            <a-timeline-item v-for="group in visibleGroups" :key="group.updateDate">
              <a-typography-title :level="5" :styles="{root: {margin: 0, fontSize: '18px'}}">{{group.updateDate}}</a-typography-title>
              <div v-for="version in group.versions"
                   :key="(version.platforms ?? []).join('-') + version.version"
                   style="margin-top: var(--ant-margin-sm)">
                <a-flex :gap="8" align="center">
                  <a-typography-title :level="5" :styles="{root: {margin: 0}}">{{version.version}}</a-typography-title>
                  <a-flex :gap="4" wrap="wrap">
                    <a-tag v-for="platform in version.platforms"
                           :key="platform"
                           :color="platformTagColor(platform)"
                           :bordered="false"
                           style="margin-inline-end: 0; line-height: 18px">
                      {{platform}}
                    </a-tag>
                  </a-flex>
                </a-flex>
                <a-alert v-if="version.title"
                         :title="version.title"
                         style="margin: var(--ant-margin-xxs) var(--ant-margin-xs) var(--ant-margin-xxs) 0"/>
                <a-flex vertical>
                  <a-typography-text v-for="(content, contentIndex) in version.updateContent" :key="contentIndex">
                    {{content}}
                  </a-typography-text>
                </a-flex>
              </div>
            </a-timeline-item>
          </a-timeline>
          <a-flex>
            <a-button type="link"
                      style="margin: auto"
                      :disabled="allVisible"
                      @click="handleShowMore">
              <template #icon v-if="!allVisible">
                <DoubleRightOutlined class="rotate-90" />
              </template>
              {{allVisible ? '已显示全部' : '显示更多' }}
            </a-button>
          </a-flex>
        </div>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {computed, ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";
import {updateLogGroups} from "@/views/index/version-record.ts";

const themeStore = useThemeStore();
const contentRef = ref<HTMLElement | null>(null)

// 平台标识 → a-tag 预设色：同一日期下多个仓库版本号用颜色区分
const PLATFORM_TAG_COLORS: Record<string, string> = {
  'boot': 'green',
  'cloud': 'geekblue',
  'web': 'cyan',
  'app': 'orange',
}
const platformTagColor = (platform: string) => PLATFORM_TAG_COLORS[platform]

const latestGroup = updateLogGroups[0]
// 展开前的预览内容：仅取最新日期节点下的前几条
const PREVIEW_LINE_COUNT = 5
const latestGroupLines = latestGroup.versions.flatMap(version => version.updateContent)
const previewLines = latestGroupLines.slice(0, PREVIEW_LINE_COUNT)

// 详情时间轴初始展示的日期节点数，「显示更多」按节点数递增
const INIT_GROUP_COUNT = 4
const visibleGroupCount = ref<number>(INIT_GROUP_COUNT)
const visibleGroups = computed(() => updateLogGroups.slice(0, visibleGroupCount.value))
const allVisible = computed(() => visibleGroupCount.value >= updateLogGroups.length)
// 显示更多
const handleShowMore = () => {
  visibleGroupCount.value = Math.min(visibleGroupCount.value + 5, updateLogGroups.length)
}
// 重置内容
const resetContent = () => {
  if (contentRef.value) {
    contentRef.value.scrollTop = 0
  }
  visibleGroupCount.value = INIT_GROUP_COUNT
}
</script>
