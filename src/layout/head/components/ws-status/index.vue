<template>
<!--  健康即隐形：仅重连中/已断开时渲染（已连接不占位，头部无空槽；图标出现/消失时相邻图标随 flex 自然回流）-->
  <a-tooltip v-if="wsStatus !== 'connected'" placement="bottom" :title="tooltipText" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
    <a-button type="text" @click="handleReconnect">
      <template #icon>
        <DisconnectOutlined class="icon-default-color" v-if="wsStatus === 'disconnected'"/>
        <SyncOutlined class="icon-default-color" spin v-else/>
      </template>
    </a-button>
  </a-tooltip>
</template>

<script setup lang="ts">
import {computed} from "vue";
import {manualReconnect, wsStatus} from "@/utils/web-socket.ts";

// 形态区分状态（单色风格与头部其他图标一致）：断链=已断开、旋转=重连中、整链=已连接
const tooltipText = computed(() => {
  if (wsStatus.value === 'disconnected') {
    return '实时通信连接已断开，点击重连'
  }
  return wsStatus.value === 'reconnecting' ? '正在建立实时通信连接…' : '实时连接正常'
})

// 仅断开态响应点击（重连期间点击忽略）
const handleReconnect = () => {
  if (wsStatus.value === 'disconnected') {
    manualReconnect()
  }
}
</script>
