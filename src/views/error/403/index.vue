<template>
  <a-card :styles="{root: {height: '100vh'}, body: {height: '100%', 'box-sizing': 'border-box'}}">
    <div class="error-container">
      <a-typography-title>403 Forbidden Access</a-typography-title>
      <a-typography-text type="secondary">您没有权限访问此页面</a-typography-text>
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
