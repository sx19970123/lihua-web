import request from "@/utils/request.ts";
import type {PageResponseType} from "@/api/global/type.ts";
import type {SysRole, SysRoleDTO, SysRoleUserDTO, SysRoleUserVO, SysRoleVO} from "@/api/system/role/type/sys-role.ts";

// 分页查询列表
export const queryPage = (data: SysRoleDTO) => {
  return request<PageResponseType<SysRoleVO>>({
    url: 'system/role/page',
    method: 'post',
    data: data,
  })
}

// 根据id查询数据
export const queryById = (id: string) => {
  return request<SysRole>({
    url: 'system/role/' + id,
    method: 'get'
  })
}

// 保存数据
export const save = (data: SysRole) => {
  return request({
    url: 'system/role',
    method: 'post',
    data: data
  })
}

// 修改角色状态
export const updateStatus = (id: string, status: string) => {
  return request<string>({
    url: 'system/role/status/' + id + '/' + status,
    method: 'put'
  })
}

// 根据id集合删除数据
export const deleteData = (ids: Array<string>) => {
  return request({
    url: 'system/role',
    method: 'delete',
    data: ids
  })
}

// 获取用户集合
export const getRoleOption = () => {
  return request<Array<SysRole>>({
    url: 'system/role/option',
    method: 'get'
  })
}

// 查询角色用户授权分页（全量用户 + 授权标记）
export const queryUserPage = (roleId: string, data: SysRoleUserDTO) => {
  return request<PageResponseType<SysRoleUserVO>>({
    url: 'system/role/user/' + roleId + '/page',
    method: 'post',
    data: data
  })
}

// 批量授权用户
export const saveUsers = (roleId: string, userIds: Array<string>) => {
  return request({
    url: 'system/role/user/' + roleId,
    method: 'post',
    data: userIds
  })
}

// 批量取消授权用户
export const deleteUsers = (roleId: string, userIds: Array<string>) => {
  return request({
    url: 'system/role/user/' + roleId,
    method: 'delete',
    data: userIds
  })
}