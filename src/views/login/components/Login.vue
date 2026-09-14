<template>
  <div>
    <div class="mt-ant-lg mb-[56px] stagger-item" style="--si: 0">
      <a-typography-title :level="2">欢迎登录{{ appInfo.appSubname }}</a-typography-title>
      <a-typography-text v-if="!settingStore.isServerConnected" type="danger">无法连接服务器</a-typography-text>
      <!--                    根据配置显示注册-->
      <div v-if="settingStore.enableSignUp">
        <a-typography-text>没有账号？</a-typography-text>
        <a-typography-link @click="handleChangeComponent('register')">快速注册
          <RightOutlined/>
        </a-typography-link>
      </div>
    </div>
    <a-form :model="loginForm" @finish="handleFinish" :rules="loginRoles">
      <a-form-item name="username" hasFeedback>
        <a-tooltip placement="topLeft" trigger="contextmenu" title="用户名已自动填写" v-model:open="usernameTip">
          <a-input class="login-form-item stagger-item" style="--si: 1"
                   autocomplete="off"
                   v-model:value="loginForm.username"
                   placeholder="用户名"
          >
            <template #prefix>
              <UserOutlined class="input-prefix-icon-color"/>
            </template>
          </a-input>
        </a-tooltip>
      </a-form-item>
      <a-form-item name="password" hasFeedback>
        <a-input-password class="login-form-item stagger-item" style="--si: 2"
                          v-model:value="loginForm.password"
                          placeholder="密码"
        >
          <template #prefix>
            <LockOutlined class="input-prefix-icon-color"/>
            </template>
        </a-input-password>
      </a-form-item>
      <a-form-item>
        <a-flex justify="space-between" class="stagger-item" style="--si: 3">
        <a-checkbox v-model:checked="rememberMe">记住账号</a-checkbox>
      </a-flex>
      </a-form-item>
      <a-form-item>
        <a-button html-type="submit"
                  type="primary"
                  class="login-form-item w-full stagger-item" style="--si: 4"
                  :loading="loginLoading">登录
        </a-button>
      </a-form-item>
    </a-form>
    <!--    验证码-->
    <tianai-captcha ref="tianaiCaptchaRef" @success="userLogin"/>
  </div>
</template>

<script setup lang="ts">
import TianaiCaptcha from "@/components/tianai-captcha/index.vue"
import appInfo from "@/app-info.ts"
import {inject, onMounted, reactive, type Ref, ref, useTemplateRef} from "vue"
import token from "@/helpers/token.ts"
import remember from "@/helpers/remember.ts"
import userSetup from "@/helpers/user-setup.ts"
import {initApp} from "@/app-init.ts"
import {connect} from "@/utils/web-socket.ts"
import {login} from "@/api/system/authentication/authentication.ts"
import {type Rule, message} from "@/antd-adapter"
import {useRouter} from 'vue-router'
import {useSettingStore} from "@/stores/setting.ts"
import {queryPostLoginCheckData} from "@/api/system/profile/profile.ts"

// 系统设置
const settingStore = useSettingStore();

const emit = defineEmits(["changeComponent","startUserSetup"])

const router = useRouter()
const loginLoading = ref<boolean>(false)
const rememberMe = ref<boolean>(remember.enableRememberMe())
const verifyRef = useTemplateRef<InstanceType<typeof TianaiCaptcha>>("tianaiCaptchaRef")
const registerUsername = inject<Ref<string|undefined>>("registerUsername")
const usernameTip = ref<boolean>(false)
// 用户登录
interface LoginFormType {
  username: string,
  password: string
}

const loginForm = reactive<LoginFormType>({
  username: '',
  password: ''
})

// 启用记住账号后赋值账号密码
const initRememberMe = () => {
  if (rememberMe.value) {
    const usernamePassword = remember.getUsernamePassword()
    loginForm.username = usernamePassword.username
    loginForm.password = usernamePassword.password
  }
}

// 触发登录
const handleFinish = () => {
  if (settingStore.enableCaptcha) {
    showVerify()
  } else {
    userLogin('loginCaptcha')
  }
}

// 检查是否为注册完成跳回的页面
const checkRegister = () => {
  // 注册完成跳回的页面中registerUsername存有用户名，向表单赋值后关闭记住我功能
  if (registerUsername && registerUsername.value) {
    loginForm.username = registerUsername.value
    loginForm.password = ""
    rememberMe.value = false
    remember.forgetMe()

    // 开启关闭自动带入用户名提示
    setTimeout(() => usernameTip.value = true, 900)
    setTimeout(() => usernameTip.value = false, 4000)
  }
}

// 清除注册用户名
const clearRegisterUsername = () => {
  if (registerUsername && registerUsername.value) {
    registerUsername.value = undefined
  }
}

// 登录请求
const userLogin = async (captchaVerification: string) => {
  loginLoading.value = true
  try {
    // 登录
    const resp = await login(loginForm.username, loginForm.password, captchaVerification);
    if (resp.code !== 200) {
      // 401（密码错误）已由拦截器统一提示并登出，此处覆盖其余业务码（如 507 验证码二次校验失败）
      message.error(resp.msg)
      return
    }
    // 设置token
    token.setToken(resp.data);
    // 记住我设置
    if (rememberMe.value) {
      remember.rememberMe(loginForm.username, loginForm.password)
    } else {
      remember.forgetMe()
    }

    // 清除注册用户名
    clearRegisterUsername()

    // 登录后用户数据校验
    const loginCheckResp = await queryPostLoginCheckData()
    if (loginCheckResp.code === 200) {
      const checkItem = loginCheckResp.data
      if (checkItem.length === 0) {
        userSetup.clearData()
        message.success("登录成功")
        await router.push("/index");
      } else {
        await initApp()
        // 登录即建立 websocket 连接（守卫只在用户信息为空的冷启动路径连接）
        connect()
        userSetup.setData(checkItem)
        emit("startUserSetup", checkItem)
      }
    }
  } catch (e) {
    token.removeToken()
    console.error(e)
  } finally {
    loginLoading.value = false
  }
}

// 登录表单校验
const loginRoles: Record<string, Rule[]> = {
  username: [{required: true, message: '请输入账号', trigger: 'change'}],
  password: [{required: true, message: '请输入密码', trigger: 'change'}]
}

// 显示验证码
const showVerify = () => {
  verifyRef.value?.show()
}

// 处理切换组件
const handleChangeComponent = (name: string) => {
  emit('changeComponent', name)
}

onMounted(() => {
  // 检查是否刚注册完成
  checkRegister()
  // 加载记住我
  initRememberMe()
})
</script>

<style scoped>
/* .ant-btn 根级 cssinjs 声明 height，工具类必被反杀，故保留 scoped */
.login-form-item {
  height: 48px
}

/* 卡内元素错位上升入场：挂载即触发（index.vue 用 v-if 控制挂载，卡片重现/登录注册切换时重播） */
.stagger-item {
  animation: login-item-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--si) * 90ms);
}

@keyframes login-item-rise {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
}
</style>