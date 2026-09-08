<template>
  <a-row :gutter="8">
    <a-col :xxl="{span: 4}" :xl="{span: 5}" :lg="{span: 6}" :md="{span: 6}" :sm="{span: 6}" :xs="{span: 6}">
      <a-card class="h-full">
        <a-menu
            style="border: 0;width: 100%"
            v-model:selected-keys="selectKeys"
            :inlineCollapsed="themeStore.isSmallWindow"
            @click="handleChangeSetting"
        >
          <a-menu-item-group title="账号">
            <a-menu-item key="DefaultPasswordSetting">
              <template #icon><KeyOutlined /></template>
              <span>系统默认密码</span>
            </a-menu-item>
            <a-menu-item key="IntervalUpdatePasswordSetting">
              <template #icon><FieldTimeOutlined /></template>
              <span>定期修改密码</span>
            </a-menu-item>
            <a-menu-item key="SameAccountLoginSetting">
              <template #icon><LoginOutlined /></template>
              <span>同账号登录限制</span>
            </a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group title="登录">
            <a-menu-item key="SignUpSetting">
              <template #icon><IdcardOutlined /></template>
              <span>自助注册</span>
            </a-menu-item>
            <a-menu-item key="CaptchaSetting">
              <template #icon><RobotOutlined /></template>
              <span>验证码</span>
            </a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group title="其他">
            <a-menu-item key="RestrictAccessIpSetting">
              <template #icon><GatewayOutlined /></template>
              <span>限制访问IP</span>
            </a-menu-item>
            <a-menu-item key="GrayModelSetting">
              <template #icon><BgColorsOutlined /></template>
              <span>灰色模式</span>
            </a-menu-item>
          </a-menu-item-group>
        </a-menu>
      </a-card>
    </a-col>
    <a-col :xxl="{span: 20}" :xl="{span: 19}" :lg="{span: 18}" :md="{span: 18}" :sm="{span: 18}" :xs="{span: 18}">
      <transition :name="themeStore.routeTransition" mode="out-in">
        <component class="h-full scrollbar" :is="activeComponent"/>
      </transition>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme.ts";
import DefaultPasswordSetting from "@/views/system/setting/components/DefaultPasswordSetting.vue";
import GrayModelSetting from "@/views/system/setting/components/GrayModelSetting.vue";
import SignUpSetting from "@/views/system/setting/components/SignUpSetting.vue";
import UpdatePasswordSetting from "@/views/system/setting/components/IntervalUpdatePasswordSetting.vue";
import CaptchaSetting from "@/views/system/setting/components/CaptchaSetting.vue";
import RestrictAccessIpSetting from "@/views/system/setting/components/RestrictAccessIpSetting.vue";
import SameAccountLoginSetting from "@/views/system/setting/components/SameAccountLoginSetting.vue";
import {markRaw, ref, watch} from "vue";
import {useRoute, useRouter} from "vue-router";

const themeStore = useThemeStore()
const route = useRoute()
const router = useRouter()

const settingTabs = ['DefaultPasswordSetting', 'IntervalUpdatePasswordSetting', 'SameAccountLoginSetting', 'SignUpSetting', 'CaptchaSetting', 'RestrictAccessIpSetting', 'GrayModelSetting'] as const
type SettingTabKey = typeof settingTabs[number]
const defaultSettingTab: SettingTabKey = 'DefaultPasswordSetting'

// 注册子组件
const allComponents = ref([
  {
    name: 'DefaultPasswordSetting',
    com: markRaw(DefaultPasswordSetting)
  },
  {
    name: 'GrayModelSetting',
    com: markRaw(GrayModelSetting)
  },
  {
    name: 'SignUpSetting',
    com: markRaw(SignUpSetting)
  },
  {
    name: 'IntervalUpdatePasswordSetting',
    com: markRaw(UpdatePasswordSetting)
  },
  {
    name: 'CaptchaSetting',
    com: markRaw(CaptchaSetting)
  },
  {
    name: 'RestrictAccessIpSetting',
    com: markRaw(RestrictAccessIpSetting)
  },
  {
    name: 'SameAccountLoginSetting',
    com: markRaw(SameAccountLoginSetting)
  }
])
// 菜单回显
const selectKeys = ref(['DefaultPasswordSetting'])
// 选中组件
const activeComponent = ref(markRaw(DefaultPasswordSetting))

const isSettingTabKey = (value: unknown): value is SettingTabKey => {
  return typeof value === 'string' && settingTabs.includes(value as SettingTabKey)
}

const changeSettingMenu = (key: SettingTabKey) => {
  const target = allComponents.value.filter(item => item.name === key)[0]
  if (!target) return
  selectKeys.value = [key]
  activeComponent.value = target.com
}

watch(() => route.query.tab, () => {
  const tab = route.query.tab
  // 进入页面未携带（或非法）tab 参数时，补写默认 tab 到地址栏；replace 不产生历史记录，
  // 补写后 watch 以合法值重触发，不会循环
  if (!isSettingTabKey(tab)) {
    router.replace({query: {...route.query, tab: defaultSettingTab}})
    return
  }
  changeSettingMenu(tab)
}, {immediate: true})

// 点击菜单切换组件，tab 参数入路由（刷新/直达可还原）
const handleChangeSetting = ({key}: {key: string}) => {
  const tab = isSettingTabKey(key) ? key : defaultSettingTab
  changeSettingMenu(tab)
  router.replace({path: '/setting', query: {tab}})
}
</script>
