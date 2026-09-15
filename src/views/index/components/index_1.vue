<template>
  <expandable-card
             class="w-full"
             :expanded-width="600"
             :is-detail-visible="false"
             :expanded-height="600"
  >
    <template #overview>
      <div class="p-ant-lg">
        <a-flex justify="space-between">
          <a-flex :gap="16">
            <user-avatar
                :avatar-json="userStore.avatarJson"
                :size="70"
            />
            <a-flex align="flex-start" vertical>
              <a-row>
                <a-typography-title :level="3" :styles="{root: {marginTop: 'var(--ant-margin-xxs)'}}">欢迎回来</a-typography-title>
                <a-typography-title :level="3" :styles="{root: {marginTop: 'var(--ant-margin-xxs)', color: themeStore.getColorPrimary()}}">&nbsp;{{userStore.$state.nickname}}</a-typography-title>
              </a-row>
              <a-typography-text :styles="{root: {marginTop: 'var(--ant-margin-xxs)'}}" type="secondary">{{userStore.defaultDeptPosts.map(item => item.name).join(" ")}}</a-typography-text>
            </a-flex>
          </a-flex>
          <a-flex vertical style="margin-top: 10px">
            <a-typography-title :level="4" :styles="{root: {marginTop: 'var(--ant-margin-xxs)'}}">{{dayjs(new Date()).format('YYYY-MM-DD HH:mm')}}</a-typography-title>
            <a-typography-text :styles="{root: {marginTop: 'var(--ant-margin-xxs)'}}" type="secondary">{{daysOfWeek[new Date().getDay()]}}</a-typography-text>
          </a-flex>
        </a-flex>
      </div>
    </template>
  </expandable-card>
</template>
<script setup lang="ts">
import ExpandableCard from "@/components/expandable-card/index.vue";
import UserAvatar from "@/components/user-avatar/index.vue"
import {useUserStore} from "@/stores/user.ts";
import {useThemeStore} from "@/stores/theme.ts";
import dayjs from "dayjs";

const userStore = useUserStore();
const themeStore = useThemeStore();
const daysOfWeek = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];


</script>
