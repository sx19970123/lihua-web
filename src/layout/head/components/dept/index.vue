<template>
  <a-dropdown v-model:open="open" :trigger="['contextmenu', 'click']">
    <a-tooltip title="默认部门" placement="bottom" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
      <a-button type="text" class="btn max-w-[130px]">
        <a-typography-text ellipsis class="text-default-color" :type="userStore.defaultDeptName ? '' : 'secondary'">{{ userStore.defaultDeptName ? userStore.defaultDeptName : '设置默认部门' }}</a-typography-text>
      </a-button>
    </a-tooltip>
    <template #popupRender>
      <a-card size="small" class="max-h-[500px]" :styles="{root: {'box-shadow': 'var(--ant-box-shadow-tertiary)'}}">
        <default-dept @dept-select="handleDeptSelect"/>
      </a-card>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import {useUserStore} from "@/stores/user.ts";
import DefaultDept from "@/components/default-dept-select/index.vue"
import {ref} from "vue";
import {message} from "@/antd-adapter";
import type {ResponseType} from "@/api/global/type.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";

const userStore = useUserStore();
const open = ref<boolean>(false)

// 切换部门成功关闭tooltip并提示
const handleDeptSelect = (resp: ResponseType<SysDept>) => {
  open.value = false
  message.success(resp.msg)
}
</script>

<style scoped>
/* padding 需压过 .ant-btn 根级 cssinjs 声明，故留 scoped（max-width 已迁工具类） */
.btn {
  padding: 4px 8px 4px 8px
}
</style>

