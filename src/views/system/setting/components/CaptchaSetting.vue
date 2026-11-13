<template>
  <a-card>
    <a-spin :spinning="loading">
      <a-form v-if="!loading" layout="vertical">
        <a-form-item label="Web 端">
          <template #tooltip>
            Web 端登录或注册等场景下是否需要验证码，开启后从勾选的类型中随机展示
          </template>
          <a-switch v-model:checked="settingForm.web.enable"
                    @change="(checked) => handleSwitchChange('web', checked)"/>
        </a-form-item>
        <transition :name="themeStore.routeTransition" mode="out-in">
          <a-form-item v-if="settingForm.web.enable" label="Web 端验证类型" key="web">
            <a-checkable-tag v-for="option in typeOptions"
                             :key="option.value"
                             :checked="settingForm.web.types.includes(option.value)"
                             @change="() => handleTypeChange('web', option.value)">
              {{ option.name }}
            </a-checkable-tag>
          </a-form-item>
        </transition>
        <a-form-item label="App 端">
          <template #tooltip>
            App/小程序 端登录或注册等场景下是否需要验证码，开启后从勾选的类型中随机展示
          </template>
          <a-switch v-model:checked="settingForm.app.enable"
                    @change="(checked) => handleSwitchChange('app', checked)"/>
        </a-form-item>
        <transition :name="themeStore.routeTransition" mode="out-in">
          <a-form-item v-if="settingForm.app.enable" label="App 端验证类型" key="app">
            <a-checkable-tag v-for="option in typeOptions"
                             :key="option.value"
                             :checked="settingForm.app.types.includes(option.value)"
                             @change="() => handleTypeChange('app', option.value)">
              {{ option.name }}
            </a-checkable-tag>
          </a-form-item>
        </transition>
        <a-form-item>
          <a-button type="primary" :loading="submitLoading" @click="handleFinish">提 交</a-button>
        </a-form-item>
      </a-form>
    </a-spin>
  </a-card>
</template>

<script setup lang="ts">
import {getCurrentInstance, onMounted, ref} from "vue";
import type {SysSetting} from "@/api/system/setting/type/sys-setting.ts";
import type {Captcha, CaptchaClientSetting} from "@/api/system/setting/type/captcha.ts";
import {getCaptchaTypeOptions, type CaptchaTypeOption} from "@/api/system/captcha/captcha.ts";
import {message} from "@/antd-adapter";
import {isAdmin} from "@/helpers/auth.ts";
import {cloneDeep} from "lodash-es";
import {save} from "@/api/system/setting/setting.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {useThemeStore} from "@/stores/theme.ts";

const themeStore = useThemeStore()
const settingStore = useSettingStore();

const componentName = getCurrentInstance()?.type.__name
const submitLoading = ref<boolean>(false);
// 配置加载中标记，加载完成前不渲染表单（避免开关/勾选以默认值闪现）
const loading = ref<boolean>(true);

// 验证码类型选项（从后端获取）
const typeOptions = ref<CaptchaTypeOption[]>([])

// 归一化后的表单结构（web/app 必有值）
type CaptchaForm = {
  web: CaptchaClientSetting,
  app: CaptchaClientSetting
}

// 验证码配置表单对象
const settingForm = ref<CaptchaForm>({
  web: {enable: true, types: []},
  app: {enable: true, types: []}
})

// 加载完成后的配置快照（深拷贝），无权限操作时本地复位用，免二次请求
let initialSetting: CaptchaForm | undefined

// 保存到数据库中的对象
const setting = ref<SysSetting>({
  settingKey: componentName,
  json: JSON.stringify(settingForm.value)
})

// 初始化：加载配置与类型选项并归一化，已保存的系统配置中没有当前配置的话会进行创建
const init = async () => {
  if (!componentName) {
    return;
  }

  // 归一化配置：端缺省时按未配置处理（默认开启，类型池为空待勾选）
  const normalize = (data: Captcha | null | undefined): CaptchaForm => {
    return {
      web: normalizeClient(data?.web),
      app: normalizeClient(data?.app)
    }
  }

  const normalizeClient = (client: CaptchaClientSetting | undefined): CaptchaClientSetting => {
    return {
      enable: client?.enable ?? true,
      types: client?.types ?? []
    }
  }

  // 拉取配置与类型选项
  const initData = async () => {
    const [settingData, optionsResp] = await Promise.all([
      settingStore.getSettingInfo<Captcha>(componentName),
      getCaptchaTypeOptions()
    ])
    settingForm.value = normalize(settingData)
    typeOptions.value = optionsResp.data ?? []
    initialSetting = cloneDeep(settingForm.value)
  }

  try {
    await initData()
  } finally {
    loading.value = false
  }
}

// 开关变化：关闭时清空类型勾选（关闭态不保留上次配置，与其他设置项一致）
// antdv-next 的 change 在 v-model:checked 写回前触发，需以事件参数取新值
const handleSwitchChange = (client: 'web' | 'app', checked: boolean | string | number) => {
  if (!checked) {
    settingForm.value[client].types = []
  }
}

// 切换类型勾选
const handleTypeChange = (client: 'web' | 'app', value: string) => {
  const types = settingForm.value[client].types
  const index = types.indexOf(value)
  if (index > -1) {
    types.splice(index, 1)
  } else {
    types.push(value)
  }
}

// 处理保存设置：开启端类型池至少一种，关闭端不携带类型勾选
const handleFinish = async () => {
  if (!isAdmin()) {
    // 无权限不发请求：以加载时快照本地复位（等价 init 的重置效果，不依赖服务端可达）
    if (initialSetting) {
      settingForm.value = cloneDeep(initialSetting)
    }
    message.error("用户权限不足")
    return
  }

  const invalidClient = (['web', 'app'] as const).find(client =>
      settingForm.value[client].enable && settingForm.value[client].types.length === 0)
  if (invalidClient) {
    message.warning(`${invalidClient === 'web' ? 'Web' : 'App'} 端验证码开启后至少勾选一种验证类型`)
    return
  }

  // 关闭端不携带类型勾选（历史存档可能带值，提交时一律清空）
  (['web', 'app'] as const).forEach(client => {
    if (!settingForm.value[client].enable) {
      settingForm.value[client].types = []
    }
  })

  try {
    submitLoading.value = true
    setting.value.json = JSON.stringify(settingForm.value)
    const resp = await save(setting.value)
    if (resp.code === 200) {
      message.success(resp.msg)
      initialSetting = cloneDeep(settingForm.value)
    } else {
      message.error(resp.msg)
      // 保存失败回滚：重拉服务端值复位
      await init()
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => init())
</script>
