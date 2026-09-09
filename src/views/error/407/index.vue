<template>
  <a-card :styles="{root: {height: '100vh'}, body: {height: '100%', 'box-sizing': 'border-box'}}">
    <div class="error-container">
      <a-typography-title>Service to the area is temporarily unavailable</a-typography-title>
      <a-typography-text type="secondary">暂时无法为该地区提供服务</a-typography-text>
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
