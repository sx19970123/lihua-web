import type {App, Component} from 'vue'
import * as Icons from '@antdv-next/icons'

/**
 * 图标统一注册与名单出口（自定义 svg 与官方图标都从这里收口）。
 *
 * 第三方图标集成约定（使用方式与官方图标完全一致）：
 * 1. svg 放入 src/assets/icons/，文件名即全局组件名（扁平命名，禁止与官方导出名撞名，撞名时自定义覆盖官方并告警）；
 * 2. 多色图标放入 fixed-color/ 子目录，构建期不做 fill→currentColor 替换，保留原色；
 * 3. 单色图标构建期由 svgo 管线处理为 currentColor + 1em + anticon，因此颜色跟随 CSS、尺寸跟随 font-size；
 * 4. 渲染处直接用图标名字符串（<component :is="名字"> 或 h(Icon, {icon: '名字'})），无需 import。
 */
const svgModules = import.meta.glob<{ default: Component }>('@/assets/icons/**/*.svg', {eager: true})

export interface IconGroups {
  outlined: string[]
  filled: string[]
  twoTone: string[]
  custom: string[]
}

// 官方图标按导出名后缀分组；工具函数等非图标导出不带三类后缀，自然排除
const officialNames = Object.keys(Icons)
const iconGroups: IconGroups = {
  outlined: officialNames.filter(name => name.endsWith('Outlined')),
  filled: officialNames.filter(name => name.endsWith('Filled')),
  twoTone: officialNames.filter(name => name.endsWith('TwoTone')),
  custom: Object.keys(svgModules)
      .map(path => path.match(/\/([^/]+)\.svg$/)?.[1])
      .filter((name): name is string => !!name),
}

export {iconGroups}

/**
 * 同步注册全部自定义 svg 为全局组件。
 * eager 全量打包：图标在首次渲染前就可解析（懒加载注册会与头像/页签等早期渲染存在竞态），
 * 且省去启动时逐个 svg 的动态 import 请求。
 */
export function registerIcons(app: App) {
  for (const path in svgModules) {
    const name = path.match(/\/([^/]+)\.svg$/)?.[1]
    if (!name) {
      continue
    }
    if (import.meta.env.DEV && officialNames.includes(name)) {
      console.warn(`自定义图标 ${name} 与官方图标同名，自定义图标将覆盖官方图标`)
    }
    app.component(name, svgModules[path]!.default)
  }
}
