<template>
  <div>
    <!-- 展示 overview 和 detail 的容器-->
    <div class="z-1001"
         ref="containerRef"
         :style="style"
         @click="handleClickCard"
         @mouseover="handleMouseOverCard"
         @mouseleave="handleMouseLeaveCard"
    >
      <!-- 展示概述信息 -->
      <div v-if="showStatus === 'ready'">
        <slot name="overview"></slot>
      </div>
      <!-- 过渡时展示自定义封面 -->
      <div v-show="showStatus === 'activity' || showStatus === 'kill'"
           class="flex h-full w-full overflow-hidden">
<!--        使用了自定义过渡插槽-->
        <slot name="middle" v-if="hasMiddleSlot"/>
<!--        没使用自定义过渡，过渡时展示详情插槽-->
        <slot name="detail" v-else/>
      </div>
      <!-- 需要动态设置detail内的元素高度，所以需要保留detail的dom节点，所以showStatus === 'complete' 之前设置为全透明 -->
      <div v-show="showStatus === 'complete'" ref="detailRef" :style="{opacity: showStatus === 'complete' ? 1 : 0}">
        <slot name="detail"></slot>
      </div>
    </div>

    <!-- 占位元素，复刻slot:title，会随着页面视口变化而变化，返回动画参数从该组建中获取 -->
    <div v-if="showStatus !== 'ready'" class="opacity-0" ref="placeholderRef">
      <slot name="overview"></slot>
    </div>

    <!-- mask 打开时背景蒙版 -->
    <Mask :show-mask="showMask" @click="handleClose($event, 'mask')"/>
  </div>
</template>

<script setup lang="ts">
import Mask from "@/components/mask/index.vue"
import type {CSSProperties} from 'vue';
import {nextTick, onUnmounted, ref, useSlots, useTemplateRef, watch} from "vue";
import {hiddenOverflowY} from "@/utils/scrollbar.ts";

// ===== 用 Web Animations API 平行替换 gsap 的 to / fromTo =====
// 动画时长与缓动（gsap 平行替换值），收拢一处便于统调
const TRANSITION = {
  // 悬浮/缩放还原时长（原 gsap 0.1s）
  hover: 100,
  // 展开/关闭主动画时长（原 gsap 0.4s）
  expand: 400,
  // gsap power1.out（gsap 默认缓动）
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  // gsap power2.out
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
}

// 数值转 px 字符串
const px = (value?: number) => value === undefined ? undefined : value + 'px'

// 参与动画的 css 属性（gsap 的 scale 映射为 transform）
const ANIMATE_PROPS = ['width', 'height', 'left', 'right', 'top', 'opacity', 'transform'] as const

// 容器上最近一次未结束的动画，新动画开始前取消（对应 gsap 被 kill 后不再触发 onComplete）
let lastAnimation: Animation | null = null

type AnimateOptions = {
  duration: number
  ease?: string
  onStart?: () => void
  onComplete?: () => void
}

// 平行替换 gsap.fromTo：from 中未给出的属性从当前计算值起步（同 gsap 缺省行为）
const animateFromTo = (el: HTMLElement | null,
                       from: Record<string, string | number | undefined>,
                       to: Record<string, string | number | undefined>,
                       options: AnimateOptions) => {
  if (!el) return
  // 采样当前计算值（含进行中动画的当前帧），保证打断旧动画时从当前位置继续
  const computed = getComputedStyle(el)
  const fromKeyframe: Record<string, string> = {}
  for (const prop of ANIMATE_PROPS) {
    if (to[prop] === undefined) continue
    fromKeyframe[prop] = from[prop] === undefined ? computed[prop] : String(from[prop])
  }
  const toKeyframe: Record<string, string> = {}
  for (const key in to) {
    if (to[key] !== undefined) toKeyframe[key] = String(to[key])
  }
  lastAnimation?.cancel()
  const animation = el.animate([fromKeyframe, toKeyframe], {
    duration: options.duration,
    easing: options.ease ?? TRANSITION.easeOut,
  })
  lastAnimation = animation
  options.onStart?.()
  animation.onfinish = () => {
    // 动画结束后把终值留在内联样式上（对应 gsap 结束后内联样式残留，
    // windowWidthResize 直接写 style.width 依赖此行为）
    for (const key in toKeyframe) {
      el.style.setProperty(key, toKeyframe[key])
    }
    options.onComplete?.()
  }
}

// 平行替换 gsap.to：从元素当前状态动画到目标值
const animateTo = (el: HTMLElement | null,
                   to: Record<string, string | number | undefined>,
                   options: AnimateOptions) => {
  animateFromTo(el, {}, to, options)
}

// 是否使用具名插槽middle
const slots = useSlots();
const hasMiddleSlot = !!slots.middle
// 接受父组件参数
const props = defineProps({
  // 展开后的宽度
  expandedWidth: {
    type: Number,
    required: true
  },
  // 展开后的高度
  expandedHeight: {
    type: Number,
    required: true
  },
  // 展开后距离页面顶端像素
  expandedTop: {
    type: Number,
    default: 100
  },
  // 鼠标悬浮缩放倍率
  hoverScale: {
    type: Number,
    default: 1.05
  },
  // 自动完成，是否通过外部控制组件middle状态
  // 设置为 false 时，可通过外部参数控制 isComplete 进行内容显示
  // 比如异步调用时，在响应返回之前，可通过参数 将 isComplete 设置为false，这时当动画播放完成也不会显示展开后的内容
  autoComplete: {
    type: Boolean,
    default: true
  },
  // 当 autoComplete false 时，是用 isComplete 控制 middle 遮罩是否关闭
  isComplete: {
    type: Boolean
  },
  // 是否展示详情
  isDetailVisible: {
    type: Boolean,
    default: true
  },
  // 窗口缩小时的最小间距
  minWindowSpace: {
    type: Number,
    default: 16
  }
})

// 动画状态类型
type StatusType = 'ready' | 'activity' | 'complete' | 'kill'

// 定义向外抛出的函数
/**
 * cardClick          点击卡片触发（卡片就绪状态下点击卡片触发）
 * beforeCardExpand   卡片展开前触发（卡片就绪状态下点击卡片触发）
 * afterCardExpand    卡片展开前触后（卡片展开完成后触发）
 * beforeCardClose    卡片关闭前触发（卡片展开状态下触发关闭时触发）
 * afterCardClose     卡片关闭后触发（卡片关闭完成后触发）
 * onMouseEnter       鼠标移入卡片时触发
 * onMouseLeave       鼠标移出卡片时触发
 * */
const emits = defineEmits(['cardClick','beforeCardExpand','afterCardExpand','beforeCardClose','afterCardClose','onMouseEnter','onMouseLeave'])

// 初始化ref
const init = () => {
  // 占位元素的ref
  const placeholderRef = useTemplateRef<HTMLElement>("placeholderRef")
  // 容器元素ref
  const containerRef = useTemplateRef<HTMLElement>("containerRef")
  // 详情ref
  const detailRef = useTemplateRef<HTMLElement>("detailRef")

  // 展示的状态
  const showStatus = ref<StatusType>('ready')
  // 展开后改变css定位布局
  const style = ref<CSSProperties>({position: 'static'})
  // 展开后的高度
  const expandedHeight = ref<number>(props.expandedHeight)
  // 显示遮罩
  const showMask = ref<boolean>(false)
  // 关闭动画进行中标志，用于忽略重复的关闭请求，并阻止关闭中触发展开完成
  const closing = ref<boolean>(false)
  // 点击后缩放还原动画进行中标志——展开链挂在该动画的 onComplete 里，
  // 期间禁止启动会将其取消的动画（如鼠标移出触发的缩离动画）
  const expandPending = ref<boolean>(false)

  // 点击卡片
  const handleClickCard = () => {
    // 详情可见
    const detailVisible = showStatus.value === 'ready' && props.isDetailVisible
    // 卡片点击事件抛出
    emits('cardClick', detailVisible)

    // 只有就绪状态才可点击
    if (!detailVisible) {
      return
    }

    // 缩离动画进行中点击卡片：还原动画会取消缩离动画，其 onComplete 不再执行，
    // 在此同步补执行移出完成逻辑，保证 onMouseEnter/onMouseLeave 严格成对
    if (leavePending.value) {
      leavePending.value = false
      hoverStatus.value = 'ready'
      handleRemoveHoverStyle()
      emits('onMouseLeave')
    }

    // 即将执行动画前触发
    emits('beforeCardExpand')
    // 执行动画，先将缩放还原
    animateTo(containerRef.value, {
      transform: 'scale(1)',
    }, {
      duration: TRANSITION.hover,
      onStart: () => {
        // 缩放状态设置为进行中
        hoverStatus.value = 'activity'
        // 标记还原动画进行中，保护其 onComplete 里的展开链不被后续动画取消
        expandPending.value = true
      },
      // 缩放还原后再进行主要动画
      onComplete: () => {
        // 还原动画结束，展开链即将接管（主动画 onStart 会将 showStatus 置为 activity）
        expandPending.value = false
        // 还原完成后采集卡片布局位置作为展开起点——点击瞬间 hover 缩放仍在生效，
        // 此时 getBoundingClientRect 返回的是放大后的包围盒（起点会偏大 hoverScale 倍）
        const bounding = containerRef.value?.getBoundingClientRect()
        // container 设置为固定定位
        style.value = {position: 'fixed'}
        // 获取展开后参数（宽度按视口收缩并水平居中，高度按视口适配并计算 top）
        const {width, height, top, left: side} = getExpandLayout()
        // 为展开后高度赋值
        expandedHeight.value = height
        // 执行主要动画
        animateFromTo(containerRef.value, {
          width: px(bounding?.width),
          left: px(bounding?.left),
          right: px(bounding?.right),
          top:  px(bounding?.top),
          opacity: 0,
        },{
          left: px(side),
          right: px(side),
          top: px(top),
          width: px(width),
          height: px(height),
          opacity: 1,
        }, {
          duration: TRANSITION.expand,
          ease: TRANSITION.easeOutCubic,
          onStart: () => {
            // 打开遮罩
            showMask.value = true
            // 状态修改为进行时
            showStatus.value = 'activity'
          },
          onComplete: () => {
            // 动画播完 或 外部控制为已完成时展示内容
            // 仅在 activity 状态放行：kill 表示被关闭打断，complete 表示 watch 已处理过 isComplete，避免重复触发
            if ((props.autoComplete || props.isComplete) && showStatus.value === 'activity') {
              handleExpandComplete()
            }
          }
        })
      }
    })
  }

  // 监听键盘触发关闭
  const keydownClose = (event: KeyboardEvent | MouseEvent) => {
    handleClose(event, 'keydown')
  }

  // 关闭详情卡片
  const handleClose = (event: KeyboardEvent | MouseEvent, type: string) => {

    // 关闭状态的卡片无法被触发
    if (showStatus.value === 'ready') {
      return;
    }

    // 键盘触发后判断是不是 esc 键
    if (type === 'keydown' && event instanceof KeyboardEvent && event.key !== 'Escape') {
      return;
    }

    // 关闭动画进行中，忽略重复的关闭请求（连按 esc / esc 与点击蒙版几乎同时触发时，
    // 避免重启关闭动画与重复抛出 beforeCardClose）
    if (closing.value) {
      return;
    }

    // 动画播放完才可关闭
    if (showStatus.value !== 'complete') {
      showStatus.value = 'kill'
    }

    const bounding = placeholderRef.value?.getBoundingClientRect()
    // 执行主要动画
    animateTo(containerRef.value, {
      width: px(bounding?.width),
      height: px(bounding?.height),
      top: px(bounding?.top),
      left: px(bounding?.left),
    }, {
      duration: TRANSITION.expand,
      ease: TRANSITION.easeOutCubic,
      onStart: () => {
        // 标记关闭动画进行中
        closing.value = true
        // 状态修改为进行时
        if (showStatus.value !== 'kill') {
          showStatus.value = 'activity'
        }
        // 卡片关闭前触发
        emits('beforeCardClose')
        // 关闭遮罩
        showMask.value = false
      },
      onComplete: () => {
        // 关闭动画结束，解除关闭中标志
        closing.value = false
        // 兜底复位展开中标志，保证回到就绪态时各标志归零
        expandPending.value = false
        // 恢复 container 默认的静态布局，并清除展开动画残留的 right/opacity 内联样式
        style.value = {position: 'static', width: '', height: '', top: '', left: '', right: '', opacity: ''}
        // 动画执行完成后，状态修改为就绪
        showStatus.value = 'ready'
        hoverStatus.value = 'complete'
        // 卡片关闭动画完成后抛出
        emits('afterCardClose')
      }
    })
  }

  // 设置展开后详情元素的高度，并添加滚动条样式
  const setExpandHeight = (height: number) => {
    // 设置展开后插槽内元素的高度
    if (detailRef.value) {
      const firstChild = detailRef.value.firstElementChild as HTMLElement
      if (firstChild) {
        firstChild.classList.add('scrollbar')
        nextTick(() => firstChild.style.setProperty('height', height + 'px', 'important'))
      }
    }
  }

  // 处理展开完成
  const handleExpandComplete = () => {
    showStatus.value = 'complete'
    hoverStatus.value = 'complete'
    emits('afterCardExpand')
    setExpandHeight(expandedHeight.value)
  }

  return {
    showStatus,
    showMask,
    closing,
    expandPending,
    style,
    placeholderRef,
    containerRef,
    detailRef,
    keydownClose,
    handleClose,
    handleClickCard,
    handleExpandComplete
  }
}
const {showStatus, showMask, closing, expandPending, style, placeholderRef, containerRef, detailRef, keydownClose, handleClose, handleClickCard, handleExpandComplete} = init()


// 加载鼠标在卡片悬浮相关逻辑
const initHover = () => {
  // 缩放状态分为 ready就绪 activity活动中 complete已完成
  const hoverStatus = ref<StatusType>('ready')
  // 缩离动画进行中标志——缩离动画被移入动画/点击还原动画取消时，其 onComplete
  // （hoverStatus 复位、移除 hover 样式、抛出 onMouseLeave）不会再执行，
  // 由取消方同步补执行该逻辑，保证 onMouseEnter/onMouseLeave 严格成对
  const leavePending = ref<boolean>(false)
  // 鼠标悬浮于卡片
  const handleMouseOverCard = () => {
    // 动画在下面三种状态时，不会触发卡片悬浮
    if (showStatus.value === 'activity' || showStatus.value === 'kill' || showStatus.value === 'complete') {
      return
    }

    if (hoverStatus.value === 'ready' || hoverStatus.value === 'complete') {
      // 缩离动画进行中再次移入：移入动画会取消缩离动画，其 onComplete（含 onMouseLeave 抛出）
      // 不再执行——在此同步补执行移出完成逻辑，保证 onMouseEnter/onMouseLeave 严格成对
      if (leavePending.value) {
        leavePending.value = false
        hoverStatus.value = 'ready'
        handleRemoveHoverStyle()
        emits('onMouseLeave')
      }
      animateTo(containerRef.value, {
        transform: `scale(${props.hoverScale})`,
      }, {
        duration: TRANSITION.hover,
        onStart: () => {
          // 鼠标悬浮时抛出方法
          emits('onMouseEnter')
          handleAddHoverStyle()
          hoverStatus.value = 'activity'
        },
        onComplete: () => {
          hoverStatus.value = 'complete'
        }
      })
    }
  }
  // 鼠标从卡片移出
  const handleMouseLeaveCard = () => {
    if (showStatus.value === 'ready') {
      // 点击后的缩放还原动画正在奔向 scale(1)——不可再启动缩离动画，那会取消还原动画、
      // 中断其 onComplete 里的展开链；还原动画的终点即移出想要的视觉结果，这里仅同步完成移出逻辑
      // （hoverStatus 保持 activity，防止窗口期内 mouseover 再次取消还原动画）
      if (expandPending.value) {
        handleRemoveHoverStyle()
        emits('onMouseLeave')
        return
      }
      animateTo(containerRef.value, {
        transform: 'scale(1)',
      }, {
        duration: TRANSITION.hover,
        onStart: () => {
          // 标记缩离动画进行中（若被移入动画/点击还原动画取消，由对方同步补执行完成逻辑）
          leavePending.value = true
        },
        onComplete: () => {
          leavePending.value = false
          hoverStatus.value = 'ready'
          handleRemoveHoverStyle()
          // 鼠标悬浮结束后抛出
          emits('onMouseLeave')
        }
      })
    }
  }
  // 添加 hover 样式
  // 缩放大于1才添加缩放样式
  const handleAddHoverStyle = () => {
    if (props.hoverScale > 1) {
      style.value.cursor = 'pointer'
      style.value.boxShadow = 'var(--ant-box-shadow-tertiary)'
      style.value.borderRadius = 'var(--ant-border-radius-lg)'
    }
  }
  // 移除 hover 样式
  const handleRemoveHoverStyle = () => {
    style.value.cursor = ''
    style.value.boxShadow = ''
    style.value.borderRadius = ''
  }
  return {
    hoverStatus,
    leavePending,
    handleMouseOverCard,
    handleMouseLeaveCard,
    handleRemoveHoverStyle
  }
}

const {hoverStatus, leavePending, handleMouseOverCard, handleMouseLeaveCard, handleRemoveHoverStyle } = initHover()

// 依据当前视口（实时读取，无需缓存）与 props 计算展开后的完整布局（展开时与窗口 resize 共用同一份适配规则）
// 宽度：视口容不下（展开宽度 + 两侧最小间距）时按视口收缩，之后水平居中（收缩时居中即为最小间距）
// 高度：设定高度 + top 超出视口（扣除上下最小间距）时优先压缩 top 垂直居中，仍放不下则 top 压到最小值并按视口收缩高度
const getExpandLayout = () => {
  const minWindowSpace = props.minWindowSpace
  const viewWidth = window.innerWidth
  const viewHeight = window.innerHeight
  const width = props.expandedWidth > viewWidth - minWindowSpace * 2
      ? viewWidth - minWindowSpace * 2
      : props.expandedWidth
  const left = viewWidth / 2 - width / 2
  let height = props.expandedHeight
  let top = props.expandedTop
  if (height + top > viewHeight - minWindowSpace * 2) {
    if (height < viewHeight - minWindowSpace * 2) {
      top = (viewHeight - height) / 2
    } else {
      top = minWindowSpace
      height = viewHeight - minWindowSpace * 2
    }
  }
  return {width, height, top, left}
}

// 全局监听按需挂载：keydown（esc 关闭）仅在非就绪态需要，resize（重定位展开中的卡片）仅在展开态需要，
// 就绪态不挂任何全局监听——首页多卡片实例平时零监听开销；随展开/关闭的状态流转自动挂载与卸载
watch(showStatus, (status, previous) => {
  if (status === 'complete') {
    window.addEventListener('resize', windowWidthResize)
  } else if (previous === 'complete') {
    window.removeEventListener('resize', windowWidthResize)
  }
  if (status === 'ready') {
    window.removeEventListener('keydown', keydownClose)
  } else if (previous === 'ready') {
    window.addEventListener('keydown', keydownClose)
  }
})

// 卸载组件前删除监听函数（防御性移除，未挂载时为 no-op）
onUnmounted(() => {
  window.removeEventListener('resize', windowWidthResize)
  window.removeEventListener("keydown", keydownClose);
  // 取消进行中的动画，避免动画结束后向已卸载组件抛出事件
  lastAnimation?.cancel()
  // 取消尚未执行的 resize 处理
  if (resizeRafId !== null) {
    cancelAnimationFrame(resizeRafId)
  }
})

// 窗口变化后重新设置展开卡片布局
// resize 事件在拖拽窗口时高频触发，通过 rAF 合并为每帧最多计算一次；
// 布局由 getExpandLayout 纯计算得出（无 DOM 读取），读写不再交错触发强制重排
let resizeRafId: number | null = null
const windowWidthResize = () => {
  if (resizeRafId !== null) {
    return
  }
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = null
    if (showStatus.value !== 'complete' || !containerRef.value) {
      return
    }
    // 展开状态下若 resize 引发页面回流出现滚动条，补充隐藏（Mask 打开时已隐藏过一次，此处幂等）
    hiddenOverflowY()
    const {width, height, top, left} = getExpandLayout()
    style.value.left = left + 'px'
    style.value.top = top + 'px'
    containerRef.value.style.width = width + 'px'
    const firstChild = detailRef.value?.firstElementChild as HTMLElement | null
    if (firstChild) {
      firstChild.style.height = height + 'px'
    }
  })
}

// 监听 isComplete 变化，当 autoComplete 为 false 时，isComplete 为true 改变 showStatus 状态
watch(() => props.isComplete, (value) => {
  // 关闭动画进行中不处理（异步响应在关闭期间到达时直接忽略，关闭完成后由外部重置 isComplete）
  if (!props.autoComplete && props.isDetailVisible && !closing.value && showStatus.value === 'activity' && value) {
    handleExpandComplete()
  }
})
</script>
