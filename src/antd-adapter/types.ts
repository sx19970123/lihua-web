/**
 * antdv-next 类型统一出口
 *
 * 类型统一从这里导出（经 '@/antd-adapter' 单一入口），调用方无需感知
 * antdv-next 内部子包路径。
 */
import type {MenuProps} from 'antdv-next'

// antdv-next 顶层已导出：直接 re-export
export type {
    CarouselRef,
    FlexProps,
    FormInstance,
    MenuProps,
    MenuItemType,
    Rule,
    RuleObject,
    SpinProps,
    TableColumnsType,
    TableColumnType,
    TableLocale,
    TablePaginationConfig,
    TableRowSelection,
    ThemeConfig,
    TreeProps,
    UploadChangeParam,
    UploadFile,
    UploadProps,
} from 'antdv-next'

// antdv-next 顶层无导出：本地定义或内部子包转发
/** Menu 列表项类型，由 items 属性派生 */
export type ItemType = NonNullable<MenuProps['items']>[number]
export type {UploadRequestOption} from '@v-c/upload'
