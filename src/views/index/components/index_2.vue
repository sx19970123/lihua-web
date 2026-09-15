<template>
  <expandable-card class="w-full"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="relative h-[108px] p-ant-lg box-border overflow-hidden">
        <!-- 品牌色氛围：logo 处径向光晕 + 斜向淡彩，向左渐隐 -->
        <div class="absolute inset-0 pointer-events-none" :style="washStyle"/>
        <!-- logo 背景水印：低透明度居右，融入光晕 -->
        <img :src="themeStore.isDarkTheme ? logoHei : logoMiao" alt="" :style="logoWatermarkStyle"/>
        <!-- 内容层：纯 relative（不带 z-index），靠 DOM 顺序压住装饰背景 -->
        <a-flex vertical justify="center" align="flex-start" :gap="8" class="relative h-full min-w-0">
          <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">关于</a-typography-title>
          <a-flex v-if="!themeStore.isSmallWindow" :gap="6" wrap="wrap">
            <span v-for="tech in ['SpringBoot', 'Vue', 'uni-app']" :key="tech"
                  class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium"
                  :style="pillStyle">
              {{tech}}
            </span>
          </a-flex>
        </a-flex>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" ellipsis>关于</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          <a-typography-text type="secondary">狸花猫是一款基于</a-typography-text>
          <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> SpringBoot </a-typography-text>
          <a-typography-text type="secondary">和</a-typography-text>
          <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> Vue </a-typography-text>
          <a-typography-text type="secondary">的权限管理系统</a-typography-text>
        </a-typography-text>
        <div class="scrollbar h-[484px] mt-ant-xs overflow-x-hidden">
          <a-typography-title :level="5">
            为什么叫狸花猫
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              家里养了两只狸花猫，想以他们作为系统的主题。用任何一只的名字命名都不太好，干脆就按品种来命名了。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            项目简介
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              狸花猫提供单体（SpringBoot）与微服务（SpringCloud）双架构后端，配套 Web 管理端与 uni-app 移动端，四仓库协同。
              内置完整的 RBAC 权限管理，覆盖菜单、角色、用户、部门与岗位，支持多部门与默认部门，开箱即可支撑大多数管理后台场景。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            核心功能
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              系统字典支持普通字典和树形字典，并提供工具类获取和翻译字典信息，前端 dict-tag 组件可根据字典 value 直接展示 label 并自动匹配样式；
              通知公告集成 TinyMCE 富文本编辑器，基于 WebSocket 实时推送，已读名单分页查询；
              附件管理支持普通上传、分片上传与文件秒传，提供下载、分享与按业务路径归档，本地存储与阿里云 OSS 可切换。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            系统监控与日志
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              内置在线用户管理、缓存监控与服务监控（基于 JDK 内置接口，无额外依赖）；
              登录日志、操作日志与系统日志三线分离，记录客户端类型，便于审计与异常定位。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            个人中心
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              支持个性化主题配置：亮暗模式、主题色、圆角、玻璃材质均可视化调整；内置锁屏功能，支持预锁屏呼吸动画；
              常用页面可置顶维护，提升高频操作效率。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            系统设置
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              管理员可对系统进行精细化配置：默认密码、定期修改密码、同账号登录限制、自助注册、验证码开关、IP 黑名单以及灰色模式。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">
            交互体验
          </a-typography-title>
          <a-typography-text>
            <p class="indent-[2em]">
              多任务栏页签支持拖拽排序与状态记忆；浏览器小窗（画中画）模式支持跨窗口数据复制与主题同步；
              新用户首次登录提供分步设置引导；登录页支持分时段氛围背景与多种验证码交互。
            </p>
          </a-typography-text>
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
import logoMiao from '@/assets/logo/logo-miao.png'
import logoHei from '@/assets/logo/logo-hei.png'

// 狸花猫品牌橙：与猫 logo 主色一致，用于氛围光晕
const ACCENT_COLOR = '#E8912D'
// 亮色模式标签文字：品牌色加深，保证白底磨砂上的对比度
const PILL_TEXT_LIGHT = '#A9670F'
// 色晕颜色：品牌色掺灰降饱和，避免背景过于鲜艳
const HALO_COLOR = '#C4955E'
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
