<template>
  <user-setup-base-component title="默认部门"
                                description="请设置您的默认部门"
                                icon="ApartmentOutlined"
                                skip-msg="可在系统顶部栏设置"
                                :skip="!userStore.$state.defaultDeptCode"
                                @next="handleNext"
                                @skip="handleSkip"
                                @back="emit('back')"
  >
    <template #content>
      <default-dept @dept-select="handleChangeDept" :show-dept-code="false" :show-tooltip="false"/>
    </template>
  </user-setup-base-component>
</template>
<script setup lang="ts">
import UserSetupBaseComponent from "@/components/user-setup/UserSetupBaseComponent.vue";
import DefaultDept from "@/components/default-dept-select/index.vue"
import type {Ref} from "vue";
import type {ResponseType} from "@/api/global/type.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import {message} from "@/antd-adapter";
import {useUserStore} from "@/stores/user.ts";

const userStore = useUserStore();
// 向外抛出函数
const emit = defineEmits<{
  back: [],
  skip: [loading: boolean],
  next: [loading: boolean]
}>()

// 处理更新默认部门（历史写法：对响应对象写 value 属性无实际作用，保持原行为仅对齐类型）
const handleChangeDept = (resp: ResponseType<SysDept> & { value?: boolean }) => {
  resp.value = false
}

// 处理下一步
const handleNext = (loading:Ref<boolean>) => {
  if (userStore.$state.defaultDeptCode) {
    emit('next', loading.value)
  } else {
    message.warning('请选择默认部门')
  }
}

// 处理上一步
const handleSkip = (loading:Ref<boolean>) => {
  loading.value = false
  emit('skip', loading.value)
}
</script>

<style scoped>

</style>
