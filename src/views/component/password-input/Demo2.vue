<template>
  <div>
    <a-typography-title :level="4">前缀图标与指定高度</a-typography-title>
    <password-input v-model="value" prefix-icon height="40px" placeholder="带锁图标、40px 高"/>
  </div>
</template>

<script setup lang="ts">
import PasswordInput from "@/components/password-input/index.vue"
import {ref} from "vue";

const value = ref('')
</script>
