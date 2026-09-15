<template>
  <expandable-card class="w-full"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="relative h-[108px] p-ant-lg box-border overflow-hidden">
        <!-- uni-app 绿氛围：logo 处径向光晕 + 斜向淡彩，向左渐隐 -->
        <div class="absolute inset-0 pointer-events-none" :style="washStyle"/>
        <!-- logo 背景水印：低透明度居右，融入光晕 -->
        <img src="../static/uni.png" alt="" :style="logoWatermarkStyle"/>
        <!-- 内容层：纯 relative（不带 z-index），靠 DOM 顺序压住装饰背景 -->
        <a-flex vertical justify="center" align="flex-start" :gap="8" class="relative h-full min-w-0">
          <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">移动端</a-typography-title>
          <a-flex v-if="!themeStore.isSmallWindow" :gap="6" wrap="wrap">
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              uni-app
            </span>
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              Vue 3 + TS
            </span>
          </a-flex>
        </a-flex>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis>移动端</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">基于</a-typography-text>
          <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> uni-app </a-typography-text>
          <a-typography-text type="secondary">开发，适配 App 与微信小程序</a-typography-text>
        </a-typography-text>
        <div class="scrollbar h-[484px] mt-ant-xs overflow-x-hidden">
          <a-typography-title :level="5">
            技术概览
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              基于「狸花猫后台管理系统」的业务扩展方案，uni-app（Vue 3 + TypeScript）开发，一套代码适配 App、微信小程序等各家小程序与鸿蒙端；
              内置 Pinia、请求与路由拦截，与 Web 端开发体验保持一致。Web 端的通用组件（附件上传、字典标签、图标选择、颜色选择、密码输入等）已同步移植。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            目录结构
          </a-typography-title>
          <pre class="dir-tree">src
├─ api                    // 接口层
│   ├─ global             // 认证 / 字典 / 附件…
│   └─ system             // 系统管理接口
├─ components             // 移植自 Web 端的通用组件
│   ├─ attachment-upload  // 附件上传
│   ├─ user-avatar        // 用户头像
│   ├─ captcha            // 行为验证码
│   ├─ password-input     // 密码输入
│   ├─ dict-tag           // 字典标签
│   ├─ icon-select        // 图标选择
│   ├─ color-select       // 颜色选择
│   ├─ mp-html            // 富文本渲染
│   └─ notice-lite        // 轻量公告
├─ pages                  // 主包页面
│   ├─ splash             // 启动页
│   ├─ login              // 登录
│   ├─ index              // 首页
│   ├─ profile            // 我的
│   └─ webview            // 内嵌网页
├─ subpackages            // 分包
│   ├─ system             // 通知公告 / 设置 / 协议…
│   └─ 组件演示分包        // 与 components 一一对应
├─ router                 // 路由拦截
├─ stores                 // Pinia 状态
│   ├─ user               // 用户信息
│   ├─ theme              // 主题
│   ├─ dict               // 字典
│   ├─ notice             // 通知公告
│   └─ root               // 全局根
├─ utils                  // 请求 / 加密 / 附件 / 消息通知…
└─ App.vue / pages.json / manifest.json</pre>
          <a-typography-title :level="5">
            主要依赖
          </a-typography-title>
          <a-descriptions bordered size="small" :column="1">
            <a-descriptions-item label="前端框架">uni-app（Vue 3.5 + TypeScript）</a-descriptions-item>
            <a-descriptions-item label="UI 框架">sard-uniapp 1.30.x</a-descriptions-item>
            <a-descriptions-item label="状态管理">pinia</a-descriptions-item>
            <a-descriptions-item label="国际化">vue-i18n</a-descriptions-item>
            <a-descriptions-item label="数据加密">crypto-js + wxmp-rsa（RSA）</a-descriptions-item>
            <a-descriptions-item label="工具库">dayjs / lodash-es / uuidv4</a-descriptions-item>
            <a-descriptions-item label="全局根节点">@uni-ku/root</a-descriptions-item>
            <a-descriptions-item label="端适配">App / 微信小程序 / H5 / 鸿蒙</a-descriptions-item>
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

// uni-app 品牌绿：与 uni-app logo 主色一致，用于氛围光晕
const ACCENT_COLOR = '#2B9939'
// 亮色模式标签文字：品牌色加深，保证白底磨砂上的对比度
const PILL_TEXT_LIGHT = '#1F7A2C'
// 色晕颜色：品牌色掺灰降饱和，避免背景过于鲜艳
const HALO_COLOR = '#5C9964'
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
