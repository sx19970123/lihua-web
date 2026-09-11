<template>
  <user-setup-base-component title="安全"
                            description="为了确保您的账号安全，请修改密码"
                            icon="LockOutlined"
                            skip-msg="可在个人中心 - 安全设置进行设置"
                            :skip="false"
                            @next="handleNext"
                            @skip="handleSkip"
                            @back="emit('back')"
  >
    <template #content>
      <a-form :colon="false" ref="resetPasswordRef" :model="password" :rules="rules">
        <a-form-item name="oldPassword">
          <a-input-password class="form-item-width"
              placeholder="请输入旧密码"
              v-model:value="password.oldPassword"
          />
        </a-form-item>
        <a-form-item name="newPassword">
          <password-input class="form-item-width"
                          v-model="password.newPassword"
                          placeholder="请输入新密码" :progress-width="88"
                          :show-progress="!!password.newPassword && password.newPassword.length >= 6 && password.newPassword.length <= 30"
          />
        </a-form-item>
        <a-form-item name="confirmPassword" >
          <a-input-password class="form-item-width"
                            placeholder="请再次输入新密码"
                            v-model:value="password.confirmPassword"
          />
        </a-form-item>
      </a-form>
    </template>
  </user-setup-base-component>
</template>

<script setup lang="ts">
import UserSetupBaseComponent from "@/components/user-setup/UserSetupBaseComponent.vue";
import {reactive, type Ref, useTemplateRef} from "vue";
import {type FormInstance, type Rule, message} from "@/antd-adapter";
import PasswordInput from "@/components/password-input/index.vue";
import {updatePassword} from "@/api/system/profile/profile.ts";

const resetPasswordRef = useTemplateRef<FormInstance>("resetPasswordRef")
// 向外抛出函数
const emit = defineEmits<{
  back: [],
  skip: [loading: boolean],
  next: [loading: boolean]
}>()

type passwordType = {
  oldPassword: string,
  newPassword: string,
  confirmPassword: string
}
const password = reactive<passwordType>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

/**
 * 判断第二次密码输入是否正确
 * @param rule
 * @param value
 */
const equalToPassword = async (rule: any, value: string) => {
  if (password.newPassword !== value) {
    return Promise.reject('两次输入的密码不一致')
  } else {
    return Promise.resolve();
  }
}

/**
 * 密码校验
 */
const rules: Record<string, Rule[]> = {
  oldPassword: [
    { required: true,message: "请输入旧密码",trigger: 'change'},
  ],
  newPassword: [
    { required: true,message: "请输入新密码",trigger: 'change'},
    { min: 6, max: 30, message: '密码长度6-30位', trigger: 'change' },
  ],
  confirmPassword: [
    { required: true,message: "请再次输入密码",trigger: 'change'},
    { required: true, validator: equalToPassword, trigger: "change" }
  ]
}

// 修改密码后进入下一步
const handleNext = async (loading:Ref<boolean>) => {
  await resetPasswordRef.value?.validate()
  loading.value = true
  try {
    const resp = await updatePassword(password.oldPassword,password.newPassword,password.confirmPassword)
    loading.value = false
    if (resp.code === 200) {
      emit('next', loading.value)
    } else {
      message.error(resp.msg)
    }
  } finally {
    loading.value = false
  }
}
// 跳过
const handleSkip = (loading:Ref<boolean>) => {
  loading.value = false
  emit('skip', loading.value)
}
</script>

<style scoped>
.form-item-width {
  width: 270px;
}
</style>
