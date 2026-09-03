export interface SysRole {
  /**
   * 主键
   */
  id?: string;
  /**
   * 角色名称
   */
  name?: string;
  /**
   * 角色编码
   */
  code?: string;
  /**
   * 角色状态
   */
  status?: string;
  /**
   * 备注
   */
  remark?: string;
  /**
   * 菜单id集合
   */
  menuIds?: string[] | { checked: string[] };
}

export interface SysRoleVO extends SysRole{
  statusIsNormal?: boolean,
  updateStatusLoading?: boolean
}


export interface SysRoleDTO {
  /**
   * 角色名称
   */
  name: string;
  /**
   * 角色编码
   */
  code: string;
  /**
   * 角色状态
   */
  status: string | null;
  /**
   * 当前页数
   */
  pageNum: number;
  /**
   * 每页记录数
   */
  pageSize: number;
}

export interface SysRoleUserDTO {
  /**
   * 用户昵称
   */
  nickname: string | null;
  /**
   * 用户名
   */
  username: string | null;
  /**
   * 用户状态
   */
  status: string | null;
  /**
   * 授权状态（'1' 已授权 / '0' 未授权 / null 全部）
   */
  authorized: string | null;
  /**
   * 部门id集合
   */
  deptIdList: Array<string> | null;
  /**
   * 当前页数
   */
  pageNum: number;
  /**
   * 每页记录数
   */
  pageSize: number;
}

export interface SysRoleUserVO {
  /**
   * 主键id
   */
  id?: string;
  /**
   * 用户名
   */
  username?: string;
  /**
   * 昵称
   */
  nickname?: string;
  /**
   * 用户状态
   */
  status?: string;
  /**
   * 创建时间
   */
  createTime?: string;
  /**
   * 是否已授权该角色
   */
  authorized?: boolean;
}
