<template>
  <a-card>
    <div class="error-container">
      <component is="XiaoMiaoCool" style="font-size: 96px"/>
      <a-typography-title>404 Not Found</a-typography-title>
      <a-typography-text type="secondary">页面不见了</a-typography-text>
    </div>
  </a-card>
</template>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 50px);
  text-align: center;
}
</style>
<script setup lang="ts">
</script>