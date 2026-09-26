---
name: init
description: 狸花猫脚手架 Web 管理端（lihua-web）的二次开发初始化步骤。通常由后端仓（lihua / lihua-cloud）的 init 流程统一驱动；单独初始化本仓时也可独立执行。覆盖：项目改名（按层级）、版本重置 1.0.0、承接功能裁剪（部门岗位/通知公告/监控/组件演示页）。
---

# 二次开发初始化（lihua-web）

本仓是 Web 管理端。**通常由后端仓的 init 统一驱动**（问卷与计划见后端仓 `skills/init.md`），本文件定义本仓的承接步骤；单独初始化本仓时按相同问卷口径独立执行。

## 前置

- 生成 agent 入口指针（init 产物，脚手架仓库不携带）：根目录创建 `AGENTS.md`（列本仓 `skills/` 清单与用途、init 触发词）+ `CLAUDE.md`（一行 `@AGENTS.md`），后续会话由此发现 `skills/`。
- 全局问卷结果（项目名 slug/中文名、改名层级、目标版本 1.0.0、裁剪清单）由驱动方传入；单独执行时先收集。

## 改名（按选定层级）

- **品牌层**：`src/app-info.ts` 应用名/标题、`index.html` title、登录页文案与副标题。
- **品牌+标识层**（加）：`package.json` name、存储键前缀（`src/helpers/` 内 `lihua_*` 前缀——lock-screen/user-setup/remember/token 等，grep 全量定位；**改前缀会使用户本地已有登录态/记忆失效，属预期，向用户说明**）。
- **全量**（加）：本仓无 Java 包名，此档对本仓无追加动作。

## 版本重置

- `package.json` version → 1.0.0。
- `src/views/index/version-record.ts` 首页版本记录重置为「1.0.0 首发」（是否保留脚手架历史条目以驱动方问卷为准）。

## 裁剪承接（按驱动方裁剪清单执行对应项）

- **部门+岗位**：删 `src/views/system/dept|post`、`src/api/system/dept|post`；**顶栏部门切换器**（`src/layout/head/components/dept`）与 `stores/user.ts` 部门状态；`components/default-dept-select` 组件本体；SystemUser 部门岗位列/表单/筛选（DTO/VO 字段联动）；SystemSetting 自助注册的默认部门项；user-setup 向导默认部门步（`components/user-setup/default-dept`）。
- **通知公告**：删通知页、头部通知组件与角标、通知相关 store 消费点。
- **监控**：删 `src/views/monitor` 与对应 api、菜单消费。
- **组件演示页**：删 `src/views/component` 演示页与演示路由/菜单种子。
- **App 端**：本仓无感（无 App 专属内容）。
- 每项删除后跑 type-check + 残留 grep 审计（引用清零才算完成）。

## 验证与纪律

- 每步 `npm run type-check`，阶段完成 `npm run build`。
- 每步一 commit（用户项目历史从 init 开始），不 push；删除先列清单经确认。
- 改动波及 skills/ 内路径字样时同步更新 skill 文本（skill 是活文档）。
