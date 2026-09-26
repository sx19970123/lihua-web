import {fileURLToPath, URL} from 'node:url'
import {readFileSync} from 'node:fs'
import {defineConfig, loadEnv} from 'vite'
import type {UserConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from '@unocss/vite'
import svgLoader from 'vite-svg-loader'
import fillToCurrentColor from "./plugins/svgo-plugin.ts"

// 应用版本唯一事实源：package.json 的 version（经 define 注入 app-info.ts 的 __APP_VERSION__）
const appVersion = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')).version

export default defineConfig(({ mode }): UserConfig => {
  // 获取请求前缀
  const env = loadEnv(mode, process.cwd());
  const baseApi = env.VITE_APP_BASE_API
  const wsBaseApi = env.VITE_APP_WS_API
  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      port: 90,
      host: true,
      open: true,
      proxy: {
        [baseApi]: {
          target: 'http://localhost:8085',
          changeOrigin: true,
          rewrite: (p:string) => p.replace(baseApi, '')
        },
        [wsBaseApi]: {
          target: 'ws://localhost:8085',
          changeOrigin: true,
          ws: true
        }
      }
    },
    css: {
      preprocessorOptions: {
        less: {
          javascriptEnabled: true
        },
      }
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      outDir: 'dist',
      target: 'esnext',
      minify: 'esbuild',
      chunkSizeWarningLimit: 2000,
    },
    plugins: [
      UnoCSS(),
      vue(),
      // 将svg转为vue组件
      svgLoader({
        svgo: true,
        svgoConfig: {
          plugins: [
            // 设置svg图标fill属性为currentColor，保证图标受css控制改变颜色
            // 参数为排除目录，保证该目录下的图标不受影响，防止彩色图标被修改
            fillToCurrentColor("assets/icons/fixed-color"),
            // 删除图标的width和height属性
            {
              name: "removeAttrs",
              params: {
                attrs: ['width', 'height'],
              }
            },
            // 设置图标的width和height属性为1em
            {
              name: "addAttributesToSVGElement",
              params: {
                attributes: [
                  {'width': '1em'},
                  {'height': '1em'},
                ]
              }
            },
            // 在svg根节点追加anticon类（与已有class合并），对齐官方图标的行内对齐样式
            {
              name: "addClassesToSVGElement",
              params: {
                classNames: ['anticon'],
              }
            }
          ]
        }
      })
    ],
  }
})
