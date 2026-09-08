<template>
  <a-card>
    <a-form layout="vertical" :model="settingForm">
      <a-form-item label="自助注册">
        <template #tooltip>
          是否允许新用户注册
        </template>
        <a-switch v-model:checked="settingForm.enable" @change="handleChangeSwitch"></a-switch>
      </a-form-item>
      <transition :name="themeStore.routeTransition" mode="out-in">
        <div v-if="settingForm.enable">
          <a-flex :gap="16" wrap="wrap">
            <a-card class="flex-1 min-w-[300px]">
              <a-typography-title :level="5">角色</a-typography-title>
              <a-form-item class="w-[270px]" name="roleIds">
                <a-select
                    v-model:value="settingForm.roleIds"
                    placeholder="请选择用户角色"
                    :options="sysRoleList"
                    mode="multiple"
                    optionFilterProp="name"
                    :fieldNames="{label: 'name', value: 'id'}"/>
              </a-form-item>
            </a-card>
            <a-card class="flex-1 min-w-[300px]">
              <a-typography-title :level="5">部门</a-typography-title>
              <a-form-item class="w-[270px]">
                <easy-tree-select :tree-data="sysDeptList"
                                  defaultExpandAll
                                  v-model="settingForm.deptIds"
                                  :field-names="{children:'children', title:'name', key: 'id' }"
                                  @change="loadPost"
                />
              </a-form-item>
            </a-card>
            <a-card v-if="settingForm.deptIds && settingForm.deptIds.length > 0" class="flex-1 min-w-[300px]">
              <a-typography-title :level="5">岗位</a-typography-title>
              <a-form-item class="w-[270px]" >
                <selectable-card
                    :data-source="sysPostList"
                    empty-description="请选择部门"
                    item-key="deptId"
                    v-model="settingForm.defaultDeptId"
                    :max-height="600"
                    :loading="postLoading"
                    vertical
                >
                  <template #content="{item, isSelected}">
                    <a-flex align="center" justify="space-between">
                      <a-typography-title :level="5" style="margin: 0">{{item?.deptName}}</a-typography-title>
                      <a-tag v-if="isSelected" variant="solid" :color="themeStore.getColorPrimary()">默认</a-tag>
                    </a-flex>
                    <div style="margin-top: var(--ant-margin);">
                      <div v-if="item?.postList && item?.postList.length > 0">
                        <a-checkable-tag v-for="post in item?.postList"
                                         @change="(checked: boolean) => handleSelectPostId(post.id, checked)"
                                         @click.stop="() => {}"
                                         :key="post.id"
                                         v-model:checked="post.checked">
                          {{post.name}}
                        </a-checkable-tag>
                      </div>
                      <div v-else>
                        <a-typography-text type="secondary">当前部门下暂无岗位数据</a-typography-text>
                      </div>
                    </div>
                  </template>
                </selectable-card>
              </a-form-item>
            </a-card>
          </a-flex>
          <a-form-item style="margin-top: var(--ant-margin-lg)">
            <a-button type="primary" @click="handleSubmit" :loading="submitLoading">提 交</a-button>
          </a-form-item>
        </div>
      </transition>
    </a-form>
  </a-card>
</template>

<script setup lang="ts">
import {useThemeStore} from "@/stores/theme.ts";
import {useSettingStore} from "@/stores/setting.ts";
import {getCurrentInstance, onMounted, ref} from "vue";
import type {SysSetting} from "@/api/system/setting/type/sys-setting.ts";
import type {SignUp} from "@/api/system/setting/type/sign-up.ts";
import type {SysRole} from "@/api/system/role/type/sys-role.ts";
import {getRoleOption} from "@/api/system/role/role.ts";
import type {SysDept} from "@/api/system/dept/type/sys-dept.ts";
import {getDeptOption} from "@/api/system/dept/dept.ts";
import {traverse} from "@/utils/tree.ts";
import {getPostOptionByDeptId} from "@/api/system/post/post.ts";
import type {SysPost} from "@/api/system/post/type/sys-post.ts";
import SelectableCard from "@/components/selectable-card/index.vue";
import EasyTreeSelect from "@/components/easy-tree-select/index.vue"
import {message} from "@/antd-adapter";
import {isAdmin} from "@/helpers/auth.ts";
import {save} from "@/api/system/setting/setting.ts";

const componentName = getCurrentInstance()?.type.__name
const settingStore = useSettingStore();
const themeStore = useThemeStore();
const submitLoading = ref<boolean>(false);

// 自助注册配置表单对象
const settingForm = ref<SignUp>({
  enable: false,
  deptIds: [],
  defaultDeptId: '',
  postIds:[],
  roleIds: []
})

// 保存到数据库中的对象
const setting = ref<SysSetting>({
  settingKey: componentName,
  json: JSON.stringify(settingForm.value)
})

// 角色选项
const sysRoleList = ref<Array<SysRole>>([])
// 加载角色选项
const initRole = async () => {
  const resp = await getRoleOption()
  if (resp.code === 200) {
    sysRoleList.value = resp.data
  } else {
    message.error(resp.msg)
  }
}

// 部门选项
const sysDeptList = ref<Array<SysDept>>([])
// 加载部门选项
const initDept = async () => {
  const resp = await getDeptOption()
  if (resp.code === 200) {
    sysDeptList.value = resp.data
  } else {
    message.error(resp.msg)
  }
}

// 岗位可选项
type PostOptional = {
  id?: string,
  name?: string,
  checked: boolean
}

// 部门下岗位分组
type PostType = {
  deptName: string,
  deptId: string,
  postList: Array<PostOptional>,
}

// 岗位分组信息
const sysPostList = ref<Array<PostType>>([])
// 岗位加载 loading
const postLoading = ref<boolean>(false)

// 按已选部门加载岗位分组
const loadPost = async () => {
  try {
    if (settingForm.value.deptIds) {
      postLoading.value = true
      await initPostByDeptIds(settingForm.value.deptIds)
    }
  } finally {
    postLoading.value = false
  }
}

// 根据部门id初始化岗位信息
const initPostByDeptIds = async (deptIds: string[]) => {
  if (!deptIds.length) {
    sysPostList.value = []
    return
  }

  // 获取部门id｜名称集合
  const deptOptions = getDeptOptions(deptIds)

  await initPostByDeptIdOption(deptIds, deptOptions)
}

// 获取部门选项集合
const getDeptOptions = (deptIds: string[]) => {
  const options: { value: string; label: string }[] = []

  deptIds.forEach(id => {
    traverse(sysDeptList.value, (dept) => {
      if (dept.id === id && dept.name) {
        options.push({
          value: dept.id,
          label: dept.name
        })
        return true
      }
    })
  })

  return options
}

const initPostByDeptIdOption = async (deptIds: string[], options: { label: string; value: string }[]) => {

  const originDeptIds = sysPostList.value.map(post => post.deptId)

  // 删除未选中的部门
  sysPostList.value = sysPostList.value.filter(item => deptIds.includes(item.deptId))
  // 找新增部门
  const newDeptIds = deptIds.filter(id => !originDeptIds.includes(id))

  if (!newDeptIds.length) {
    // 清理已移除部门残留的岗位选中与默认部门
    pruneRemovedDeptRefs(deptIds)
    return
  }

  const resp = await getPostOptionByDeptId(newDeptIds)

  if (resp.code !== 200) {
    message.error(resp.msg)
    return
  }

  const data = resp.data

  newDeptIds.forEach(deptId => {
    const dept = options.find(item => item.value === deptId)

    sysPostList.value.push({
      deptId,
      deptName: dept?.label ?? '',
      postList: sysPostsToPostOptional(data[deptId])
    })
  })

  // 清理已移除部门残留的岗位选中与默认部门
  pruneRemovedDeptRefs(deptIds)
  // 回显岗位
  if (settingForm.value.postIds?.length) {
    initPostTag(settingForm.value.postIds)
  }
}

// 清理已移除部门残留的引用：其岗位选中从 postIds 中移除、默认部门指向时清空，
// 保证落库配置只引用当前选中部门
const pruneRemovedDeptRefs = (deptIds: string[]) => {
  if (settingForm.value.postIds?.length) {
    const postIdSet = new Set(sysPostList.value.flatMap(item => (item.postList ?? []).map(post => post.id)))
    settingForm.value.postIds = settingForm.value.postIds.filter(id => postIdSet.has(id))
  }
  if (settingForm.value.defaultDeptId && !deptIds.includes(settingForm.value.defaultDeptId)) {
    settingForm.value.defaultDeptId = ''
  }
}

// 岗位数据转为可选项
const sysPostsToPostOptional = (postList?: SysPost[]): PostOptional[] => {
  if (!postList) return []

  return postList.map(post => ({
    id: post.id,
    name: post.name,
    checked: false
  }))
}

// 处理选中/取消选中 岗位标签
const handleSelectPostId = (tag: string, checked: boolean) => {
  // 初始化 postIdList 为数组，如果它还没有被初始化
  if (!settingForm.value.postIds) {
    settingForm.value.postIds = [];
  }

  // 如果 checked 为 true，则添加 tag，否则删除它
  if (checked) {
    // 确保 tag 不会被重复添加
    if (!settingForm.value.postIds.includes(tag)) {
      settingForm.value.postIds.push(tag);
    }
  } else {
    // 找到 tag 的索引并将其删除
    const index = settingForm.value.postIds.indexOf(tag);
    if (index > -1) {
      settingForm.value.postIds.splice(index, 1);
    }
  }
};

// 回显岗位标签
const initPostTag = (postIds: Array<string>) => {
  // 部门岗位中postId 与 postIds 相同时 checked 设置为true
  sysPostList.value.forEach(postDept => {
    if (postDept.postList && postDept.postList.length > 0) {
      postDept.postList.forEach(post => {
        if (post.id && postIds.includes(post.id)) {
          post.checked = true
        }
      })
    }
  })
}

// 加载配置，已保存的系统配置中没有当前配置的话会进行创建
const init = async () => {
  const settingData = await settingStore.getSettingInfo<SignUp>(componentName);
  if (settingData) {
    settingForm.value = settingData
    await loadPost()
  }
}

// 处理开关switch
// antdv-next 的 change 在 v-model:checked 写回前触发，需以事件参数取新值
const handleChangeSwitch = async (checked: boolean | string | number) => {
  if (!isAdmin()) {
    await init()
    message.error("用户权限不足")
    return
  }
  settingForm.value.enable = !!checked

  if (!settingForm.value.enable) {
    await handleSubmit()
  }
}

// 提交保存
const handleSubmit = async () => {
  const form = settingForm.value
  // 关闭时清空配置项
  if (!form.enable) {
    settingForm.value = {
      enable: false,
      deptIds: [],
      defaultDeptId: '',
      postIds:[],
      roleIds: []
    }
  } else {
    if (!form.roleIds?.length) {
      message.error("请选择角色")
      return
    }
    if (!form.deptIds?.length) {
      message.error("请选择部门")
      return
    }
  }

  try {
    submitLoading.value = true
    setting.value.json = JSON.stringify(settingForm.value)
    const resp = await save(setting.value)

    if (resp.code === 200) {
      message.success(resp.msg)
    } else {
      message.error(resp.msg)
    }
  } finally {
    submitLoading.value = false
  }
}

onMounted(async () => {
  initRole()
  await initDept()
  await init()
})
</script>
