<template>
  <expandable-card :stretch="false" class="w-full"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="h-[124px] p-ant-lg box-border">
        <a-flex :gap="16"  align="center" style="margin-bottom: 10px">
          <img src="../static/icons8-java-logo-48.png" class="size-12 shrink-0">
          <a-typography-title :level="4" :styles="{root: {margin: 0}}" ellipsis>请作者喝一杯咖啡</a-typography-title>
        </a-flex>
        <a-typography-text type="secondary" ellipsis>如果这个项目对你有帮助，不妨支持一下作者吧~</a-typography-text>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-flex :gap="16"  align="center" style="margin-bottom: 10px">
          <img src="../static/icons8-java-logo-48.png" class="size-12 shrink-0">
          <a-typography-title :level="4" :styles="{root: {margin: 0}}" ellipsis>请作者喝一杯咖啡</a-typography-title>
        </a-flex>
        <a-typography-text type="secondary" ellipsis>如果这个项目对你有帮助，不妨支持一下作者吧~</a-typography-text>
        <a-typography-text type="secondary" ellipsis>非常感谢大家的捐赠与支持，大家的捐赠将用于演示环境服务器的各项支出</a-typography-text>
        <a-flex :gap="16" class="dark-overlay" justify="space-around" wrap="wrap" style="margin-top: var(--ant-margin);">
          <img src="../static/wx.jpg" class="w-[250px] max-w-full mt-[30px] rounded-ant-lg">
          <img src="../static/zfb.jpg" class="w-[250px] max-w-full rounded-ant-lg">
        </a-flex>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
</script>
