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
            <a-menu-item key="IntervalUpdatePassword">
              <template #icon><FieldTimeOutlined /></template>
              <span>定期修改密码</span>
            </a-menu-item>
            <a-menu-item key="SameAccountLoginSetting">
              <template #icon><LoginOutlined /></template>
              <span>同账号登录限制</span>
            </a-menu-item>
          </a-menu-item-group>
          <a-menu-item-group title="登录">
            <a-menu-item key="SignInSetting">
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
import {markRaw, ref} from "vue";

const themeStore = useThemeStore()

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
    name: 'SignInSetting',
    com: markRaw(SignUpSetting)
  },
  {
    name: 'IntervalUpdatePassword',
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
// 处理选择设置
const handleChangeSetting = ({key}: {key: string}) => {
  const target = allComponents.value.filter(item => item.name === key)[0]
  activeComponent.value = target.com
}
</script>
