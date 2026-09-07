<template>
  <div>
    <div class="mt-ant-lg mb-[56px] stagger-item" style="--si: 0">
      <a-typography-title :level="2">欢迎注册狸花猫</a-typography-title>
      <a-typography-text>已有账号？</a-typography-text>
      <a-typography-link @click="handleChangeComponent('login')">前往登录
        <RightOutlined/>
      </a-typography-link>
    </div>
    <a-form :model="userRegister"
            :rules="rules"
            @finish="handleFinish"
    >
      <a-form-item name="username" hasFeedback>
        <a-input class="register-form-item stagger-item" style="--si: 1"
                 autocomplete="off"
                 placeholder="用户名"
                 v-model:value="userRegister.username"
        >
          <template #prefix>
            <UserOutlined class="input-prefix-icon-color"/>
          </template>
        </a-input>
      </a-form-item>
      <a-form-item name="password" hasFeedback>
        <password-input class="register-form-item stagger-item" style="--si: 2"
                        v-model="userRegister.password"
                        :progress-width="98"
                        placeholder="密码"
                        height="48px"
                        prefix-icon
                        :show-progress="!!userRegister.password && userRegister.password.length >= 6"
        />
      </a-form-item>

      <a-form-item name="confirmPassword" hasFeedback>
        <a-input-password class="register-form-item stagger-item" style="--si: 3"
                          placeholder="再次输入密码"
                          v-model:value="userRegister.confirmPassword"
        >
          <template #prefix>
            <LockOutlined class="input-prefix-icon-color"/>
          </template>
        </a-input-password>
      </a-form-item>
      <a-form-item>
        <a-button html-type="submit"
                  type="primary"
                  class="register-form-item w-full stagger-item" style="--si: 4"
                  :loading="registerLoading">注册
        </a-button>
      </a-form-item>
    </a-form>
    <!--    验证码-->
    <tianai-captcha ref="tianaiCaptchaRef" @success="handleRegister"/>
  </div>
</template>

<script setup lang="ts">
import {inject, type Ref, ref, useTemplateRef} from "vue";
import PasswordInput from "@/components/password-input/index.vue"
import {type Rule, message} from "@/antd-adapter";
import {register} from "@/api/system/authentication/authentication.ts";
import TianaiCaptcha from "@/components/tianai-captcha/index.vue";
import {useSettingStore} from "@/stores/setting.ts";
import {checkUserName} from "@/api/system/user/user.ts";
// 系统设置
const settingStore = useSettingStore();
const registerLoading = ref<boolean>(false)

// 向父组件抛出切登录方法
const emits = defineEmits(['changeComponent'])

// 处理切换组件
const handleChangeComponent = (name: string) => {
  emits('changeComponent', name)
}
// 通过inject接收provide数据，注册成功后可对registerUsername进行修改，告诉login组件用户注册完成并传递用户名
const registerUsername = inject<Ref<string>>("registerUsername")

// 用户注册实体
const userRegister = ref<{
  username: string,
  password: string,
  confirmPassword: string

}>({
  username: '',
  password: '',
  confirmPassword: ''
})

// 对比两次密码输入是否相同
const equalToPassword = async (rule: any, value: string) => {
  if (userRegister.value.password !== value) {
    return Promise.reject('两次输入的密码不一致')
  } else {
    return Promise.resolve();
  }
}

// 失焦时触发检查用户名是否可用
const handleCheckUsername = async (_rule: Rule, value: string) => {
  if (value) {
    try {
      const resp = await checkUserName(value)
      if (resp.code === 200) {
        if (!resp.data) {
          return Promise.reject('该用户名已存在')
        } else {
          return Promise.resolve();
        }
      } else {
        return Promise.reject(resp.msg)
      }
    } catch (e) {
      return Promise.reject("业务异常")
    }
  }
}

// 表单验证
const rules: Record<string, Rule[]> = {
  username: [
    { required: true,message: "请输入用户名",trigger: ['change','blur']},
    {pattern: /^[a-zA-Z0-9@.]+$/, message: "用户名只允许大小写英文、数字、@、.", trigger: ['change','blur']},
    { validator: handleCheckUsername, trigger:'blur'}
  ],
  password: [
    { required: true,message: "请输入密码",trigger: ['change','blur']},
    { min: 6, max: 30, message: '密码长度6-30位', trigger: ['change','blur']}
  ],
  confirmPassword: [
    { required: true,message: "请再次输入密码",trigger: ['change','blur']},
    { validator: equalToPassword, trigger: ['change','blur'] }
  ]
}

// 触发注册
const handleFinish = () => {
  if (settingStore.enableCaptcha) {
    showVerify()
  } else {
    handleRegister("registerCaptcha")
  }
}

// 验证码组件引用
const verifyRef = useTemplateRef<InstanceType<typeof TianaiCaptcha>>("tianaiCaptchaRef")

// 表单验证通过后提交注册
const showVerify = () => {
  verifyRef.value?.show()
}

// 用户注册
const handleRegister = async (captchaVerification: string) => {
  registerLoading.value = true
  const {username, password, confirmPassword} = userRegister.value
  try {
    // 用户注册
    const resp = await register(username, password, confirmPassword, captchaVerification)
    if (resp.code === 200) {
      message.success("注册成功，即将前往登录")
      if (registerUsername) {
        registerUsername.value = username
      }

      handleChangeComponent('login')
    } else {
      message.error(resp.msg)
    }
  } finally {
    registerLoading.value = false
  }
}
</script>

<style scoped>
/* .ant-btn 根级 cssinjs 声明 height，工具类必被反杀，故保留 scoped */
.register-form-item {
  height: 48px;
}

/* 卡内元素错位上升入场：挂载即触发（index.vue 用 v-if 控制挂载，卡片重现/登录注册切换时重播） */
.stagger-item {
  animation: register-item-rise 0.65s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--si) * 90ms);
}

@keyframes register-item-rise {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
}
</style>
