<template>
  <transition :name="theme.$state.routeTransition" mode="out-in">
    <a-breadcrumb :items="pageRoute" v-if="pageRoute && pageRoute.length > 1 && pageRoute[0].path !== ''">
      <template #itemRender="{route}">
        {{ route.title }}
      </template>
    </a-breadcrumb>
  </transition>
</template>
<script lang="ts" setup>
import {type RouteRecordRaw, useRoute} from "vue-router";
import {ref, watch} from "vue";
import {type BreadcrumbItemType} from "antdv-next";
import {useThemeStore} from "@/stores/theme.ts";
const theme = useThemeStore();
const route = useRoute()

// 路由记录映射为面包屑 items（title 取路由 meta.label；映射天然丢弃 children，勿需再清空）
const toBreadcrumbItems = (matched: RouteRecordRaw[]): BreadcrumbItemType[] =>
    matched.map(route => ({title: route.meta?.label as string, path: route.path}))

const pageRoute = ref<BreadcrumbItemType[]>();
if (route.fullPath !== '/index') {
  pageRoute.value = toBreadcrumbItems(route.matched)
}

// 监听路由变化
watch(() => route, (value) => {
  if (value.fullPath !== '/index') {
    pageRoute.value = toBreadcrumbItems(value.matched)
  } else {
    pageRoute.value = []
  }
}, {deep: true})
</script>
