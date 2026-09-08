<template>
  <div>
    <a-flex vertical :gap="8">
      <div class="m-auto" :style="{height, width: wight}" @wheel.passive="handleWheelPreviewSync">
        <vue-cropper ref="cropperRef"
                     :img="img"
                     :outputSize="outputSize"
                     :outputType="outputType"
                     :info="info"
                     :canScale="canScale"
                     :autoCrop="autoCrop"
                     :autoCropWidth="autoCropWidth"
                     :autoCropHeight="autoCropHeight"
                     :fixedBox="fixedBox"
                     :fixed="fixed"
                     :fixedNumber="fixedNumber"
                     :canMove="canMove"
                     :canMoveBox="canMoveBox"
                     :original="original"
                     :centerBox="centerBox"
                     :infoTrue="infoTrue"
                     :full="full"
                     :enlarge="enlarge"
                     :mode="mode"
                     @realTime="handleRealTime"
        >
        </vue-cropper>
      </div>
      <div>
        <a-flex :gap="8" justify="center" align="center">
          <!--          文件上传-->
          <a-upload
              :showUploadList="false"
              :max-count="1"
              :customRequest="handleCustomRequest"
              :beforeUpload="handleBeforeUpload"
          >
            <a-popover content="上传图片">
              <a-button type="primary" ghost> <upload-outlined/> 上 传</a-button>
            </a-popover>
          </a-upload>
          <!--          向左旋转-->
          <a-popover content="向左旋转">
            <a-button @click="rotateLeft"><UndoOutlined /></a-button>
          </a-popover>

          <!--          向右旋转-->
          <a-popover content="向右旋转">
            <a-button @click="rotateRight"><RedoOutlined /></a-button>
          </a-popover>
          <!--          放大-->
          <a-popover content="放大">
            <a-button @click="changeScale(1)"><PlusOutlined /></a-button>
          </a-popover>
          <!--          缩小-->
          <a-popover content="缩小">
            <a-button @click="changeScale(-1)"><MinusOutlined /></a-button>
          </a-popover>
          <!--          删除-->
          <a-popover content="删除">
            <a-button @click="deleteImg" danger><DeleteOutlined /></a-button>
          </a-popover>
        </a-flex>
      </div>
    </a-flex>

  </div>

</template>
<script setup lang="ts">
import {VueCropper} from "vue-cropper";
import 'vue-cropper/dist/index.css'
import {onUnmounted, ref, useTemplateRef} from 'vue';
import type {CropperDataType} from "@/components/image-cropper/CropperType.ts";
import {message, type UploadRequestOption} from "@/antd-adapter";

const cropperRef = useTemplateRef<InstanceType<typeof VueCropper>>("cropperRef")

// 接收的参数：
// img v-model:img 图片地址
// outputSize 裁剪生成图片的质量
// outputType 裁剪生成图片的格式 jpeg, png, webp
// info 裁剪框的大小信息
// canScale 图片是否允许滚轮缩放
// autoCrop 是否默认生成截图框
// autoCropWidth 默认生成截图框宽度
// autoCropHeight 默认生成截图框高度
// fixedBox 固定截图框大小 不允许改变
// fixed 是否开启截图框宽高固定比例
// fixedNumber 截图框的宽高比例 [ 宽度 , 高度 ]
// canMove 上传图片是否可以移动
// canMoveBox 截图框能否拖动
// original 上传图片按照原始比例渲染
// centerBox 截图框是否被限制在图片里面
// infoTrue true 为展示真实输出图片宽高 false 展示看到的截图框宽高
// full 是否输出原图比例的截图
// enlarge 图片根据截图框输出比例倍数
// mode 图片默认渲染方式 contain , cover, 100px, 100% auto
// wight 画布宽度（历史拼写，对外 API 不改）
// height 画布高度
// realTime v-model:realTime 实时裁剪数据
const {
  img: imgProp,
  outputSize = 1,
  outputType = 'png',
  info = true,
  canScale = true,
  autoCrop = true,
  autoCropWidth = 200,
  autoCropHeight = 200,
  fixedBox = true,
  fixed = true,
  // 内联字面量：defineProps 解构默认值不能引用 script setup 局部变量（编译器提升到 setup 外会报错）
  fixedNumber = [1, 1],
  canMove = true,
  canMoveBox = true,
  original = false,
  centerBox = true,
  infoTrue = true,
  full = false,
  enlarge = 1,
  mode = 'contain',
  wight = '350px',
  height = '350px',
  realTime
} = defineProps<{
  // v-model:img 图片地址
  img?: string,
  // 裁剪生成图片的质量
  outputSize?: number,
  // 裁剪生成图片的格式 jpeg, png, webp
  outputType?: string,
  // 裁剪框的大小信息
  info?: boolean,
  // 图片是否允许滚轮缩放
  canScale?: boolean,
  // 是否默认生成截图框
  autoCrop?: boolean,
  // 默认生成截图框宽度
  autoCropWidth?: number,
  // 默认生成截图框高度
  autoCropHeight?: number,
  // 固定截图框大小 不允许改变
  fixedBox?: boolean,
  // 是否开启截图框宽高固定比例
  fixed?: boolean,
  // 截图框的宽高比例 [ 宽度 , 高度 ]
  fixedNumber?: number[],
  // 上传图片是否可以移动
  canMove?: boolean,
  // 截图框能否拖动
  canMoveBox?: boolean,
  // 上传图片按照原始比例渲染
  original?: boolean,
  // 截图框是否被限制在图片里面
  centerBox?: boolean,
  // true 为展示真实输出图片宽高 false 展示看到的截图框宽高
  infoTrue?: boolean,
  // 是否输出原图比例的截图
  full?: boolean,
  // 图片根据截图框输出比例倍数
  enlarge?: number,
  // 图片默认渲染方式 contain , cover, 100px, 100% auto
  mode?: string,
  // 画布宽度（历史拼写，对外 API 不改）
  wight?: string,
  // 画布高度
  height?: string,
  // v-model:realTime 实时裁剪数据
  realTime?: CropperDataType
}>()

/**
 * 上传的图片
 */
const img = ref<string | null>(imgProp ?? null)
// 本组件创建的 blob URL；仅在该地址被替换/删除（父组件同步收到新值）时释放。
// 卸载时不释放：v-model:img 下父组件仍持有该地址，本组件可能因 key 变化重建并以它为初始值。
let ownObjectUrl: string | null = null

/**
 * 释放当前自建图片地址
 */
const revokeOwnObjectUrl = () => {
  if (ownObjectUrl) {
    URL.revokeObjectURL(ownObjectUrl)
    ownObjectUrl = null
  }
}
/**
 * 双向绑定
 */
const emit = defineEmits<{
  // v-model:realTime 实时裁剪数据
  'update:realTime': [data: CropperDataType],
  // v-model:img 图片地址（删除时为 null）
  'update:img': [img: string | null]
}>()
/**
 * 供父组件获取二进制文件
 */
defineExpose({
  getBlob: (): Promise<Blob> => {
    return new Promise<Blob>(resolve => {
      cropperRef.value.getCropBlob((data: Blob) => {
        resolve(data)
      })
    })
  }
})

/**
 * 变化裁剪框时回调
 * @param data
 */
const handleRealTime = (data: CropperDataType) => {
  emit('update:realTime',data)
}

// vue-cropper 的 showPreview 内置 16ms 节流且无尾帧补发：滚轮快速缩放时终态预览可能
// 恰好落在节流窗口内被丢弃，上方预览停在中间状态。滚轮停止后补一次预览同步（重调库实例方法重算 real-time）。
let previewSyncTimer: number | undefined

const handleWheelPreviewSync = () => {
  window.clearTimeout(previewSyncTimer)
  previewSyncTimer = window.setTimeout(() => {
    ;(cropperRef.value as unknown as { showPreview?: () => void })?.showPreview?.()
  }, 100)
}

onUnmounted(() => {
  window.clearTimeout(previewSyncTimer)
})

/**
 * 上传前校验数据格式
 * @param file
 */
const handleBeforeUpload = (file: File) => {
  if (!file.type.startsWith('image')) {
    message.warning("请上传图片类型文件")
    return false
  }
  return true
}

/**
 * 上传成功后显示到编辑框
 * @param uploadRequest
 */
const handleCustomRequest = (uploadRequest: UploadRequestOption) => {
  if (uploadRequest) {
    const file = uploadRequest.file
    if (file instanceof Blob) {
      revokeOwnObjectUrl()
      ownObjectUrl = URL.createObjectURL(file)
      img.value = ownObjectUrl
      emit('update:img', ownObjectUrl)
    } else {
      message.error("图片读取失败")
    }
  }

}

/**
 * 左旋转
 */
const rotateLeft = () => {
  cropperRef.value.rotateLeft();
}

/**
 * 右旋转
 */
const rotateRight = () => {
  cropperRef.value.rotateRight();
}

/**
 * 缩放
 * @param scale
 */
const changeScale = (scale: number) => {
  cropperRef.value.changeScale(scale);
}

/**
 * 删除
 */
const deleteImg = () => {
  revokeOwnObjectUrl()
  img.value = null
  emit('update:img', null)
}
</script>
