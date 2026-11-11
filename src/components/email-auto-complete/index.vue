<template>
  <a-auto-complete v-model:value="email"
                   :options="emailOptions"
                   allow-clear
                   @search="handleSearch"
  >
    <template #optionRender="{ option }">
      {{(option.value as string).split('@')[0]}}@{{(option.value as string).split('@')[1]}}
    </template>
  </a-auto-complete>
</template>

<script setup lang="ts">
import {ref} from "vue";
import {buildEmailOptions} from "@/helpers/email.ts";

/**
 * 邮箱输入自动补全：未出现 @ 时按用户名拼接常用域名给出候选，下拉项「用户名@域名」；
 * 其余属性（placeholder/class 等）透传给 a-auto-complete
 */
const email = defineModel<string>()

const emailOptions = ref<{ value: string }[]>([]);
const handleSearch = (val: string) => {
  emailOptions.value = buildEmailOptions(val);
};
</script>
