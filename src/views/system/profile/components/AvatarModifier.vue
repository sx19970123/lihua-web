<template>
  <div>
    <a-row align="center" class="h-16">
      <sys-avatar class="modify relative inline-block"
                  :size="64"
                  :type="props.modelValue.type"
                  :value="props.modelValue.value"
                  :background-color="props.modelValue.backgroundColor"
                  :url="props.modelValue.url"
                  v-if="!open"
                  @click="openModal"
      />
    </a-row>
    <a-modal v-model:open="open" width="1000px" destroy-on-hidden @cancel="close">
      <template #title>
        <a-typography-title :level="4">头像编辑</a-typography-title>
      </template>
      <a-flex vertical align="center" :gap="24">
        <!--        avatarType 不是 image 时使用avatar预览-->
        <a-avatar :size="150"
                  :style="{background: resolveAvatarBackgroundColor(avatarColor, themeStore.getColorPrimary())}"
                  v-if="avatarType !== 'image'">
          <template v-if="avatarType === 'icon'" #icon>
            <component v-if="avatarIcon" :is="avatarIcon"/>
          </template>
          <template v-if="avatarType === 'text'">
            <span class="text-[60px]">
              {{ avatarText }}
            </span>
          </template>
        </a-avatar>
        <!--        avatarType 是 image 时使用cropper返回的html预览-->
        <div class="h-[150px] w-[150px] overflow-hidden rounded-full shadow-ant-ter" v-else v-html="avatarImg.html"/>
        <a-radio-group v-model:value="avatarType">
          <a-radio value="image">图片</a-radio>
          <a-radio value="icon">图标</a-radio>
          <a-radio value="text">文本</a-radio>
        </a-radio-group>
        <!--        颜色选取（allowCustom：尾部自定义取色器，hex 持久化落在背景色合法域内；记忆键与主题等场景隔离）-->
        <color-select v-model:color="avatarColor"
                      v-if="avatarType !== 'image'"
                      :dataSource="avatarBackgroundColor"
                      allowCustom
                      custom-color-storage-key="avatarBackgroundColor"
        />
        <!--        图标选取-->
        <icon-select v-if="avatarType === 'icon'" v-model="avatarIcon" :size="iconSize"/>
        <!--        文本编辑-->
        <a-input v-if="avatarType === 'text'" v-model:value="avatarText" class="max-w-[260px]" size="large" placeholder="请输入头像文本"/>
        <!--        头像编辑-->
        <image-cropper v-if="avatarType === 'image'"
                       :key="imageCropperWight"
                       ref="imageCropperRef"
                       v-model:realTime="avatarImg"
                       v-model:img="avatarUrl"
                       :wight="imageCropperWight + 'px'"
                       height="350px"
                       :auto-crop-width="150"
                       :auto-crop-height="150" />
      </a-flex>
      <template #footer>
        <a-button type="default" key="back" @click="close">关 闭</a-button>
        <a-button key="submit" type="primary" @click="handleOk">确 认</a-button>
      </template>
    </a-modal>
  </div>
</template>
<script setup lang="ts">
import {onMounted, onUnmounted, ref, useTemplateRef} from "vue";
import ColorSelect from "@/components/color-select/index.vue"
import IconSelect from "@/components/icon-select/index.vue"
import ImageCropper from "@/components/image-cropper/index.vue"
import type {CropperDataType} from "@/components/image-cropper/CropperType.ts";
import SysAvatar from "@/components/user-avatar/index.vue"
import {useUserStore} from "@/stores/user";
import {AVATAR_AUTO_BACKGROUND, resolveAvatarBackgroundColor} from "@/helpers/avatar.ts";
import {message} from "@/antd-adapter";
import settings from "@/settings";
import type {AvatarType} from "@/api/system/profile/type/sys-profile.ts";
import {cloneDeep, debounce} from 'lodash-es'
import {useThemeStore} from "@/stores/theme.ts";
import {ResponseError} from "@/api/global/type.ts";
import {uploadAttachment} from "@/api/system/attachment/attachment-storage.ts";
import {v4 as uuidv4} from "uuid";

const themeStore = useThemeStore()
const userStore = useUserStore()
// 双向绑定值
const props = defineProps(['modelValue'])
// 双向绑定修改方法
const emits = defineEmits(['update:modelValue','change'])

let updatedData: AvatarType = {
  type :'',
  backgroundColor :'',
  value :''
};

// 本组件创建的头像预览 blob URL：父组件经 v-model 共享持有，替换与还原时由此处统一释放
let ownPreviewUrl: string | undefined = undefined

const releaseOwnPreviewUrl = () => {
  if (ownPreviewUrl) {
    URL.revokeObjectURL(ownPreviewUrl)
    ownPreviewUrl = undefined
  }
}

// 控制modal开关
const open = ref<boolean>(false)
// 默认头像类型
const avatarType = ref<string>(props.modelValue.type)
// 默认头像背景颜色
const avatarColor = ref<string>(props.modelValue.backgroundColor)
// 图标选择尺寸
const iconSize = ref<'small' | 'large' | 'default'>('large')
// 图片裁剪宽度
const imageCropperWight = ref<number>(0)

// 图片地址
const avatarUrl = ref<string>(props.modelValue.url)
// 图标
const avatarIcon = ref<string>(props.modelValue.type === 'icon' ? props.modelValue.value : '')
// 文本
const avatarText = ref<string>(props.modelValue.type === 'text' ? props.modelValue.value : '')

// 图片预览返回结果
const avatarImg = ref<CropperDataType>({
  div: { height: "", width: "" },
  h: 0,
  html: "",
  img: { height: "", transform: "", width: "" },
  url: "",
  w: 0
})

// 头像背景颜色定义（displayColor：跟随系统项的渐变展示值，见 color-select 契约）
const avatarBackgroundColor = ref<Array<{name: string, color: string, displayColor?: string}>>(cloneDeep(settings.colorOptions))

// 颜色集合第一个添加为跟随系统颜色：持久化语义值 'auto'，渐变仅作色卡展示（displayColor）
avatarBackgroundColor.value.unshift({
  name: '跟随系统',
  color: AVATAR_AUTO_BACKGROUND,
  displayColor: 'conic-gradient(from 45deg, ' + settings.colorOptions.map(item => item.color).join(",") + ')'
})

// 处理窗口宽度 1050 / 680 / 492 划分图标选择器尺寸
const handleWindowWith = () => {
  const width = window.innerWidth

  if (width > 1050) {
    iconSize.value = 'large'
  } else if (width < 1050 && width > 680) {
    iconSize.value = 'default'
  } else {
    iconSize.value = 'small'
  }

  // 视口宽度 - dialog 外边距 - dialog 内边距
  if (width <= 1050) {
    imageCropperWight.value = width - 48 - 32
  } else {
    imageCropperWight.value = 954
  }
}

// 打开头像模态框：从当前头像还原编辑草稿（未确认的更改不跨开关保留；modal 内容随 destroy-on-hidden 销毁，草稿 ref 在 setup 层须显式重置）
const openModal = () => {
  avatarType.value = props.modelValue.type
  avatarColor.value = props.modelValue.backgroundColor
  avatarUrl.value = props.modelValue.url
  avatarIcon.value = props.modelValue.type === 'icon' ? props.modelValue.value : ''
  avatarText.value = props.modelValue.type === 'text' ? props.modelValue.value : ''
  avatarImg.value = {
    div: { height: "", width: "" },
    h: 0,
    html: "",
    img: { height: "", transform: "", width: "" },
    url: "",
    w: 0
  }
  open.value = true
}

handleWindowWith()

// 头像选择ref
const imageCropperRef = useTemplateRef<InstanceType<typeof ImageCropper>>("imageCropperRef")

/**
 * 处理确认数据
 */
const handleOk = async () => {
  try {
    switch (avatarType.value) {
      case "image": {
        const cropperInstance = imageCropperRef.value;
        if (!cropperInstance) {
          throw new Error('未找到裁剪器实例');
        }
        if (!avatarUrl.value) {
          throw new Error('请上传头像');
        }
        const blob = await cropperInstance.getBlob();

        if (!blob) {
          throw new Error('获取 blob 数据失败');
        }

        if (blob.size / 1024 / 1024 > 2) {
          throw new Error('头像不能超过 2MB');
        }

        // 头像属公开内容：public 由组件内生固定；引用存对象键（运行时由后端解析为可访问 URL 下发）
        const resp = await uploadAttachment(new File([blob],uuidv4() + ".png", { type: "image/png" }), {public: true, businessCode: "UserAvatar"});
        if (resp.code !== 200) {
          throw new Error(resp.msg);
        }
        // 释放上一次确认生成的预览 URL（父组件的持有值随本次 emits 同步替换）
        releaseOwnPreviewUrl()
        ownPreviewUrl = URL.createObjectURL(blob)
        updatedData = {
          url: ownPreviewUrl,
          value: resp.data.path,
          type: avatarType.value,
          backgroundColor: avatarColor.value
        };
        break;
      }
      case "icon":
      case "text": {
        updatedData = {
          value: avatarType.value === 'icon' ? avatarIcon.value : avatarText.value,
          type: avatarType.value,
          backgroundColor: avatarColor.value
        };
        break;
      }
      default:
        throw new Error('未知的头像类型');
    }

    if (updatedData.value) {
      // 双向绑定
      emits('update:modelValue', updatedData);
      // 删除临时url
      const cloneData = cloneDeep(updatedData);
      delete cloneData.url;
      // 触发change事件
      emits('change', JSON.stringify(cloneData));
      open.value = false;
    } else {
      if (avatarType.value === 'image') {
        message.warning("请上传头像")
      } else if (avatarType.value === 'text') {
        message.warning("请编辑文本")
      } else if (avatarType.value === 'icon') {
        message.warning("请选择图标")
      } else {
        message.warning("请将头像编辑完整")
      }

    }
  } catch (e) {
    if (e instanceof ResponseError) {
      message.error(e.msg)
    } else {
      message.error("处理头像异常-" + e)
      console.error('处理头像时出错:', e);
    }
  }
};

/**
 * 关闭modal并还原初始头像（放弃未确认的更改）
 */
const close = () => {
  emits('update:modelValue', userStore.avatar);
  // 还原后父组件不再持有预览 URL，释放本组件创建的 blob URL
  releaseOwnPreviewUrl()
  open.value = false;
};

// 拖动窗口防抖
const debounceChangeWith = debounce(handleWindowWith, 300)

// 组件创建完成后获取抽屉展开宽度
onMounted(() => {
  window.addEventListener('resize', debounceChangeWith)
})
// 组件销毁后删除监听（页面级卸载，父组件随之销毁，释放预览 URL 安全）
onUnmounted(() => {
  releaseOwnPreviewUrl()
  window.removeEventListener('resize', debounceChangeWith)
})

</script>

<style scoped>
/* 悬停出现的"编辑头像"遮罩浮层：伪元素 + content + 过渡，工具类表达不了；
   遮罩为固定深色蒙层（不随主题），其上文字与背景取固定值 */
.modify::after {
  content: "编辑头像";
  font-size: var(--ant-font-size-sm);
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  width: 64px;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  color: #eee;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
  border-radius: 50%;
  transition: opacity 0.2s ease;
  opacity: 0;
}

.modify:hover::after {
  opacity: 1;
}
</style>
