<template>
  <div class="menu-fold anticon">
    <menu-unfold-outlined
        v-if="permissionStore.collapsed"
        class="menu-fold-icon"
        @click="handleOpenCollapsed"
    />
    <menu-fold-outlined class="menu-fold-icon" v-else @click="handleCloseCollapsed" />
  </div>
</template>
<script setup lang="ts">
import {MenuFoldOutlined, MenuUnfoldOutlined} from "@antdv-next/icons";
import {usePermissionStore} from "@/stores/permission";

const permissionStore = usePermissionStore()
const emits = defineEmits(["collapsedChange"])
// 处理打开菜单
const handleOpenCollapsed = () => {
  permissionStore.collapsed = false
  emits("collapsedChange", permissionStore.collapsed)
}
// 处理折叠菜单
const handleCloseCollapsed = () => {
  permissionStore.collapsed = true
  emits("collapsedChange", permissionStore.collapsed)
}

</script>
<style scoped>
.menu-fold-icon {
  font-size: var(--ant-font-size-xl)
}
</style>
