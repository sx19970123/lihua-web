<template>
  <div>
    <a-row :gutter="8">
      <a-col :xxl="{span: 4}" :xl="{span: 5}" :lg="{span: 6}" :md="{span: 6}" :sm="{span: 6}" :xs="{span: 6}">
        <a-card class="h-full" :styles="{body: {padding: '22px'}}">
          <a-menu v-model:selectedKeys="selectedKeys" @click="handleChangeUserMenu" style="border: 0;width: 100%" :inlineCollapsed="themeStore.isSmallWindow">
            <a-menu-item key="Basic">
              <template #icon><UserOutlined /></template>
              <span>个人资料</span>
            </a-menu-item>
            <a-menu-item key="Security">
              <template #icon><SafetyCertificateOutlined /></template>
              <span>登录密码</span>
            </a-menu-item>
            <a-menu-item key="LockScreen">
              <template #icon><LockOutlined /></template>
              <span>锁屏设置</span>
            </a-menu-item>
            <a-menu-divider/>
            <a-menu-item key="Individuation">
              <template #icon><SkinOutlined /></template>
              <span>样式布局</span>
            </a-menu-item>
          </a-menu>
        </a-card>
      </a-col>
      <a-col :xxl="{span: 20}" :xl="{span: 19}" :lg="{span: 18}" :md="{span: 18}" :sm="{span: 18}" :xs="{span: 18}">
        <transition :name="themeStore.routeTransition" mode="out-in">
          <component class="h-full scrollbar" :is="activeComponent"/>
        </transition>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import Basic from './components/ProfileBasicSetting.vue'
import Individuation from './components/ProfileIndividuation.vue'
import ProfileSecurity from './components/ProfileSecurity.vue'
import ProfileLockScreen from './components/ProfileLockScreen.vue'
import {markRaw, ref, watch} from "vue";
import {useThemeStore} from "@/stores/theme"
import {useRoute, useRouter} from "vue-router";

const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()
const profileTabs = ['Basic', 'Security', 'LockScreen', 'Individuation'] as const
type ProfileTabKey = typeof profileTabs[number]
const defaultProfileTab: ProfileTabKey = 'Basic'

// 注册子组件
const allComponents = ref([
  {
    name: 'Individuation',
    com: markRaw(Individuation)
  },
  {
    name: 'Basic',
    com: markRaw(Basic)
  },
  {
    name: 'Security',
    com: markRaw(ProfileSecurity)
  },
  {
    name: 'LockScreen',
    com: markRaw(ProfileLockScreen)
  }
])
// 默认选中组件
const activeComponent = ref(markRaw(Basic))
// 设置回显
const selectedKeys = ref(['Basic'])

const isProfileTabKey = (value: unknown): value is ProfileTabKey => {
  return typeof value === 'string' && profileTabs.includes(value as ProfileTabKey)
}

const changeUserMenu = (key: ProfileTabKey) => {
  const target = allComponents.value.filter(item => item.name === key)[0]
  if (!target) return
  selectedKeys.value = [key]
  activeComponent.value = target.com
}

watch(() => route.query.tab, () => {
  const tab = route.query.tab
  // 进入页面未携带（或非法）tab 参数时，补写默认 tab 到地址栏；replace 不产生历史记录，
  // 补写后 watch 以合法值重触发，不会循环
  if (!isProfileTabKey(tab)) {
    router.replace({query: {...route.query, tab: defaultProfileTab}})
    return
  }
  changeUserMenu(tab)
}, {immediate: true})

// 点击菜单切换组件
const handleChangeUserMenu = ({key}: {key: string}) => {
  const tab = isProfileTabKey(key) ? key : defaultProfileTab
  changeUserMenu(tab)
  router.replace({path: '/profile', query: {tab}})
}
</script>
