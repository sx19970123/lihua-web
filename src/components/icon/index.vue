<template>
  <component :is="icon"/>
</template>
<script setup lang="ts">
const {icon} = defineProps<{
  icon: string
}>()
</script>