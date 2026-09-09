<template>
  <expandable-card :stretch="false" class="w-full h-full"
             :expanded-width="600"
             :expanded-height="610"
             @beforeCardClose="resetContent"
  >
    <template #overview>
      <div class="p-ant-lg">
        <a-typography-title :level="4" ellipsis>更新日志</a-typography-title>
        <a-flex vertical>
          <a-typography-text ellipsis type="secondary">
            <a-typography-text ellipsis type="secondary">最新版本为：</a-typography-text>
            <a-typography-text ellipsis :styles="{root: {color: themeStore.getColorPrimary()}}">{{latestVersion.version}}</a-typography-text>
          </a-typography-text>
          <a-typography-title ellipsis :level="5" :styles="{root: {marginTop: 'var(--ant-margin-xs)'}}">
            {{latestVersion.updateDate}}
          </a-typography-title>
          <div v-for="(item,index) in latestVersion.updateContent" :key="index">
            <a-typography-text ellipsis v-if="index < 5">
              {{item}}
            </a-typography-text>
          </div>
          <a-typography-text ellipsis v-if="latestVersion.updateContent.length > 5">
            ...
          </a-typography-text>
        </a-flex>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis>更新日志</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">最新版本为：</a-typography-text>
          <a-typography-text :styles="{root: {color: themeStore.getColorPrimary()}}">{{latestVersion.version}}</a-typography-text>
        </a-typography-text>
        <div ref="contentRef" class="scrollbar h-[484px] mt-ant-xs">
          <!-- antdv-next 的 Timeline 按内部标记只认 a-timeline-item 直接子节点，包装元素会被过滤为空；
               条目过滤用 slice（v-if 优先级高于 v-for，不能同元素引用 v-for 变量），按钮移出时间轴 -->
          <a-timeline style="margin-top: var(--ant-margin-xs)">
            <a-timeline-item v-for="item in versionInfo.lihuaUpdateLog.slice(0, showIndex + 1)" :key="item.version">
              <a-typography-title :level="5">
                {{item.version}}
                <a-typography-text type="secondary">{{item.updateDate}}</a-typography-text>
              </a-typography-title>
              <a-alert v-if="item.title" :title="item.title" style="margin-bottom: var(--ant-margin-xs);margin-right: var(--ant-margin-xs)"/>
              <a-flex v-for="(content, contentIndex) in item.updateContent" :key="contentIndex" vertical>
                <a-typography-text>{{content}}</a-typography-text>
              </a-flex>
            </a-timeline-item>
          </a-timeline>
          <a-flex>
            <a-button type="link"
                      style="margin: auto"
                      :disabled="versionInfo.lihuaUpdateLog.length === showIndex" @click="handleShowMore">
              <template #icon v-if="versionInfo.lihuaUpdateLog.length !== showIndex">
                <DoubleRightOutlined class="rotate-90" />
              </template>
              {{versionInfo.lihuaUpdateLog.length === showIndex ? '已显示全部' : '显示更多' }}
            </a-button>
          </a-flex>
        </div>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {ref} from "vue";
import {useThemeStore} from "@/stores/theme.ts";
import {versionInfo} from "@/views/index/setting.ts";

const latestVersion = versionInfo.lihuaUpdateLog[0]
const themeStore = useThemeStore();
const showIndex = ref<number>(4)
const contentRef = ref<HTMLElement | null>(null)
// 显示更多
const handleShowMore = () => {
  if (versionInfo.lihuaUpdateLog.length - showIndex.value >= 5) {
    showIndex.value = showIndex.value + 5
  } else {
    showIndex.value = versionInfo.lihuaUpdateLog.length
  }
}
// 重置内容
const resetContent = () => {
  if (contentRef.value) {
    contentRef.value.scrollTop = 0
    showIndex.value = 4
  }
}
</script>
