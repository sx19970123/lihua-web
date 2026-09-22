<template>
  <a-flex class="relative w-full h-screen overflow-hidden" justify="center" align="center">
    <!--    氛围背景层（z-0 压底）；
          层叠铁律：验证码弹窗（fixed z-1001）需直达 body 级与蒙版（z-1000）比较——
          根节点与内容层只可 relative、不可带 z-index/isolate/transform（会建层叠上下文困住弹窗），内容层靠 DOM 顺序压过背景 -->
    <login-background/>
    <!--      主题切换开关（挂根节点——absolute 以全屏根为基准；内容层是居中窄条不可作定位基准）-->
    <theme-mode-segmented v-if="!showUserSetup" class="absolute top-4 right-6" translucent/>
    <a-flex align="center" :gap="208" v-if="!showUserSetup" class="relative">
<!--        左侧标题-->
      <div class="title">
        <transition name="fade" mode="out-in">
          <div v-show="showTitle">
            <a-typography-title>{{ appInfo.appName }}
              <a-tag class="version-tag" variant="filled" color="blue">v{{ appInfo.version }}</a-tag>
            </a-typography-title>
            <a-typography-title :level="2">
              基于SpringBoot 4.x 和 vue3.x
            </a-typography-title>
          </div>
        </transition>
      </div>
<!--      右侧表单-->
      <div class="w-[378px]">
        <transition name="card" mode="out-in" v-show="showCard">
          <a-card class="login-card max-w-[380px] px-ant-base">
            <!-- v-if 挂载触发组件内逐元素错位入场（卡片/登录注册切换、重回登录时重播） -->
            <component :is="activeComponent" v-if="showCard"
                       @change-component="handleChangeComponent" @start-user-setup="startUserSetup"/>
          </a-card>
        </transition>
      </div>
    </a-flex>
<!--    进入系统前基础信息设置-->
    <transition name="setting" mode="out-in">
      <user-setup-index class="relative" :component-names="componentNameList" v-if="showUserSetup" @go-login="handleGoLogin" />
    </transition>
  </a-flex>
</template>

<script setup lang="ts">
import {markRaw, onMounted, provide, ref} from "vue"
import ThemeModeSegmented from "@/components/theme-mode-segmented/index.vue"
import LoginBackground from "@/views/login/components/LoginBackground.vue"
import UserSetupIndex from "@/components/user-setup/index.vue"
import UserRegister from "@/views/login/components/Register.vue"
import UserLogin from "@/views/login/components/Login.vue"
import appInfo from "@/app-info.ts"
import userSetup from "@/helpers/user-setup.ts"
import {screenUnlock} from "@/helpers/lock-screen.ts"
import {showOverflowY} from "@/utils/scrollbar.ts"
import {useSettingStore} from "@/stores/setting.ts"
// 显示登录卡片
const showCard = ref<boolean>(false)
// 显示左侧title
const showTitle = ref<boolean>(false)

// 注册的用户数据，定义registerUsername后，注册组件通过inject接收值，并在注册成功后赋值为用户名，登录组件可获取后进行处理
provide("registerUsername", ref<string>())

// 初始化组件切换相关逻辑
const initChangeComponent = () => {
  // 当前显示的组件
  const activeComponent = ref()
  // 全部组件
  const allComponents = [
    {
      name: "login",
      com: markRaw(UserLogin)
    },
    {
      name: "register",
      com: markRaw(UserRegister)
    },
  ]
  // 处理切换组件
  const handleChangeComponent = (name: string) => {
    const target = allComponents.filter(component => component.name === name)
    if (target.length === 0) {
      console.error("组件name未注册")
      return
    }

    activeComponent.value = target[0].com
    handleShowCard()
  }

  return {
    activeComponent,
    handleChangeComponent
  }
}
const {activeComponent, handleChangeComponent} = initChangeComponent()

const initUserSetup = () => {
  // 是否展示登录后检查相关组件
  const showUserSetup = ref<boolean>(false)
  // 需要完善信息的组件
  const componentNameList = ref<string[]>([])
  // 开始完善登录后信息
  const startUserSetup = (items: string[]) => {
    if (items && items.length > 0) {
      showTitle.value = false
      showCard.value = false
      showUserSetup.value = true
      componentNameList.value = items
    }
  }
  // 前置检查
  const checkUserSetup = () => {
    const checkItem = userSetup.getData()
    if (checkItem && checkItem.length > 0) {
      setTimeout(() => startUserSetup(checkItem))
    }
  }
  // 从配置页面退回到登录页面
  const handleGoLogin = async () => {
    // 关闭设置页面
    showUserSetup.value = false
    showCard.value = false
    userSetup.clearData()
    componentNameList.value = []
    setTimeout(() => {
      // 登录卡片弹出动画
      handleShowCard()
    }, 200)
  }

  return {
    showUserSetup,
    componentNameList,
    checkUserSetup,
    startUserSetup,
    handleGoLogin
  }
}
const {showUserSetup, componentNameList, checkUserSetup, startUserSetup, handleGoLogin} = initUserSetup()

// 显示卡片
const handleShowCard = () => {
  showCard.value = false
  showTitle.value = true
  setTimeout(() => showCard.value = true, 100)
}

// 系统设置（验证码/自助注册开关等）
const settingStore = useSettingStore()

onMounted(() => {
  // 默认显示login
  handleChangeComponent("login")
  // 进入登录页的用户关闭锁屏
  screenUnlock()
  // 启用y轴滚动条，防止锁屏状态下登录失效后滚动条消失的问题
  showOverflowY()
  // 检查是否存在登录必要配置的项
  checkUserSetup()
  // 重拉登录相关基础设置：登出/锁屏返回登录是 SPA 内跳转，App 不会重挂载（initBaseSetting 的另一触发点），
  // 防止登录会话中管理员切换验证码/自助注册开关后，登录页沿用旧快照导致 507 验证码错误
  settingStore.initBaseSetting()
})
</script>

<style scoped>
/* 视口小于1300 像素时，隐藏title */
@media screen and (max-width: 1200px) {
  .title {
    display: none;
  }
}

/* 版本号随标题行内排布（勿改回 absolute 定位——盒底含行高下半空隙，≠ 文字底边）；
   基线对齐下 tag 自身 line-height 在基线下留有半行距，按基线抬升对齐 CJK 字形视觉底边 */
.version-tag {
  margin-left: 8px;
  vertical-align: 3px;
}

/* 登录卡片（max-width 已迁工具类；border-radius 需压过 .ant-card 默认圆角故留 scoped） */
.login-card {
  border-radius: 24px;
}

/* 视口宽度小于378时，卡片取96视口宽度 居中 */
@media screen and (max-width: 378px) {
  .login-card {
    width: calc(100vw - 32px);
    margin: auto;
  }
}

/* 卡片容器只做轻量入场（小位移+微缩放），主动效由卡内各元素错位上升承担（见 Login/Register 组件） */
.card-enter-active {
  transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

.card-enter-from {
  transform: translateY(36px) scale(96%);
  opacity: 0;
}

/* 公共优化 */
.setting-enter-active,
.setting-leave-active {
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
}

/* 登录后设置卡片呼出 */
.setting-enter-active {
  transition:
      transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
      opacity   0.5s ease-out;
}

.setting-enter-from {
  transform: translate3d(0, 100%, 0);
  opacity: 0;
}

.setting-enter-to {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}

/* 登录后设置卡片隐藏 */
.setting-leave-active {
  transition:
      transform 0.35s cubic-bezier(0.4, 0.0, 0.2, 1),
      opacity   0.25s ease-in;
}

.setting-leave-from {
  transform: translate3d(0, 0, 0);
  opacity: 1;
}

.setting-leave-to {
  transform: translate3d(0, 100%, 0);
  opacity: 0;
}


</style>

