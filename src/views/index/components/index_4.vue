<template>
  <expandable-card class="w-full"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="relative h-[108px] p-ant-lg box-border overflow-hidden">
        <!-- Vue 绿氛围：logo 处径向光晕 + 斜向淡彩，向左渐隐 -->
        <div class="absolute inset-0 pointer-events-none" :style="washStyle"/>
        <!-- logo 背景水印：低透明度居右，融入光晕 -->
        <img src="../static/vue.png" alt="" :style="logoWatermarkStyle"/>
        <!-- 内容层：纯 relative（不带 z-index），靠 DOM 顺序压住装饰背景 -->
        <a-flex vertical justify="center" align="flex-start" :gap="8" class="relative h-full min-w-0">
          <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">前端</a-typography-title>
          <a-flex v-if="!themeStore.isSmallWindow" :gap="6" wrap="wrap">
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              {{ 'Vue ' + versionInfo.vueVersion }}
            </span>
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              Antdv Next
            </span>
          </a-flex>
        </a-flex>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis>前端</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">当前 Vue 版本为 </a-typography-text>
          <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> {{versionInfo.vueVersion}}</a-typography-text>
        </a-typography-text>
        <div class="scrollbar h-[484px] mt-ant-xs overflow-x-hidden">
          <a-typography-title :level="5">
            技术概览
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              前端采用 Vue 3 + TypeScript + Vite 开发，组件库 antdv-next 对齐 Ant Design v6 设计体系，样式使用 UnoCSS 原子化并可与主题 token 联动；
              内置 Pinia 状态管理、动态路由与权限守卫，沉淀了附件上传、字典标签、图标选择、颜色选择、用户选择等一批开箱即用的业务组件。
            </p>
          </a-typography-text>

          <a-typography-title :level="5">
            目录结构
          </a-typography-title>
          <pre class="dir-tree">src
├─ api                    // 接口层：按领域划分
│   ├─ global             // 认证 / 字典 / 附件 / 系统设置…
│   ├─ system             // 系统管理：用户 / 角色 / 菜单…
│   └─ monitor            // 在线用户 / 日志 / 缓存…
├─ antd-adapter           // antdv-next 统一适配出口
├─ components             // 全局通用组件
│   ├─ attachment-upload  // 附件上传
│   ├─ image-cropper      // 图片裁剪
│   ├─ tianai-captcha     // 行为验证码
│   ├─ dict-tag           // 字典标签
│   ├─ icon-select        // 图标选择
│   ├─ color-select       // 颜色选择
│   ├─ table-setting      // 表格列设置
│   ├─ easy-tree-select   // 树选择
│   ├─ default-dept-select // 默认部门选择
│   ├─ user-select        // 用户选择
│   ├─ expandable-card    // 可展开卡片
│   ├─ mask               // 遮罩
│   ├─ iframe             // 内嵌页
│   └─ notice-preview     // 公告预览
├─ directive              // 自定义指令（v-draggable…）
├─ helpers                // 组合式工具
├─ layout                 // 布局
│   ├─ sider              // 侧边栏
│   ├─ head               // 顶栏
│   ├─ content            // 内容区
│   ├─ footer             // 页脚
│   ├─ view-tabs          // 多任务栏页签
│   ├─ layout-type        // 布局形态
│   └─ logo               // Logo
├─ router                 // 路由与权限守卫
├─ stores                 // Pinia 状态
│   ├─ user               // 用户信息
│   ├─ permission         // 权限与菜单
│   ├─ theme              // 主题
│   ├─ dict               // 字典
│   ├─ view-tabs          // 页签
│   └─ setting            // 系统设置
├─ utils                  // 请求封装 / 滚动条 / 主题工具…
└─ views                  // 业务页面
    ├─ system             // 系统管理
    ├─ monitor            // 系统监控
    ├─ component          // 组件演示
    ├─ login              // 登录注册
    ├─ index              // 首页
    └─ error              // 错误页</pre>

          <a-typography-title :level="5">
            主要依赖
          </a-typography-title>
          <a-descriptions bordered size="small" :column="1">
            <a-descriptions-item label="前端框架">vue（TypeScript + Vite）</a-descriptions-item>
            <a-descriptions-item label="组件库">antdv-next（对齐 Ant Design v6 设计体系）</a-descriptions-item>
            <a-descriptions-item label="图标">@antdv-next/icons</a-descriptions-item>
            <a-descriptions-item label="路由">vue-router</a-descriptions-item>
            <a-descriptions-item label="状态管理">pinia</a-descriptions-item>
            <a-descriptions-item label="异步请求">axios</a-descriptions-item>
            <a-descriptions-item label="原子化样式">UnoCSS（@antdv-next/unocss 主题联动）</a-descriptions-item>
            <a-descriptions-item label="富文本">tinymce</a-descriptions-item>
            <a-descriptions-item label="图片裁剪">vue-cropper</a-descriptions-item>
            <a-descriptions-item label="拖拽">@dnd-kit/vue</a-descriptions-item>
            <a-descriptions-item label="浏览器指纹">@fingerprintjs/fingerprintjs</a-descriptions-item>
            <a-descriptions-item label="数据加密">crypto-js（哈希 hash-wasm）</a-descriptions-item>
            <a-descriptions-item label="工具库">lodash-es / dayjs / @vueuse/core / uuid</a-descriptions-item>
            <a-descriptions-item label="滚动条">overlayscrollbars</a-descriptions-item>
            <a-descriptions-item label="路由切换进度条">nprogress</a-descriptions-item>
            <a-descriptions-item label="移动端适配">is-mobile</a-descriptions-item>
          </a-descriptions>
        </div>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {computed} from "vue";
import type {CSSProperties} from "vue";
import {useThemeStore} from "@/stores/theme.ts";
import {versionInfo} from "@/views/index/version-record.ts";

// Vue 品牌绿：与 Vue logo 主色一致，用于氛围光晕
const ACCENT_COLOR = '#41B883'
// 亮色模式标签文字：品牌色加深，保证白底磨砂上的对比度
const PILL_TEXT_LIGHT = '#237A56'
// 色晕颜色：品牌色掺灰降饱和，避免背景过于鲜艳
const HALO_COLOR = '#69AA8D'
const themeStore = useThemeStore();

// 品牌色氛围：logo 处径向光晕 + 斜向淡彩
const washStyle = computed<CSSProperties>(() => themeStore.isDarkTheme
    ? {background: `radial-gradient(circle at 91% 50%, ${HALO_COLOR}28 0%, ${HALO_COLOR}0f 22%, transparent 42%)`}
    : {background: `radial-gradient(circle at 91% 50%, ${HALO_COLOR}2b 0%, ${HALO_COLOR}12 22%, transparent 42%)`});

// logo 背景水印：低透明度居右，融入光晕
const logoWatermarkStyle = computed<CSSProperties>(() => ({
  position: 'absolute',
  top: '50%',
  right: '16px',
  width: '54px',
  height: '54px',
  transform: 'translateY(-50%)',
  opacity: 0.72,
  maskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
  WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
  pointerEvents: 'none',
  userSelect: 'none',
}));

// 磨砂标签：亮色白底玻璃 + 深品牌字，暗色浅玻璃 + 品牌字
const pillStyle = computed<CSSProperties>(() => themeStore.isDarkTheme
    ? {color: ACCENT_COLOR, backgroundColor: 'rgba(255,255,255,0.08)', boxShadow: `inset 0 0 0 1px ${ACCENT_COLOR}45`}
    : {color: PILL_TEXT_LIGHT, backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: `inset 0 0 0 1px ${ACCENT_COLOR}30`});
</script>
<style scoped>
/* 目录结构代码块：等宽字体 + 主题填充色底，横向可滚动 */
.dir-tree {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 20px;
  padding: var(--ant-padding-md);
  border-radius: var(--ant-border-radius);
  background: var(--ant-color-fill-tertiary);
  color: var(--ant-color-text);
  overflow-x: auto;
  margin: 0 0 var(--ant-margin-xs);
}
</style>
