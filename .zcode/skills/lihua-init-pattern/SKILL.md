---
name: lihua-init-pattern
description: 狸花猫项目 lihua-web 的 Vue 3 组件代码组织约定：init* 工厂函数（闭包组合式函数）与导包顺序。当在 lihua-web 中新建或重构 script setup 组件、为组件添加一组相关功能（状态+方法+watch+生命周期）、整理散落在 setup 顶层的逻辑、整理/编写 import 导入语句、或需要遵循/扩展已有 initXxx() 写法时使用。核心：按关注点把相关逻辑收进 initXxx 工厂函数，闭包持有私有状态，统一 return 导出并在 setup 顶层解构使用；导入按依赖类型分组排序。
---

# lihua init 模式

lihua-web 组件的逻辑组织约定：一个关注点一个 `initXxx` 工厂函数，闭包持有私有状态，统一导出。

## 模式骨架

```ts
/**
 * 初始化 xxx：一句话说明该关注点做什么
 */
const initXxx = () => {
  // 私有状态（ref / let / const）——闭包持有，外部不可见
  // 方法、watch、生命周期——按依赖顺序就近声明
  return {
    // 只导出模板或其他代码需要的；私有状态不导出
  }
}
const {a, b} = initXxx()   // 解构紧随定义
```

## 规则

1. **一个关注点一个 init**：如 `initDrag`（拖拽）、`initTime`（时钟）、`initAutoLock`（自动锁屏）。
2. **相关逻辑全部收拢**：该关注点的状态、方法、watch、生命周期回调都定义在函数内，不散落在 setup 顶层。
3. **最小导出**：只 return 模板绑定或其他 init 需要的名字；私有状态靠闭包隐藏。
4. **命名**：`init` + 领域名（camelCase）；解构语句紧跟函数定义。
5. **模板 ref 同名导出**：`return {anchorRef}` 后模板 `ref="anchorRef"` 照常绑定。
6. **跨实例共享状态放模块级**：SFC 用独立 `<script lang="ts">` 块；跨组件共享用独立 `.ts` 模块（如 `useTrackModifiers.ts`——它有两个消费方，不并入任何组件）。
7. **注释一句话**：写明函数/块的作用即可，不写调查叙事（详细根因分析放迁移文档的问题记录）。
8. 依赖外部上下文（store、其他 ref）通过闭包引用，定义在 init 之前即可。

## 导包顺序

按依赖类型分组排序（约束新写/重写的代码，旧文件不回改）：

1. `vue` 原生
2. Vue 生态：`vue-router`、pinia（`@/stores/*`）
3. 第三方库
4. 项目 ts 模块（`@/api`、`@/helpers`、`@/utils`、composables 等）
5. 项目组件（`@/**/*.vue`）
6. 相对路径导入（`./`、`../`）
7. 副作用导入（样式、locale 等）最后

同组内按包名/路径字典序；`import type` 与同源模块归同一组。

示例（view-tabs/index.vue）：

```ts
import {computed, onMounted, ref, useTemplateRef, watch} from "vue";
import {useRoute, useRouter} from "vue-router";
import {useViewTabsStore} from "@/stores/view-tabs.ts";
import type {DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent} from '@dnd-kit/vue'
import {PointerActivationConstraints} from '@dnd-kit/dom'
import {DragDropProvider, KeyboardSensor, PointerSensor} from '@dnd-kit/vue'
import {isSortable} from '@dnd-kit/vue/sortable'
import {isMobile} from 'is-mobile'
import {resetTrackBounds, snapshotTrackBounds} from "@/layout/view-tabs/composables/useTrackModifiers";
import SortableTabLabel from "@/layout/view-tabs/components/SortableTabLabel.vue";
import TabRightMenu from "@/layout/view-tabs/components/TabRightMenu.vue";
```

## 何时不用

- 逻辑需要被多个组件共享 → 独立 `.ts` 模块（composables 目录），而非塞进某个组件。
- 只有一两个零散函数、无状态 → 直接写在 setup 顶层，不必包 init。

## 项目范例

| 位置 | init 函数 |
|---|---|
| `src/layout/view-tabs/index.vue` | `initDrag`（拖拽全流程） |
| `src/layout/view-tabs/components/SortableTabLabel.vue` | `initSortable`（含模块级共享状态的 SFC 双 script 块写法） |
| `src/layout/index.vue` | `initTeleport` |
| `src/layout/head/components/lock-screen/index.vue` | `initTime` / `initAutoLock` / `initCheckPassword` |
| `src/layout/head/components/notice/index.vue` | `initList` / `initNoticeDetail` |
| `src/App.vue` | `initTheme` |

## 概念注记

实现机制是**闭包**（内部函数捕获私有作用域）；"工厂函数"是对这种组织形态的俗称；在 Vue 官方语境里等价于**组合式函数（composable）**，本项目命名惯例用 `initXxx` 而非 `useXxx`。
