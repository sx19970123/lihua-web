<template>
  <a-card>
    <a-form layout="vertical" :model="settingForm" @finish="handleFinish" :rules="rules">
      <a-form-item label="同账号登录限制">
        <template #tooltip>
          同一账号最多允许 X 人同时登录，超出后先登录的用户将被强制下线
        </template>
        <a-switch v-model:checked="settingForm.enable" @change="handleChangeSwitch"></a-switch>
      </a-form-item>
      <transition :name="themeStore.routeTransition" mode="out-in">
        <div v-if="settingForm.enable">
          <a-form-item label="最大同时在线数" name="maximum">
            <a-input-number :precision="0"
                            :min="1"
                            placeholder="请输入"
                            v-model:value="settingForm.maximum"
            />
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit" :loading="submitLoading">提 交</a-button>
          </a-form-item>
        </div>
      </transition>
    </a-form>
  </a-card>
</template>

<script setup lang="ts">
import {useSettingStore} from "@/stores/setting.ts";
import {getCurrentInstance, nextTick, onMounted, ref} from "vue";
import type {SameAccountLoginSetting} from "@/api/system/setting/type/same-account-login-setting.ts";
import type {SysSetting} from "@/api/system/setting/type/sys-setting.ts";
import {useThemeStore} from "@/stores/theme.ts";
import {message, type Rule} from "@/antd-adapter";
import {isAdmin} from "@/helpers/auth.ts";
import {cloneDeep} from "lodash-es";
import {save} from "@/api/system/setting/setting.ts";

const themeStore = useThemeStore()
const settingStore = useSettingStore();
const componentName = getCurrentInstance()?.type.__name
const submitLoading = ref<boolean>(false);

// 同账号登录限制配置表单
const settingForm = ref<SameAccountLoginSetting>({
  enable: false,
  maximum: 1
})

// 加载完成后的配置快照（深拷贝），无权限操作时本地复位用，免二次请求
let initialSetting: SameAccountLoginSetting | undefined

// 保存到数据库中的对象
const setting = ref<SysSetting>({
  settingKey: componentName,
  json: JSON.stringify(settingForm.value)
})

const init = async () => {
  const settingData = await settingStore.getSettingInfo<SameAccountLoginSetting>(componentName);
  if (settingData) {
    settingForm.value = settingData
  }
  initialSetting = cloneDeep(settingForm.value)
}

// 处理改变switch开关
// antdv-next 的 change 在 v-model:checked 写回前触发，需以事件参数取新值
const handleChangeSwitch = async (checked: boolean | string | number) => {
  if (!isAdmin()) {
    // 无权限不发请求：以加载时快照本地复位（等价 init 的重置效果，不依赖服务端可达）
    if (initialSetting) {
      nextTick(() => settingForm.value = cloneDeep(initialSetting))
    }
    message.error("用户权限不足")
    return
  }
  settingForm.value.enable = !!checked

  // 为 true 则返回，关闭时才发送请求
  if (settingForm.value.enable) {
    return;
  }

  settingForm.value = {
    enable: false,
    maximum: 1
  }
  await handleFinish()
}

// 表单验证
const rules: Record<string, Rule[]> = {
  maximum: [
    { required: true,message: "请输入最大同时在线数",trigger: 'change'}
  ]
}

// 处理保存设置
const handleFinish = async () => {

  try {
    submitLoading.value = true
    setting.value.json = JSON.stringify(settingForm.value)
    const resp = await save(setting.value)

    if (resp.code === 200) {
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
      // 保存失败回滚开关：重拉服务端值复位（v-model 已翻转，与非 admin 分支同法）
      await init()
    }
  } finally {
    submitLoading.value = false
  }

}

onMounted(() => init())
</script>
