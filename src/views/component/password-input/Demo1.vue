<template>
  <div>
    <a-typography-title :level="4">基础用法</a-typography-title>
    <a-typography-text>绑定value：{{value}}</a-typography-text><br/>
    <password-input v-model="value" placeholder="请输入密码"/>
  </div>
</template>

<script setup lang="ts">
import PasswordInput from "@/components/password-input/index.vue"
import {ref} from "vue";

const value = ref('')
</script>
