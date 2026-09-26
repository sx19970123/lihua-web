# 狸花猫后台管理系统 Web 端（lihua-web）

> 基于 **Vue3 + TypeScript + Antdv Next** 的现代化中后台管理端

[![Gitee Stars](https://gitee.com/yukino_git/lihua-web/badge/star.svg?theme=dark)](https://gitee.com/yukino_git/lihua-web/stargazers)

## 🧩 项目仓库

**3.0 起项目按端拆分为四个独立仓库**，共用统一的账号、权限与数据模型，可按需组合使用：

| 仓库 | 说明 | 地址 |
|------|------|------|
| lihua | 后端 · Spring Boot 单体版 | https://gitee.com/yukino_git/lihua |
| lihua-cloud | 后端 · Spring Cloud 微服务版 | https://gitee.com/yukino_git/lihua-cloud |
| lihua-web | 前端 · Vue3 管理端（Antdv Next 组件库，本仓库） | https://gitee.com/yukino_git/lihua-web |
| lihua-app | 移动端 · UniApp（Android / iOS / 鸿蒙 / 微信小程序） | https://gitee.com/yukino_git/lihua-app |

> 本仓库可同时对接单体版与微服务版后端，仅需调整代理目标地址。

## 📚 文档

- 📖 开发文档：https://doc.lihua.xyz（含 1.0 / 2.0 / 3.0 全版本）

## 🚀 在线体验

👉 https://lihua.xyz

## 💬 交流反馈

- 欢迎提交 Issues（功能建议 / Bug / 优化建议）
- QQ 交流群：850464676

## 🛠 主要技术栈

- Vue 3.5（Composition API）
- TypeScript
- Antdv Next（antdv-next）
- Vite 8 / Pinia 3 / Vue Router 5
- UnoCSS（原子化样式，跟随 antdv-next design token）
- TinyMCE 富文本 / vue-cropper 图片裁剪 / DOMPurify XSS 消毒

## ✨ 功能特性

- 🔐 **RBAC 权限**：动态菜单与路由、按钮级权限指令（`v-hasPermission` / `v-hasRole`）
- 🗂 **多标签页**：viewTabs 多任务栏，keep-alive 按用户隔离
- 🎨 **主题系统**：亮 / 暗 / 跟随系统，主题色自定义并同步服务端，多种导航布局
- 🧩 **业务组件**：字典标签、附件上传、用户选择、表格设置等 25+ 开箱即用组件
- 📢 **实时通信**：WebSocket 消息推送，权限变更全端红点提醒
- 🖥 **兼容双后端**：单体版（默认代理 `http://localhost:8081`）与微服务版（代理网关地址）无缝切换

## 📁 目录结构

``` bash
lihua-web/
├── src/
│   ├── api/                # 接口层（system / monitor 分域 + 类型定义）
│   ├── components/         # 业务组件（dict-tag / attachment-upload / user-select 等）
│   ├── directive/          # 权限指令（v-hasPermission / v-hasRole）
│   ├── helpers/            # 组合式工具（token / auth / dict / remember 等）
│   ├── layout/             # 布局（side / mix / top / drawer 四种导航 + 多标签）
│   ├── router/             # 静态路由（动态菜单由后端下发注册）
│   ├── stores/             # Pinia（user / permission / theme / dict / setting / view-tabs）
│   ├── utils/              # 请求封装 / WebSocket / 树工具 / 加密等
│   ├── views/              # 页面（system / monitor / component 演示等）
│   ├── antdv-adapter/      # message / notification / Modal 统一出口
│   ├── permission.ts       # 全局路由守卫
│   ├── app-init.ts         # 登录后初始化（用户信息 → 主题 → 动态路由 → 菜单）
│   └── settings.ts         # 默认配置
├── .env.development        # 开发环境（VITE_APP_BASE_API / VITE_APP_WS_API）
├── plugins/                # Vite 构建插件
└── vite.config.ts          # 端口 90，/dev-api 代理到后端
```

## 🚀 快速开始

```sh
# 安装依赖（Node.js 22+）
npm install

# 开发模式启动（默认端口 90）
npm run dev

# 生产构建（先 vue-tsc 类型检查，再 vite build，并行执行）
npm run build
```

默认代理 `/dev-api` → `http://localhost:8081`（单体版），微服务版改为网关地址即可，详见 `vite.config.ts`。

默认账号密码：`admin` / `123456`
