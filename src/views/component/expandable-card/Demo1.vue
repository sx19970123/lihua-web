<template>
  <a-typography-title :level="4">基础用法</a-typography-title>
  <expandable-card :expanded-width="600" :expanded-height="610">
    <template #overview>
      <!-- 封面：标题 + 主题色关键词描述 + 右上角图标点缀（插槽内容按契约只管排版，不写圆角/边框/阴影） -->
      <div class="face">
        <div class="min-w-0">
          <a-typography-title :level="4" ellipsis>关于狸花猫</a-typography-title>
          <a-typography-text ellipsis type="secondary">
            基于
            <a-typography-text :style="{color: themeStore.getColorPrimary()}"> SpringBoot </a-typography-text>
            和
            <a-typography-text :style="{color: themeStore.getColorPrimary()}"> Vue </a-typography-text>
            的权限管理系统
          </a-typography-text>
        </div>
        <rocket-outlined class="face-icon" :style="{color: themeStore.getColorPrimary()}"/>
      </div>
    </template>
    <template #detail>
      <div class="scrollbar" style="padding: var(--ant-padding-lg)">
        <a-typography-title :level="4" ellipsis>关于狸花猫</a-typography-title>
        <a-typography-text ellipsis type="secondary">
          基于
          <a-typography-text :style="{color: themeStore.getColorPrimary()}"> SpringBoot </a-typography-text>
          和
          <a-typography-text :style="{color: themeStore.getColorPrimary()}"> Vue </a-typography-text>
          的权限管理系统
        </a-typography-text>
        <div class="scrollbar" style="height: 484px;margin-top: var(--ant-margin);overflow-x: hidden">
          <a-typography-title :level="5">为什么叫狸花猫</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">名字取自中华田园猫品种"狸花猫"——皮实、好养、战斗力强，正如这套系统追求的工程品质。</p>
          </a-typography-text>
          <a-typography-title :level="5">系统功能</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">
              系统包含完整的基于角色控制的 RBAC 权限管理系统，包括菜单管理、角色管理和用户管理。此外，还提供部门和岗位管理，适用于大多数业务场景，用户支持多部门并可指定默认部门，前后端均提供接口获取用户的默认信息。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">字典管理</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">
              系统字典支持普通字典和树形字典，并提供工具类用于获取和翻译字典信息，前端还提供 dict-tag 组件，可以通过字典 value 直接展示字典 label，并自动匹配 tag 样式。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">通知公告</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">通知公告集成了 Vditor 富文本解析器，并使用 WebSocket 实现了消息的实时发送与接收。</p>
          </a-typography-text>
          <a-typography-title :level="5">个人中心</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">个人中心支持个性化系统主题配置，支持主题、布局、导航等页面设置。</p>
          </a-typography-text>
          <a-typography-title :level="5">系统设置</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">
              管理员角色用户可以对系统进行进一步配置，包括默认密码设置、定期修改密码、同账号登录限制、自助注册配置、验证码开关、IP 黑名单和灰色模式。
            </p>
          </a-typography-text>
          <a-typography-title :level="5">其他功能</a-typography-title>
          <a-typography-text>
            <p style="text-indent: 2em">系统还提供了日志服务、在线用户监控、缓存监控、服务监控以及定时任务等功能。</p>
          </a-typography-text>
        </div>
      </div>
    </template>
  </expandable-card>
</template>

<script setup lang="ts">
import ExpandableCard from '@/components/expandable-card/index.vue'
import {RocketOutlined} from '@ant-design/icons-vue'
import {useThemeStore} from '@/stores/theme.ts'

const themeStore = useThemeStore()
</script>

<style scoped>
.face {
  height: 108px;
  padding: var(--ant-padding-lg);
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ant-padding);
}

.face-icon {
  font-size: 36px;
  opacity: .85;
  flex-shrink: 0;
}
</style>
