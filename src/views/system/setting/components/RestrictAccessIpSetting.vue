<template>
  <a-card>
    <a-form
        layout="vertical"
        @finish="handleFinish"
        :model="settingForm"
    >
      <a-form-item label="限制访问IP">
        <template #tooltip>
          配置禁止访问ip地址，支持 ? * 通配符
        </template>
        <a-switch v-model:checked="settingForm.enable" @change="handleChangeSwitch"></a-switch>
      </a-form-item>
      <transition :name="themeStore.routeTransition" mode="out-in">
        <div v-if="settingForm.enable">
          <div class="scrollbar inline-block max-h-[400px]">
            <a-form-item
                :label="index === 0 ? 'ip地址' : ''"
                :key="index"
                v-for="(ipItem, index) in settingForm.ipList"
                :name="['ipList', index]"
                :rules="[{
                required: true,
                message: '请输入ip地址',
                trigger: ['change', 'blur'],
            },{
              pattern:  /^[0-9.?*]+$/,
              message: '请输入正确的ip地址',
              trigger: ['change', 'blur'],
            }]"
            >
              <a-input class="w-[270px]" placeholder="请输入ip地址" v-model:value="settingForm.ipList[index]" allow-clear/>
              <a-button class="mx-ant-xs"
                        danger
                        v-if="settingForm?.ipList.length > 1"
                        @click="handleRemoveIpItem(index)"
              >
                <template #icon>
                  <DeleteOutlined />
                </template>
              </a-button>
            </a-form-item>
            <a-form-item>
              <a-button type="dashed" class="w-[270px]" @click="handleAddIpItem">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加IP地址
              </a-button>
            </a-form-item>
          </div>
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
import {getCurrentInstance, onMounted, ref} from "vue";
import type {SysSetting} from "@/api/system/setting/type/sys-setting.ts";
import type {RestrictAccessIp} from "@/api/system/setting/type/restrict-access-ip.ts";
import {message} from "@/antd-adapter";
import {useThemeStore} from "@/stores/theme.ts";
import {isAdmin} from "@/helpers/auth.ts";
import {save} from "@/api/system/setting/setting.ts";

const themeStore = useThemeStore()
const settingStore = useSettingStore();
const componentName = getCurrentInstance()?.type.__name
const submitLoading = ref<boolean>(false);

// 加载配置，已保存的系统配置中没有当前配置的话会进行创建
const init = async () => {
  const settingData = await settingStore.getSettingInfo<RestrictAccessIp>(componentName);
  if (settingData) {
    settingForm.value = settingData
  }
}

// ip限制配置表单对象
const settingForm = ref<RestrictAccessIp>({
  enable: false,
  ipList: ['']
})

// 保存到数据库中的对象
const setting = ref<SysSetting>({
  settingKey: componentName,
  json: JSON.stringify(settingForm.value)
})

// 添加ip
const handleAddIpItem = () => [
  settingForm.value.ipList.push('')
]

// 删除ip
const handleRemoveIpItem = (index: number) => {
  settingForm.value.ipList.splice(index, 1)
}

// 提交配置信息
const handleFinish = async () => {
  submitLoading.value = true
  // ip 去重
  const ipList = settingForm.value.ipList
  const ipSet = new Set(ipList)
  let flag = false
  if (ipSet.size !== ipList.length) {
    flag = true
  }

  try {
    settingForm.value.ipList = [... ipSet]
    setting.value.json = JSON.stringify(settingForm.value)
    const resp = await save(setting.value)
    if (resp.code === 200) {
      if (flag){
        message.warning("已合并重复ip")
      }
      message.success(resp.msg)
      await init()
    } else {
      message.error(resp.msg)
    }
  } finally {
    submitLoading.value = false
  }
}

// 关闭ip限制保存配置
// antdv-next 的 change 在 v-model:checked 写回前触发，需以事件参数取新值
const handleChangeSwitch = async (checked: boolean | string | number) => {
  if (!isAdmin()) {
    await init()
    message.error("用户权限不足")
    return
  }
  settingForm.value.enable = !!checked

  if (settingForm.value.enable) {
    return;
  }

  settingForm.value = {
    enable: false,
    ipList: ['']
  }

  await handleFinish()
}

// 页面加载完成后调用
onMounted(() => init())
</script>
