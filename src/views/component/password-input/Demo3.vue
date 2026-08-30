<template>
  <div>
    <a-typography-title :level="4">关闭强度条与自定义宽度</a-typography-title>
    <password-input v-model="value" :show-progress="false" :progress-width="60" placeholder="关闭强度条"/><br/>
    <password-input v-model="value2" :progress-width="116" placeholder="强度条宽度116"/>
  </div>
</template>

<script setup lang="ts">
import PasswordInput from "@/components/password-input/index.vue"
import {ref} from "vue";

const value = ref('')
const value2 = ref('')
</script>
