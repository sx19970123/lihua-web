<template>
  <a-dropdown :trigger="['contextmenu', 'click']" :classes="{root: 'enable-glass'}">
    <a-tooltip title="个人中心" placement="bottom" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
      <a-button type="link" class="btn">
        <user-avatar class="avatar" :avatar-json="userStore.avatarJson"/>
      </a-button>
    </a-tooltip>
    <template #popupRender>
      <a-menu class="user-card" :styles="{root: {width: '220px', boxShadow: 'var(--ant-box-shadow-tertiary)'}}" @click="handleClickMenu">
        <a-menu-item key="user-overview">
          <a-flex align="center" :gap="12">
            <user-avatar :size="48" :avatar-json="userStore.avatarJson"/>
            <a-flex vertical>
              <a-typography-text ellipsis :copyable="{ tooltip: false }" strong :styles="{root: {'max-width': '120px'}}">{{ userStore.$state.nickname }}</a-typography-text>
              <a-tooltip :title="'UID：' + userStore.$state.userId" placement="bottom" :getPopupContainer="(triggerNode:Document) => triggerNode.parentNode">
                <a-typography-text ellipsis :copyable="{ tooltip: false }" :styles="{root: {'max-width': '120px'}}">{{ userStore.$state.userId }}</a-typography-text>
              </a-tooltip>
            </a-flex>
            <RightOutlined class="input-prefix-icon-color absolute right-2"/>
          </a-flex>
        </a-menu-item>
        <a-menu-divider/>
        <a-menu-item key="user-center">
          <a-flex :gap="8">
            <UserOutlined />
            <span>个人中心</span>
          </a-flex>
        </a-menu-item>
        <a-menu-divider/>
        <a-menu-item key="user-data-update">
          <a-flex :gap="8">
            <CloudSyncOutlined />
            <span>数据更新</span>
          </a-flex>
        </a-menu-item>
        <a-menu-divider v-if="isAdmin || isVisitor"/>
        <a-menu-item key="admin-setting" v-if="isAdmin || isVisitor">
          <a-flex :gap="8">
            <SettingOutlined />
            <span>系统设置</span>
          </a-flex>
        </a-menu-item>
        <a-menu-divider/>
        <a-menu-item danger key="logout">
          <a-flex :gap="8">
            <LogoutOutlined />
            <span>退出登录</span>
          </a-flex>
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<script setup lang="ts">
import UserAvatar from "@/components/user-avatar/index.vue"
import {useUserStore} from "@/stores/user";
import {useRoute, useRouter} from "vue-router";
import {message} from "@/antd-adapter";
import {refreshApp} from "@/app-init.ts";
import {ref} from "vue";

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

const isAdmin = ref<boolean>(userStore.$state.roleCodes.filter(item => item === 'ROLE_admin').length > 0)
const isVisitor = ref<boolean>(userStore.$state.roleCodes.filter(item => item === 'ROLE_visitor').length > 0)
// 处理点击个人中心按钮
const handleClickMenu = async ({key}: {key: string}) => {
  switch (key) {
    case 'user-overview': {
      userInfo()
      break
    }
    case 'user-center': {
      userInfo()
      break
    }
    case 'admin-setting': {
      settingPage()
      break
    }
    case 'user-data-update': {
      await refreshApp(route)
      message.success("刷新完成")
      break
    }
    case 'logout': {
      await logout()
      break
    }
  }
}

// 跳转至个人中心
const userInfo = () => {
  router.push('/profile')
}

// 跳转至设置页面
const settingPage = () => {
  router.push('/setting')
}

// 退出登录
const logout = async () => {
  await userStore.handleLogout()
  message.success("退出成功")
  await router.push('/authentication')
}
</script>

<style scoped>
.btn {
  padding: 0 0 0 8px
}
.avatar {
  transition: transform .2s;
}
.avatar:hover {
  transform: scale(1.15);
}
</style>
