/**
 * 表格设置项：弹层行渲染与 localStorage 持久化共用的列配置运行时结构
 */
export type TableSettingType = {
    // 标签
    label: string,
    // 是否显示
    display: boolean,
    // 排序
    sort: number,
    // 宽度
    width: number,
    // 默认宽度
    defaultWidth: number,
    // 设置了默认宽度
    setDefaultWidth: boolean,
    // 宽度是否发生了变化
    widthChanged: boolean,
    // 左固定 0 1
    leftFixed: number,
    // 右固定 0 1
    rightFixed: number,
    // key值
    key: string,
    // 存在子节点（多级表头）
    hasChildren: boolean,
}

/**
 * 组件消费的列定义结构子集：仅声明实际读取的字段；title/key/width/fixed 以 unknown 收宽，
 * 使不同来源（各版本组件库的 ColumnsType、页面字面量）的列定义均可直接传入。
 * 读取处一律以 typeof / 相等比较 / Array.isArray 守卫收窄。
 */
export type SettingColumnType = {
    // 标题（字符串时可被组件识别展示）
    title?: unknown,
    // 列 key（字符串时参与持久化匹配与拖拽排序标识）
    key?: unknown,
    // 宽度（数字或带 px 的字符串）
    width?: unknown,
    // 固定方向（各版本字面量集合不同，仅做相等比较）
    fixed?: unknown,
    // 子列（多级表头）
    children?: unknown
}
