<template>
  <a-card :styles="{root: {height: '100vh'}, body: {height: '100%', 'box-sizing': 'border-box'}}">
    <div class="error-container">
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
  height: 100%;
  text-align: center;
}
</style>
<script setup lang="ts">
</script>