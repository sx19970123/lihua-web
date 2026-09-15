<template>
  <expandable-card class="w-full"
             :expanded-width="600"
             :expanded-height="610"
  >
    <template #overview>
      <div class="relative h-[108px] p-ant-lg box-border overflow-hidden">
        <!-- Spring 绿氛围：logo 处径向光晕，向左渐隐 -->
        <div class="absolute inset-0 pointer-events-none" :style="washStyle"/>
        <!-- logo 背景水印：低透明度居右，融入光晕 -->
        <img src="../static/spring-boot.png" alt="" :style="logoWatermarkStyle"/>
        <!-- 内容层：纯 relative（不带 z-index），靠 DOM 顺序压住装饰背景 -->
        <a-flex vertical justify="center" align="flex-start" :gap="8" class="relative h-full min-w-0">
          <a-typography-title :level="4" ellipsis :styles="{root: {margin: 0}}">后端</a-typography-title>
          <a-flex v-if="!themeStore.isSmallWindow" :gap="6" wrap="wrap">
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              {{ 'SpringBoot ' + versionInfo.springBootVersion }}
            </span>
            <span class="text-ant-sm leading-[22px] px-[10px] rounded-full font-medium" :style="pillStyle">
              {{ 'SpringCloud ' + versionInfo.springCloudVersion }}
            </span>
          </a-flex>
        </a-flex>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar p-ant-lg">
        <a-typography-title :level="4" :styles="{root: {margin: 0}}">后端</a-typography-title>
        <!-- 双架构切换：单体 / 微服务（小号），版本文字在下一行跟随所选架构、版本号着品牌色 -->
        <a-segmented size="small"
                     :value="segment"
                     :options="segmentOptions"
                     style="margin-top: var(--ant-margin-xs)"
                     @change="(value: string | number) => segment = value as SegmentType"/>
        <div style="margin-top: var(--ant-margin-xxs)">
          <template v-if="segment === 'boot'">
            <a-typography-text type="secondary">当前 SpringBoot 版本为 </a-typography-text>
            <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> {{versionInfo.springBootVersion}}</a-typography-text>
          </template>
          <template v-else>
            <a-typography-text type="secondary">当前 SpringBoot 版本为 </a-typography-text>
            <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> {{versionInfo.springBootCloudVersion}}</a-typography-text>
            <a-typography-text type="secondary">，SpringCloud 版本为 </a-typography-text>
            <a-typography-text :styles="{root: {color: ACCENT_COLOR}}"> {{versionInfo.springCloudVersion}} </a-typography-text>
          </template>
        </div>
        <div class="scrollbar h-[460px] mt-ant-xs">
          <!-- 单体：SpringBoot -->
          <template v-if="segment === 'boot'">
            <a-typography-title :level="5">
              仓库概览
            </a-typography-title>
            <a-typography-text>
              <p class="indent-[2em]">
                lihua 仓库：面向多数管理后台场景的单体实现，按「启动 - 基础组件 - 业务」分层模块化，
                一个服务承载全部业务，开箱即用、部署简单。
              </p>
            </a-typography-text>
            <a-typography-title :level="5">
              目录结构
            </a-typography-title>
            <pre class="dir-tree">lihua
├─ lihua-admin            // 启动模块：启动类 / 全局配置 / Banner
├─ lihua-base             // 基础组件库（starter 化、可插拔）
│   ├─ lihua-base-common  // 统一响应 / 全局异常 / 通用工具
│   ├─ lihua-base-web     // Web 层配置与参数解析
│   ├─ lihua-base-security // 认证授权：过滤器 / 权限管理器 / 处理器
│   ├─ lihua-base-mybatis // 持久层增强：逻辑删除 / 字段自动填充
│   ├─ lihua-base-cache   // Redisson 分布式缓存 + Caffeine 本地缓存
│   ├─ lihua-base-captcha // 行为验证码（tianai-captcha 封装）
│   ├─ lihua-base-attachment // 附件：分片上传 / 存储策略
│   ├─ lihua-base-dict    // 字典缓存与翻译
│   ├─ lihua-base-log     // 登录 / 操作 / 系统日志
│   ├─ lihua-base-excel   // Excel 导入导出（fesod）
│   ├─ lihua-base-doc     // 接口文档（springdoc）
│   ├─ lihua-base-sensitive // 数据脱敏
│   ├─ lihua-base-ip      // IP 归属地 / 黑名单
│   ├─ lihua-base-websocket // 实时消息推送
│   └─ lihua-base-job     // 定时任务（Snail Job）
└─ lihua-biz              // 业务模块
    ├─ lihua-system       // 系统业务：用户 / 角色 / 菜单 / 字典 / 附件…
    └─ lihua-monitor      // 监控业务：服务监控 / 缓存监控</pre>
            <a-typography-title :level="5">
              主要依赖
            </a-typography-title>
            <a-descriptions bordered size="small" :column="1">
              <a-descriptions-item label="系统框架">Spring Boot 4.1.1（Java 25 / 虚拟线程）</a-descriptions-item>
              <a-descriptions-item label="安全框架">Spring Security + java-jwt 4.6.0</a-descriptions-item>
              <a-descriptions-item label="持久层框架">MyBatis-Plus 3.5.17</a-descriptions-item>
              <a-descriptions-item label="数据库驱动">MySQL Connector/J 26.7.0</a-descriptions-item>
              <a-descriptions-item label="多数据源">dynamic-datasource 4.5.0</a-descriptions-item>
              <a-descriptions-item label="分布式缓存">Redisson 4.7.0</a-descriptions-item>
              <a-descriptions-item label="本地缓存">Caffeine 3.2.4</a-descriptions-item>
              <a-descriptions-item label="行为验证码">tianai-captcha 1.5.5</a-descriptions-item>
              <a-descriptions-item label="接口文档">springdoc 3.1.0</a-descriptions-item>
              <a-descriptions-item label="定时任务">Snail Job 2.0.2</a-descriptions-item>
              <a-descriptions-item label="Excel 导入导出">fesod 2.0.2</a-descriptions-item>
              <a-descriptions-item label="对象存储">阿里云 OSS SDK 3.18.5</a-descriptions-item>
              <a-descriptions-item label="IP 归属地">ip2region 3.3.7</a-descriptions-item>
            </a-descriptions>
          </template>
          <!-- 微服务：SpringCloud -->
          <template v-else>
            <a-typography-title :level="5">
              仓库概览
            </a-typography-title>
            <a-typography-text>
              <p class="indent-[2em]">
                lihua-cloud 仓库：面向高并发与弹性扩展场景的微服务实现，网关统一入口，业务服务按域拆分独立部署，
                注册配置中心、负载均衡、熔断限流等微服务基建一应俱全，基础组件与单体同源复用。
              </p>
            </a-typography-text>
            <a-typography-title :level="5">
              目录结构
            </a-typography-title>
            <pre class="dir-tree">lihua-cloud
├─ lihua-gateway          // 网关服务：路由 / 鉴权 / 限流 / 降级
├─ lihua-auth             // 认证服务：登录授权 / 验证码 / 注册
├─ lihua-file             // 文件服务：附件上传与存储
├─ lihua-biz              // 业务服务
│   ├─ lihua-system       // 系统业务：用户 / 角色 / 菜单 / 字典 / 附件…
│   └─ lihua-monitor      // 监控业务：服务监控 / 缓存监控
├─ lihua-api              // 服务间调用接口（lihua-api-system）
│   └─ lihua-api-system   // system 服务接口与降级实现
└─ lihua-base             // 基础组件库（与单体同源）
    ├─ lihua-base-common  // 统一响应 / 全局异常 / 通用工具
    ├─ lihua-base-web     // Web 层配置与参数解析
    ├─ lihua-base-security // 认证授权：过滤器 / 权限管理器 / 处理器
    ├─ lihua-base-mybatis // 持久层增强：逻辑删除 / 字段自动填充
    ├─ lihua-base-cache   // Redisson 分布式缓存 + Caffeine 本地缓存
    ├─ lihua-base-captcha // 行为验证码（tianai-captcha 封装）
    ├─ lihua-base-attachment // 附件：分片上传 / 存储策略
    ├─ lihua-base-dict    // 字典缓存与翻译
    ├─ lihua-base-log     // 登录 / 操作 / 系统日志
    ├─ lihua-base-excel   // Excel 导入导出（fesod）
    ├─ lihua-base-doc     // 接口文档（springdoc）
    ├─ lihua-base-sensitive // 数据脱敏
    ├─ lihua-base-ip      // IP 归属地 / 黑名单
    ├─ lihua-base-websocket // 实时消息推送
    ├─ lihua-base-job     // 定时任务（Snail Job）
    └─ lihua-base-client  // 微服务特有：各服务客户端封装
</pre>
            <a-typography-title :level="5">
              主要依赖
            </a-typography-title>
            <a-descriptions bordered size="small" :column="1" :styles="{ label: { width: '120px' } }">
              <a-descriptions-item label="系统框架">Spring Boot 4.0.8（Java 25 / 虚拟线程）</a-descriptions-item>
              <a-descriptions-item label="微服务框架">Spring Cloud 2025.1.3</a-descriptions-item>
              <a-descriptions-item label="微服务组件">Spring Cloud Alibaba 2025.1.0.0</a-descriptions-item>
              <a-descriptions-item label="注册配置中心">Nacos</a-descriptions-item>
              <a-descriptions-item label="服务网关">Spring Cloud Gateway</a-descriptions-item>
              <a-descriptions-item label="负载均衡">Spring Cloud LoadBalancer</a-descriptions-item>
              <a-descriptions-item label="熔断限流">Resilience4j</a-descriptions-item>
              <a-descriptions-item label="服务间调用">HTTP Interface 声明式客户端 + LoadBalancer</a-descriptions-item>
              <a-descriptions-item label="共享基础">MyBatis-Plus / Redisson / Snail Job / fesod / tianai-captcha 等与单体一致</a-descriptions-item>
            </a-descriptions>
          </template>
        </div>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import {computed, ref} from "vue";
import type {CSSProperties} from "vue";
import {useThemeStore} from "@/stores/theme.ts";
import {versionInfo} from "@/views/index/version-record.ts";

// Spring 品牌绿：与 Spring Boot logo 主色一致，用于氛围光晕
const ACCENT_COLOR = '#6DB33F'
// 亮色模式标签文字：品牌色加深，保证白底磨砂上的对比度
const PILL_TEXT_LIGHT = '#4C7D22'
// 色晕颜色：品牌色掺灰降饱和，避免背景过于鲜艳
const HALO_COLOR = '#81A768'
const themeStore = useThemeStore();

// 双架构切换：单体（SpringBoot）/ 微服务（SpringCloud）
type SegmentType = 'boot' | 'cloud'
const segment = ref<SegmentType>('boot')
const segmentOptions = [
  {label: 'SpringBoot', value: 'boot'},
  {label: 'SpringCloud', value: 'cloud'},
]

// 品牌色氛围：logo 处径向光晕
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
