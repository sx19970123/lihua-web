/**
 * antdv-next 类型 barrel（3.0 迁移 · 任务 1.3 基础设施）
 *
 * 各页面/组件单元迁移时，类型导入统一改指本文件（或经 index.ts 使用 '@/antd-adapter'），
 * 以消灭 ant-design-vue/es/** 深路径；引用清零在收尾任务验收（卸载旧包前 grep=0）。
 * 依据：迁移文档附录 C.2 类型出口专项 + 1.5.2 实测（2026-08-25）。
 */
import type {MenuProps} from 'antdv-next'
import type {VcFile} from '@v-c/upload'

// vnext 顶层已有：直接 re-export
export type {
    CarouselRef,
    FlexProps,
    FormInstance,
    MenuProps,
    MenuItemType,
    Rule,
    RuleObject,
    SpinProps,
    TableColumnsType, // = antdv4 的 ColumnsType
    TableColumnType, // = antdv4 的 ColumnType
    TableLocale,
    TablePaginationConfig,
    TableRowSelection,
    ThemeConfig,
    TreeProps,
    UploadChangeParam,
    UploadFile,
    UploadProps,
} from 'antdv-next'

// vnext 顶层无导出：本地定义/别名
/** antdv4 的 menu ItemType → 由 MenuProps['items'] 派生 */
export type ItemType = NonNullable<MenuProps['items']>[number]
/** antdv4 的 MenuItemGroupType（项目仅 MixNavigation 使用）→ 以 items 元素类型近似 */
export type MenuItemGroupType = ItemType
/** antdv4 的 RcFile → vnext 在 @v-c/upload 中改名 VcFile，形状一致：File & { uid: string } */
export type RcFile = VcFile
/** antdv4 的 vc-upload UploadRequestOption → vnext 由 @v-c/upload 子包导出 */
export type {UploadRequestOption} from '@v-c/upload'
