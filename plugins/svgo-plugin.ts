import type {CustomPlugin} from 'svgo'

/**
 * 将 svg 内所有元素的 fill 替换为 currentColor，使图标颜色受 CSS 控制（与官方图标行为一致）。
 * excludePath 路径下的图标（多色图标）不做替换，保留原始配色。
 * 与官方图标对齐的其余处理（anticon 类、1em 尺寸）由 vite.config 中的 svgo stock 插件完成。
 */
const fillToCurrentColor = (excludePath: string): CustomPlugin => ({
    name: 'fillToCurrentColor',
    fn: (_root, _params, info) => {
        if (info.path?.includes(excludePath)) {
            return {}
        }
        return {
            element: {
                enter: node => {
                    if (node.attributes.fill) {
                        node.attributes.fill = 'currentColor'
                    }
                },
            },
        }
    },
})

export default fillToCurrentColor
