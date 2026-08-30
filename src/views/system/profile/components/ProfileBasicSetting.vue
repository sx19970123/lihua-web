<template>
  <a-form
      ref="formRef"
      :hideRequiredMark="true"
      :model="profileInfo"
      :rules="userRoles"
      :colon="false"
      :label-col="{ style: { marginTop: 'var(--ant-margin-xxs)' } }"
  >
    <a-flex gap="small" wrap="wrap">
      <!--      个人中心卡片-->
      <a-card class="flex-1 min-w-[300px]">
        <a-typography-title :level="5">个人信息</a-typography-title>
        <div class="max-w-[400px] mx-auto">
          <a-form-item>
            <avatar-modifier v-model="profileInfo.avatar" @change="(value?: string) => handleSave({avatar: value})"/>
          </a-form-item>
          <a-form-item label="用户昵称" name="nickname">
            <inline-edit-input required
                                v-model="profileInfo.nickname"
                                :on-submit="(value?: string) => handleSave({nickname : value})"
                                @reset="handleClearValidate"
            />
          </a-form-item>
          <a-form-item label="手机号码" name="phoneNumber">
            <inline-edit-input v-model="profileInfo.phoneNumber"
                               :on-submit="(value?: string) => handleSave({phoneNumber : value})"
                               @reset="handleClearValidate"/>
          </a-form-item>
          <a-form-item label="电子邮箱" name="email">
            <inline-edit-input v-model="profileInfo.email"
                               :on-submit="(value?: string) => handleSave({email : value})"
                               @reset="handleClearValidate"/>
          </a-form-item>
          <a-form-item label="用户性别">
            <inline-edit-select v-model="profileInfo.gender"
                                :options="user_gender"
                                :on-submit="(value?: string) => handleSave({gender : value})"/>
          </a-form-item>
        </div>
      </a-card>
      <a-flex vertical gap="small" class="flex-[1.68]">
        <!--      部门和岗位卡片-->
        <a-card class="flex-1 min-w-[300px]">
          <a-typography-title :level="5">部门岗位</a-typography-title>
          <selectable-card :dataSource="deptList"
                           itemKey="id"
                           v-model="defaultDeptId"
                           @select="handleSelectDefaultDept"
                           @unselect="handleUnselectDefaultDept"
          >
          <template #content="{item}">
            <a-flex vertical gap="small">
              <a-flex gap="small">
                <a-typography-text strong>
                  {{item.name}}
                </a-typography-text>
                <a-tag variant="solid" :color="themeStore.getColorPrimary()" v-show="item.code === userStore.defaultDept.code">默认部门</a-tag>
              </a-flex>
              <a-typography-text type="secondary">
                {{item.code}}
              </a-typography-text>
              <div v-if="postList.filter(post => post.deptId === item.id).length > 0">
                <a-tag v-for="post in postList.filter(post => post.deptId === item.id)">
                  {{post.name}}
                </a-tag>
              </div>
              <div v-else>
                <a-typography-text  type="secondary">暂无岗位</a-typography-text>
              </div>
            </a-flex>
            </template>
          </selectable-card>
        </a-card>
        <!--      部门和岗位卡片-->
        <a-card class="flex-1 min-w-[300px]">
          <a-typography-title :level="5">我的角色</a-typography-title>
          <a-form-item>
            <a-tag v-for="roleName in userStore.roles.map(item => item.name)" variant="solid" :color="themeStore.getColorPrimary()">{{roleName}}</a-tag>
          </a-form-item>
        </a-card>
      </a-flex>
    </a-flex>
  </a-form>
</template>

<script setup lang="ts">
import {nextTick, reactive, ref, useTemplateRef, watch} from "vue";
import {useUserStore} from "@/stores/user";
import AvatarModifier from "@/views/system/profile/components/AvatarModifier.vue";
import InlineEditInput from "@/views/system/profile/components/InlineEditInput.vue";
import InlineEditSelect from "@/views/system/profile/components/InlineEditSelect.vue";
import type {Rule} from "ant-design-vue/es/form";
import {type FormInstance} from "ant-design-vue";
import {message} from "@/antd-adapter";
import type {ProfileInfo} from "@/api/system/profile/type/sys-profile.ts";
import {saveBasics, setDefaultDept} from "@/api/system/profile/profile.ts";
import {initDict} from "@/helpers/dict.ts"
import {ResponseError} from "@/api/global/type.ts";
import SelectableCard from "@/components/selectable-card/index.vue"
import {flattenTree} from "@/utils/tree.ts"
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import {useThemeStore} from "@/stores/theme.ts";

const userStore = useUserStore()
const themeStore = useThemeStore()
const {user_gender} = initDict('user_gender')

const formRef = useTemplateRef<FormInstance>("formRef")

// 初始化数据
const init = () => {
  const profileInfo = reactive<ProfileInfo>({
    avatar: userStore.avatar,
    nickname: userStore.userInfo.nickname,
    gender: userStore.userInfo.gender,
    email: userStore.userInfo.email,
    phoneNumber: userStore.userInfo.phoneNumber
  })

  const userRoles = reactive<Record<string,Rule[]> >({
    nickname: [
      { required: true , message: '用户昵称不能为空'},
      { max: 20 , message: '用户昵称最大20字符'}
    ],
    gender: [
      { required: true , message: '用户性别不能为空'}
    ],
    email: [
      { required: false , message: '邮箱地址不能为空'},
      { pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, message: '请输入正确的邮箱'}
    ],
    phoneNumber: [
      { required: false , message: '手机号码不能为空'},
      { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码'}
    ]
  })
  return {
    profileInfo,
    userRoles
  }
}

const { profileInfo, userRoles }= init()

/**
 * 保存用户信息，返回是否成功（inline-edit 组件据此收尾编辑态）
 * @param values
 */
const handleSave = async (values: {avatar?: string,nickname?: string, gender?: string, email?: string, phoneNumber?: string}): Promise<boolean> => {
  try {
    const resp = await saveBasics(values)
    if (resp.code === 200){
      message.success(resp.msg)
      // 重新获取用户信息
      await userStore.initUserInfo()
      return true
    } else {
      message.error(resp.msg)
      return false
    }
  } catch(e) {
    if (e instanceof ResponseError) {
      message.error(e.msg)
    } else {
      console.error(e)
    }
    return false
  }
}

// 清除验证提示
const handleClearValidate = () => {
  if (!formRef.value) {
    return
  }
  formRef.value.clearValidate()
}

// 初始化部门相关逻辑
const initDept = () => {
  // 默认部门id
  const defaultDeptId = ref<string|undefined>(userStore.defaultDept.id)
  // 部门列表
  const deptList = flattenTree(userStore.deptTrees)
  // 岗位列表
  const postList = userStore.posts
  // 选中部门，修改默认部门
  const handleSelectDefaultDept = async ({item}:{item: SysDept}) => {
    if (!item.id) {
      return
    }
    try {
      const resp = await setDefaultDept(item.id)
      if (resp.code === 200) {
        // 更新默认部门
        userStore.updateDefaultDept(resp.data)
        message.success(resp.msg)
      } else {
        message.error(resp.msg)
      }
    } catch (e) {
      if (e instanceof ResponseError) {
        message.error(e.msg)
      } else {
        console.error(e)
      }
    }
  }

  // 取消选中时恢复默认部门的选中回显
  const handleUnselectDefaultDept = async () => {
    await nextTick(() => defaultDeptId.value = userStore.defaultDept.id)
  }

  return {
    deptList,
    defaultDeptId,
    postList,
    handleSelectDefaultDept,
    handleUnselectDefaultDept
  }
}
const {deptList, defaultDeptId, postList, handleSelectDefaultDept, handleUnselectDefaultDept} = initDept()

// 默认部门id变化时同步选中
watch(() => userStore.defaultDept.id, (value) => {
  defaultDeptId.value = value
})
</script>
