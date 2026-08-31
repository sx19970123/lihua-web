<template>
  <div>
    <!-- 展示 overview 和 detail 的容器；overflow-hidden 使过渡期对最终尺寸的 detail 呈"揭示"效果 -->
    <div class="z-1001 overflow-hidden"
         ref="containerRef"
         :style="style"
         @click="handleClickCard"
         @mouseover="handleMouseOverCard"
         @mouseleave="handleMouseLeaveCard"
    >
      <!-- overview 层：ready 态在流内撑起卡片自然尺寸；过渡期转为绝对定位拉伸铺满，充当 middle 时内容不带外部边框/阴影 -->
      <div class="transition-opacity"
           :class="showStatus === 'ready' ? '' : 'as-middle'"
           :style="overviewStyle">
        <slot name="overview"></slot>
      </div>
      <!-- detail 层：过渡期挂载，按最终尺寸渲染（显式宽度），被容器裁切，与 overview 相交渐变 -->
      <div v-if="showStatus !== 'ready'"
           ref="detailRef"
           class="absolute top-0 left-0 transition-opacity"
           :style="detailStyle">
        <slot name="detail"></slot>
      </div>
      <!-- 异步等待层：autoComplete=false 且数据未就绪时居中播放 spin，完成后渐隐换 detail -->
      <div v-if="showStatus !== 'ready' && !autoComplete"
           class="absolute inset-0 flex items-center justify-center bg-[var(--ant-color-bg-container)] transition-opacity"
           :style="spinStyle">
        <a-spin size="large"/>
      </div>
    </div>

    <!-- 占位元素，复刻slot:overview，会随着页面视口变化而变化，返回动画参数从该组建中获取 -->
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
import {nextTick, onUnmounted, ref, useTemplateRef, watch} from "vue";
import {hiddenOverflowY} from "@/utils/scrollbar.ts";

// ===== 用 Web Animations API 实现的动画时长与曲线，收拢一处便于统调 =====
const TRANSITION = {
  // 悬浮/缩放还原时长
  hover: 100,
  // 悬浮缓动
  easeOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  // 主动画弹簧参数（iPad 小组件展开手感：果断飞出、长尾滑行、无回弹）
  // 当前为临界阻尼（damping = 2√(stiffness·mass)）→ 无过冲的最快收敛曲线
  // 飞出感不够 → 升 stiffness（damping 按 2√(stiffness·mass) 同步调，duration 随收敛点缩短）
  // 想要回弹 → damping 降到 2√(stiffness·mass) 以下
  // duration 需与刚度/阻尼配套（弹簧约在该时长内收敛，末帧强制精确终值）
  spring: {
    duration: 340,
    stiffness: 800,
    damping: 57,
    mass: 1,
    // 采样帧数（duration/frames ≈ 每 8.5ms 一帧，linear 插值平滑）
    frames: 40,
  },
  // 过渡期内容交接（overview ↔ detail/spin 相交渐变）
  fade: {
    duration: 150,
    // 交接滑块：动画进度上的交接点。0 = detail 从头充当 middle（揭示式，零重排）；
    // 1 = overview 坚持到动画结束（拉伸铺满，文本会重排，旧 middle 观感）；中间值 = 该进度点交接。
    // 关闭方向镜像（1 - handover）
    handover: 1,
  },
}

// 数值转 px 字符串
const px = (value?: number) => value === undefined ? undefined : value + 'px'

// 参与动画的 css 属性（gsap 的 scale 映射为 transform）
const ANIMATE_PROPS = ['width', 'height', 'left', 'right', 'top', 'opacity', 'transform'] as const

// 容器上最近一次未结束的动画，新动画开始前取消（对应 gsap 被 kill 后不再触发 onComplete）
let lastAnimation: Animation | null = null

type AnimateOptions = {
  duration?: number
  ease?: string
  // 使用弹簧采样关键帧（急起步长尾滑行），时长/曲线取 TRANSITION.spring，忽略 duration/ease
  spring?: boolean
  onStart?: () => void
  onComplete?: () => void
}

// 阻尼弹簧采样：数值解（半隐式欧拉）推进进度 0→1，把 from→to 的数值插值铺成 linear 关键帧
// ——WAAPI 无原生弹簧，采样关键帧是标准做法；打断时同样从计算值重新起步，采样天然支持
// 仅插值纯数值属性（px 字符串 / opacity），transform 等非数值属性不参与
const springFrames = (fromKeyframe: Record<string, string>, toKeyframe: Record<string, string>): Record<string, string>[] => {
  const {duration, stiffness, damping, mass, frames} = TRANSITION.spring
  const step = duration / frames / 1000
  const props = Object.keys(toKeyframe)
      .map(key => ({key, start: parseFloat(fromKeyframe[key]), end: parseFloat(toKeyframe[key]), unit: toKeyframe[key].replace(/^-?[\d.]+/, '')}))
      .filter(prop => Number.isFinite(prop.start) && Number.isFinite(prop.end))
      .map(prop => ({...prop, delta: prop.end - prop.start}))
  let progress = 0
  let velocity = 0
  const result: Record<string, string>[] = []
  for (let i = 0; i <= frames; i++) {
    // 末帧强制精确终值，消除积分残差（弹簧参数与 duration 配套时此处已收敛，无可见跳变）
    const current = i === frames ? 1 : progress
    const frame: Record<string, string> = {}
    for (const prop of props) {
      const value = prop.start + prop.delta * current
      frame[prop.key] = prop.unit ? value + prop.unit : String(value)
    }
    result.push(frame)
    // 目标位移 1：加速度 = (-刚度·(x-1) - 阻尼·v) / 质量
    const force = (-stiffness * (progress - 1) - damping * velocity) / mass
    velocity += force * step
    progress += velocity * step
  }
  return result
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
  // 弹簧路径：采样出的 linear 关键帧（值序列即曲线）；普通路径：首末两帧 + 缓动
  const useSpring = options.spring === true
  const animation = el.animate(
      useSpring ? springFrames(fromKeyframe, toKeyframe) : [fromKeyframe, toKeyframe],
      {
        duration: useSpring ? TRANSITION.spring.duration : (options.duration ?? TRANSITION.hover),
        easing: useSpring ? 'linear' : (options.ease ?? TRANSITION.easeOut),
      }
  )
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
  // 显示遮罩
  const showMask = ref<boolean>(false)
  // 关闭动画进行中标志，用于忽略重复的关闭请求，并阻止关闭中触发展开完成
  const closing = ref<boolean>(false)
  // 点击后缩放还原动画进行中标志——展开链挂在该动画的 onComplete 里，
  // 期间禁止启动会将其取消的动画（如鼠标移出触发的缩离动画）
  const expandPending = ref<boolean>(false)

  // overview 层样式：ready 态无定位（流内）；过渡期绝对定位 + 实测宽高 + 相交渐变透明度
  const overviewStyle = ref<CSSProperties>({})
  // detail 层样式：显式最终宽度（内容按最终尺寸渲染）+ 相交渐变透明度
  const detailStyle = ref<CSSProperties>({})
  // 异步等待层样式（透明度渐变）
  const spinStyle = ref<CSSProperties>({opacity: 0})
  // 交接定时器（展开/关闭共用，新调度覆盖旧调度）
  let handoverTimer: number | null = null
  // 展开方向交接：overview → detail（数据已就绪）/ spin（异步等待中）
  const fadeExpandHandover = () => {
    overviewStyle.value = {...overviewStyle.value, opacity: 0}
    if (props.autoComplete || props.isComplete) {
      detailStyle.value = {...detailStyle.value, opacity: 1}
    } else {
      spinStyle.value = {...spinStyle.value, opacity: 1}
    }
  }
  // 关闭方向交接：detail/spin → overview
  const fadeCloseHandover = () => {
    overviewStyle.value = {...overviewStyle.value, opacity: 1}
    detailStyle.value = {...detailStyle.value, opacity: 0}
    spinStyle.value = {...spinStyle.value, opacity: 0}
  }
  // 各层复位（关闭完成回到 ready 态，detail/spin 层随 v-if 卸载）
  const resetLayers = () => {
    overviewStyle.value = {}
    detailStyle.value = {}
    spinStyle.value = {opacity: 0}
  }
  const clearHandoverTimer = () => {
    if (handoverTimer !== null) {
      clearTimeout(handoverTimer)
      handoverTimer = null
    }
  }
  // 卸载时清除未触发的交接定时器
  onUnmounted(clearHandoverTimer)

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
        // container 设置为固定定位；过渡期提供卡片表面（与 detail 的 a-card 同底色），
        // 否则展开中的容器是透明的，"展开"过程不可见，只剩 overview 跟随容器左上角平移
        style.value = {
          position: 'fixed',
          backgroundColor: 'var(--ant-color-bg-container)',
          borderRadius: 'var(--ant-border-radius-lg)',
        }
        // 获取展开后参数（宽度按视口收缩并水平居中，高度按视口适配并计算 top）
        const {width, height, top, left: side} = getExpandLayout()
        // overview 层转为拉伸铺满（随容器长大，旧 middle 观感，宽向文本会重排）；
        // detail 层以最终宽度挂载，揭示式渲染（零重排，被容器裁切）
        overviewStyle.value = {
          position: 'absolute', top: '0', left: '0',
          width: '100%', height: '100%',
          opacity: 1,
          transitionDuration: TRANSITION.fade.duration + 'ms',
        }
        detailStyle.value = {
          width: px(width), opacity: 0,
          transitionDuration: TRANSITION.fade.duration + 'ms',
        }
        spinStyle.value = {opacity: 0, transitionDuration: TRANSITION.fade.duration + 'ms'}
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
          spring: true,
          onStart: () => {
            // 打开遮罩
            showMask.value = true
            // 状态修改为进行时
            showStatus.value = 'activity'
            // 内容按最终高度渲染（揭示式要求从动画第一帧起即最终布局，文本零重排）
            // detail 层由 v-if 在本次状态变更后的微任务中挂载，须等 nextTick 才能取到 firstChild
            nextTick(() => setExpandHeight(height))
            // 交接滑块：动画进度 handover 处 overview → detail/spin（t=0 即刻交接，渐变被容器淡入掩盖）
            handoverTimer = window.setTimeout(fadeExpandHandover, TRANSITION.fade.handover * TRANSITION.spring.duration)
          },
          onComplete: () => {
            // 展开完成：仅在 activity 状态放行（kill=被关闭打断，complete=watch 已处理过 isComplete）
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
      spring: true,
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
        // 打断展开：清除尚未触发的展开交接，改为关闭方向交接（镜像 1 - handover）
        clearHandoverTimer()
        handoverTimer = window.setTimeout(fadeCloseHandover, (1 - TRANSITION.fade.handover) * TRANSITION.spring.duration)
      },
      onComplete: () => {
        // 关闭动画结束，解除关闭中标志
        closing.value = false
        // 兜底复位展开中标志，保证回到就绪态时各标志归零
        expandPending.value = false
        // 恢复 container 默认的静态布局，并清除展开动画残留的内联样式（含过渡期卡片表面）
        style.value = {position: 'static', width: '', height: '', top: '', left: '', right: '', opacity: '', backgroundColor: '', borderRadius: ''}
        // 各层复位：overview 回流内瞬间接管（同旧版 v-show 切换时机），detail/spin 层随 v-if 卸载
        resetLayers()
        clearHandoverTimer()
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
    // 动画结束/数据就绪时切换内容：overview/spin 渐隐，detail 渐显
    overviewStyle.value = {...overviewStyle.value, opacity: 0}
    spinStyle.value = {...spinStyle.value, opacity: 0}
    detailStyle.value = {...detailStyle.value, opacity: 1}
  }

  return {
    showStatus,
    showMask,
    closing,
    expandPending,
    style,
    overviewStyle,
    detailStyle,
    spinStyle,
    placeholderRef,
    containerRef,
    detailRef,
    keydownClose,
    handleClose,
    handleClickCard,
    handleExpandComplete
  }
}
const {showStatus, showMask, closing, expandPending, style, overviewStyle, detailStyle, spinStyle, placeholderRef, containerRef, detailRef, keydownClose, handleClose, handleClickCard, handleExpandComplete} = init()


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

<style scoped>
/* overview 充当 middle 时去掉内容自带的外部边框/阴影（旧 middle 无边框特点）；
   双写类名抬高优先级以压过 .ant-card:not(.ant-card-bordered) 的根级 boxShadowTertiary；
   圆角由容器 border-radius + overflow-hidden 裁切承担 */
.as-middle :deep(.ant-card.ant-card) {
  border: none;
  box-shadow: none;
}
</style>
