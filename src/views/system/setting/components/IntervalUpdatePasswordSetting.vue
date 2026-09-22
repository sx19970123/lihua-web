<template>
  <a-card>
    <a-form layout="vertical" :model="settingForm" @finish="handleFinish" :rules="rules">
      <a-form-item label="定期修改密码">
        <template #tooltip>
          设置系统用户多长时间需要修改密码
        </template>
        <a-switch v-model:checked="settingForm.enable" @change="handleChangeSwitch"></a-switch>
      </a-form-item>
      <transition :name="themeStore.routeTransition" mode="out-in">
        <div v-if="settingForm.enable">
          <a-form-item label="周期" name="interval">
            <!-- addonAfter 已弃用：Space.Compact 组合数字输入与单位选择 -->
            <a-space-compact>
              <a-input-number style="width: 150px"
                              :precision="0"
                              :min="1"
                              placeholder="请输入"
                              v-model:value="settingForm.interval"/>
              <a-select style="width: 60px" v-model:value="settingForm.unit" :options="unitOptions"/>
            </a-space-compact>
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
import type {SysSetting} from "@/api/system/setting/type/sys-setting.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {getCurrentInstance, onMounted, ref} from "vue";
import type {IntervalUpdatePassword} from "@/api/system/setting/type/interval-update-password.ts";
import {message, type Rule} from "@/antd-adapter";
import {useThemeStore} from "@/stores/theme.ts";
import {isAdmin} from "@/helpers/auth.ts";
import {save} from "@/api/system/setting/setting.ts";

const themeStore = useThemeStore()
const componentName = getCurrentInstance()?.type.__name
const settingStore = useSettingStore();
const submitLoading = ref<boolean>(false);
const init = async () => {
  const settingData = await settingStore.getSettingInfo<IntervalUpdatePassword>(componentName);
  if (settingData) {
    settingForm.value = settingData
  }
}

// 周期单位选项
const unitOptions = [
  {value: 'day', label: '天'},
  {value: 'week', label: '周'},
  {value: 'month', label: '月'},
  {value: 'year', label: '年'}
]

// 定期修改密码表单
const settingForm = ref<IntervalUpdatePassword>({
  enable: false,
  unit: 'month'
})

// 保存到数据库中的对象
const setting = ref<SysSetting>({
  settingKey: componentName,
  json: JSON.stringify(settingForm.value)
})

// 表单验证
const rules: Record<string, Rule[]> = {
  interval: [
    { required: true,message: "请输入修改密码周期",trigger: 'change'},
  ]
}

// 处理改变switch开关
// antdv-next 的 change 在 v-model:checked 写回前触发，需以事件参数取新值
const handleChangeSwitch = async (checked: boolean | string | number) => {
  if (!isAdmin()) {
    await init()
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
    unit: 'month'
  }
  await handleFinish()
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
