import type {Component} from 'vue'
import {createApp, defineComponent} from 'vue'
import {createPinia} from 'pinia'

import App from './App.vue'
import router from './router'
import './permission'
import directive from './directive'

// antdv-next 组件库
import AntdvNext from 'antdv-next';
// antdv-next 图标
import * as Icons from "@antdv-next/icons";
// antdv-next 全局 reset
import 'antdv-next/dist/reset.css';
// unocss 原子类（值跟随 antdv-next 运行时注入的 --ant-* token 变量）
import 'virtual:uno.css';
import "@/static/css/index.css"


const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(AntdvNext)
// 指令
directive(app)
// ant 自带图标
const icons:Record<string, Component> = Icons
for (const i in icons) {
    app.component(i,icons[i])
}

// 导入自定义图标
const modules = import.meta.glob("./assets/icons/**/*.svg")
for (let path in modules) {
    modules[path]().then((module:any) => {
        if (module && module.default) {
            // 组件名
            const match = path.match(/\/([^/]+)\.svg$/)
            if (match) {
                // 注册组件
                app.component(match[1], defineComponent(module.default));
            }
        }
    });
}

// 导入登录后信息检查配置相关组件
const postLoginCheckComponents = import.meta.glob("./components/user-setup/*/*.vue")
for (const path in postLoginCheckComponents) {
    postLoginCheckComponents[path]().then((module: any) => {
        if (module && module.default) {
            // 组件名
            const match = path.match(/\/([^/]+)\.vue$/)
            if (match) {
                // 注册组件
                app.component(match[1], defineComponent(module.default));
            }
        }
    })
}

app.mount('#app')
