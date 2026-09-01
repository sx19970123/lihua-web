<template>
  <div>
    <!-- 展示 overview 和 detail 的容器；表面（圆角/阴影/边框/底色）由组件常驻提供，overflow-hidden 裁切内容 -->
    <!-- 整卡可点：role=button + 键盘展开（Enter/Space）；展开态退出 tab 序（此时容器是承载 detail 的覆盖层，不再是按钮） -->
    <div class="z-1001 overflow-hidden"
         ref="containerRef"
         role="button"
         :tabindex="showStatus === 'ready' ? 0 : -1"
         :aria-expanded="showStatus !== 'ready'"
         :style="style"
         @click="handleClickCard"
         @keydown="handleKeydownCard"
         @focus="handleFocusCard"
         @blur="handleBlurCard"
         @mouseenter="handleMouseEnterCard"
         @mouseleave="handleMouseLeaveCard"
    >
      <!-- overview 层：ready 态在流内撑起卡片自然尺寸；展开期钉源排版尺寸、关闭期重钉占位尺寸 + 缩放飞行 -->
      <div ref="overviewRef"
           class="transition-opacity"
           :style="overviewStyle">
        <slot name="overview"></slot>
      </div>
      <!-- detail 层：过渡期挂载，按最终尺寸渲染（显式宽高），被容器裁切，与 overview 相交渐变 -->
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

    <!-- 占位元素，复刻slot:overview，会随着页面视口变化而变化，返回动画参数从该组件中获取 -->
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
  // 非弹簧动画的默认缓动
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
    duration: 200,
    // 交接滑块：动画时间比例上的交接点，展开/关闭各自独立可调（弹簧前快后慢，1/5 时间 ≈ 一半行程）
    // 0 = 从头就是目标层；1 = 坚持到动画结束
    // 关闭方向受"淡完才卸载"钳制（见 handleClose），配置值过晚时自动贴到最晚可完整渐变位置
    handoverExpand: 0.2,
    handoverClose: 0.2,
  },
}

// 数值转 px 字符串
const px = (value?: number) => value === undefined ? undefined : value + 'px'

// 组件表面：圆角 + 阴影 + 边框 + 底色，ready/飞行/落定全程常驻，零交接。
// 契约：插槽内容只管满铺背景与排版，不写圆角/边框/阴影（写了展示异常自负）。
// 边框用 outline：不占布局盒，宽高动画不因 1px 边框错位，且跟随圆角
const SURFACE: CSSProperties = {
  backgroundColor: 'var(--ant-color-bg-container)',
  borderRadius: 'var(--ant-border-radius-lg)',
  outline: '1px solid var(--ant-color-border-secondary)',
  outlineOffset: '-1px',
  boxShadow: 'var(--ant-box-shadow-tertiary)',
}

// 参与动画的 css 属性（gsap 的 scale 映射为 transform）
const ANIMATE_PROPS = ['width', 'height', 'left', 'right', 'top', 'opacity', 'transform'] as const

// 进行中的动画集合（容器主动画 + 内容层 zoom 动画），新飞行开始前全部取消
// （对应 gsap 被 kill 后不再触发 onComplete；zoom 随容器一并取消，打断时由新飞行从计算值续跑）
let activeAnimations: Animation[] = []
const cancelActiveAnimations = () => {
  activeAnimations.forEach(animation => animation.cancel())
  activeAnimations = []
}

type AnimateOptions = {
  duration?: number
  ease?: string
  // 使用弹簧采样关键帧（急起步长尾滑行），时长/曲线取 TRANSITION.spring，忽略 duration/ease
  spring?: boolean
  onStart?: () => void
  onComplete?: () => void
}

// 阻尼弹簧进度序列（半隐式欧拉数值解，0→1，末项精确 1）——
// 容器布局帧与内容 zoom 帧共用同一序列 + 同 duration/linear，实现逐帧自同步
const springProgress = (): number[] => {
  const {duration, stiffness, damping, mass, frames} = TRANSITION.spring
  const step = duration / frames / 1000
  let progress = 0
  let velocity = 0
  const result: number[] = []
  for (let i = 0; i <= frames; i++) {
    // 末项强制精确 1，消除积分残差（弹簧参数与 duration 配套时此处已收敛，无可见跳变）
    result.push(i === frames ? 1 : progress)
    // 目标位移 1：加速度 = (-刚度·(x-1) - 阻尼·v) / 质量
    const force = (-stiffness * (progress - 1) - damping * velocity) / mass
    velocity += force * step
    progress += velocity * step
  }
  return result
}

// 弹簧数值关键帧：把 from→to 的数值插值（px 字符串 / 纯数字）沿进度序列铺成 linear 关键帧
// ——WAAPI 无原生弹簧，采样关键帧是标准做法；打断时同样从计算值重新起步，采样天然支持
// 仅插值纯数值属性（px 字符串 / opacity），transform 等非数值属性不参与
const springFrames = (fromKeyframe: Record<string, string>, toKeyframe: Record<string, string>): Record<string, string>[] => {
  const props = Object.keys(toKeyframe)
      .map(key => ({key, start: parseFloat(fromKeyframe[key]), end: parseFloat(toKeyframe[key]), unit: toKeyframe[key].replace(/^-?[\d.]+/, '')}))
      .filter(prop => Number.isFinite(prop.start) && Number.isFinite(prop.end))
      .map(prop => ({...prop, delta: prop.end - prop.start}))
  return springProgress().map(current => {
    const frame: Record<string, string> = {}
    for (const prop of props) {
      const value = prop.start + prop.delta * current
      frame[prop.key] = prop.unit ? value + prop.unit : String(value)
    }
    return frame
  })
}

// 平行替换 gsap.fromTo：from 中未给出的属性从当前计算值起步（同 gsap 缺省行为）
const animateFromTo = (el: HTMLElement | null,
                       from: Record<string, string | number | undefined>,
                       to: Record<string, string | number | undefined>,
                       options: AnimateOptions): Animation | null => {
  if (!el) return null
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
  cancelActiveAnimations()
  // 弹簧路径：采样出的 linear 关键帧（值序列即曲线）；普通路径：首末两帧 + 缓动
  const useSpring = options.spring === true
  const animation = el.animate(
      useSpring ? springFrames(fromKeyframe, toKeyframe) : [fromKeyframe, toKeyframe],
      {
        duration: useSpring ? TRANSITION.spring.duration : (options.duration ?? 0),
        easing: useSpring ? 'linear' : (options.ease ?? TRANSITION.easeOut),
      }
  )
  activeAnimations.push(animation)
  options.onStart?.()
  animation.onfinish = () => {
    // 动画结束后把终值留在内联样式上（对应 gsap 结束后内联样式残留，
    // windowWidthResize 直接写 style.width 依赖此行为）
    for (const key in toKeyframe) {
      el.style.setProperty(key, toKeyframe[key])
    }
    options.onComplete?.()
  }
  return animation
}

// 平行替换 gsap.to：从元素当前状态动画到目标值
const animateTo = (el: HTMLElement | null,
                   to: Record<string, string | number | undefined>,
                   options: AnimateOptions): Animation | null => {
  return animateFromTo(el, {}, to, options)
}

// 内容层非等比缩放飞行：transform scale(sx, sy) 关键帧，与容器主动画共用弹簧进度序列
// sx/sy 各自沿进度仿射插值——与容器宽/高的仿射插值逐帧等价（层排版尺寸 × scale ≡ 容器尺寸），
// 内容横纵独立拉伸填满容器（旧版拉伸感来源）；transform-origin: 0 0
// 已知代价（用户知情选择）：transform 走合成器栅格缓存，大倍率纵向缩放存在中段重采样闪烁风险（旧会话 index_8 雷区）
// radius 为反补偿圆角：transform 会连带缩放 border-radius，每帧本地弧度取 R/sx、R/sy（x/y 分轴），
// 被该帧缩放一乘后视觉弧度恒等于容器圆角——插槽内容按契约为方角满铺背景，
// 圆角完全由本层裁切承担，内容圆角的缩放漂移不再露底
const transformFlight = (el: HTMLElement | null, sx0: number, sx1: number, sy0: number, sy1: number, radius: number) => {
  if (!el) return
  const frames = springProgress().map(progress => {
    const sx = sx0 + (sx1 - sx0) * progress
    const sy = sy0 + (sy1 - sy0) * progress
    return {
      transform: `scale(${sx}, ${sy})`,
      borderRadius: `${radius / sx}px / ${radius / sy}px`,
    }
  })
  const animation = el.animate(frames, {duration: TRANSITION.spring.duration, easing: 'linear'})
  // 落定把终值矩阵与反补偿半径留在内联样式上持有（不写 'none'、不提前 cancel——避免落定重栅格跳变）
  animation.onfinish = () => {
    el.style.transform = `scale(${sx1}, ${sy1})`
    el.style.borderRadius = `${radius / sx1}px / ${radius / sy1}px`
  }
  activeAnimations.push(animation)
}

// 读取元素当前 transform 的横纵缩放分量（打断续跑/关闭续降的起点；无变换时为 1）
const computedScale = (el: HTMLElement | null): {sx: number, sy: number} => {
  if (!el) return {sx: 1, sy: 1}
  const matrix = new DOMMatrix(getComputedStyle(el).transform)
  return {sx: matrix.a, sy: matrix.d}
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
  // overview 过渡期贴合方式：'three' 三面贴合（等比缩放，宽比驱动，底部按比例留白，适合内容卡片，默认）；
  // 'four' 四面贴合（非等比拉伸填满容器，适合整面纯色/渐变背景的卡片）
  overviewFit: {
    type: String,
    default: 'three'
  },
  // 自动完成：展开动画结束后是否直接显示 detail
  // 设置为 false 时走异步等待：动画播完停在 activity 态、居中播放 spin，
  // 由外部通过 isComplete 控制内容显示（如异步响应返回后置 true）
  autoComplete: {
    type: Boolean,
    default: true
  },
  // 当 autoComplete 为 false 时，isComplete 置 true 触发 spin 渐隐、detail 渐显（即关闭 loading）；
  // 关闭后应由外部在 afterCardClose 中复位为 false，供下一轮展开复用
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
 * */
const emits = defineEmits(['cardClick','beforeCardExpand','afterCardExpand','beforeCardClose','afterCardClose'])

// 初始化ref
const init = () => {
  // 占位元素的ref
  const placeholderRef = useTemplateRef<HTMLElement>("placeholderRef")
  // 容器元素ref
  const containerRef = useTemplateRef<HTMLElement>("containerRef")
  // overview 层元素ref（zoom 飞行目标）
  const overviewRef = useTemplateRef<HTMLElement>("overviewRef")
  // 详情ref
  const detailRef = useTemplateRef<HTMLElement>("detailRef")

  // 展示的状态
  const showStatus = ref<StatusType>('ready')
  // 展开后改变css定位布局（表面由 SURFACE 常驻提供；height:100% 建立"根被拉伸场景"的高度链，
  // 父级高度 auto 时百分比回退 auto，对未拉伸的消费方无影响）
  const style = ref<CSSProperties>({position: 'static', ...SURFACE, height: '100%'})
  // 显示遮罩
  const showMask = ref<boolean>(false)
  // 关闭动画进行中标志，用于忽略重复的关闭请求，并阻止关闭中触发展开完成
  const closing = ref<boolean>(false)
  // overview 层样式：ready 态无定位（流内）；过渡期绝对定位 + 实测宽高 + 相交渐变透明度
  const overviewStyle = ref<CSSProperties>({})
  // detail 层样式：显式最终宽度（内容按最终尺寸渲染）+ 相交渐变透明度
  const detailStyle = ref<CSSProperties>({})
  // 异步等待层样式（透明度渐变）
  const spinStyle = ref<CSSProperties>({opacity: 0})
  // detail 关闭飞行的分母基准（缩放计算：内容视觉尺寸 = 排版尺寸 × scale；展开时随最终尺寸赋值，resize 时重同步）
  let flightFinalW = 0
  let flightFinalH = 0
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
  // 关闭方向交接：detail/spin → overview（重钉后的 overview 飞行像素即最终排版，直接淡入）
  const fadeCloseHandover = () => {
    overviewStyle.value = {...overviewStyle.value, opacity: 1}
    detailStyle.value = {...detailStyle.value, opacity: 0}
    spinStyle.value = {...spinStyle.value, opacity: 0}
  }
  // 各层复位（关闭完成回到 ready 态，detail/spin 层随 v-if 卸载；overview 常驻，须手动清落定持有的 transform）
  const resetLayers = () => {
    overviewStyle.value = {}
    detailStyle.value = {}
    spinStyle.value = {opacity: 0}
    if (overviewRef.value) {
      overviewRef.value.style.transform = ''
      overviewRef.value.style.borderRadius = ''
    }
    if (detailRef.value) {
      detailRef.value.style.transform = ''
      detailRef.value.style.borderRadius = ''
    }
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

    // 即将执行动画前触发
    emits('beforeCardExpand')
    // 采集卡片布局位置作为展开起点（无 hover 缩放，实测即精确布局盒）
    const bounding = containerRef.value?.getBoundingClientRect()
    // container 设置为固定定位；表面常驻（SURFACE），飞行悬浮态升一档阴影；
    // 不整体淡入——起飞本身无缝，且容器级淡入会淹没交接处的层间交叉淡化
    style.value = {
      position: 'fixed',
      ...SURFACE,
      boxShadow: 'var(--ant-box-shadow-secondary)',
    }
    // 获取展开后参数（宽度按视口收缩并水平居中，高度按视口适配并计算 top）
    const {width, height, top, left: side} = getExpandLayout()
    // 源排版尺寸（computed 布局值）——overview 钉宽高与缩放基准
    const srcW = containerRef.value ? parseFloat(getComputedStyle(containerRef.value).width) : 0
    const srcH = containerRef.value ? parseFloat(getComputedStyle(containerRef.value).height) : 0
    flightFinalW = width
    flightFinalH = height
    // 起飞视觉尺寸（bounding 实测）
    const takeoffW = bounding?.width ?? srcW
    const takeoffH = bounding?.height ?? srcH
    // overview 层钉源排版尺寸转为绝对定位（零重排）；detail 层以最终尺寸挂载（零重排）；
    // 两层均以 transform-origin 0 0 做缩放，视觉尺寸逐帧等于容器尺寸（几何逐帧重合）。
    // 层带 overflow 裁切 + 每帧反补偿圆角（见 transformFlight）——插槽内容按契约为方角满铺背景，
    // 圆角完全由层裁切承担，弧度逐帧贴合容器，内容圆角的缩放漂移不再露底
    overviewStyle.value = {
      position: 'absolute', top: '0', left: '0',
      width: px(srcW), height: px(srcH),
      transformOrigin: '0 0',
      overflow: 'hidden',
      opacity: 1,
      transitionDuration: TRANSITION.fade.duration + 'ms',
    }
    detailStyle.value = {
      width: px(width), height: px(height),
      transformOrigin: '0 0',
      overflow: 'hidden',
      opacity: 0,
      transitionDuration: TRANSITION.fade.duration + 'ms',
    }
    // spin 层无缩放，圆角直接取容器同款变量
    spinStyle.value = {opacity: 0, borderRadius: 'var(--ant-border-radius-lg)', transitionDuration: TRANSITION.fade.duration + 'ms'}
    // 执行主要动画（无整体淡入——层间交叉淡化是唯一的渐变，保持可感知）
    animateFromTo(containerRef.value, {
      width: px(bounding?.width),
      left: px(bounding?.left),
      right: px(bounding?.right),
      top:  px(bounding?.top),
    },{
      left: px(side),
      right: px(side),
      top: px(top),
      width: px(width),
      height: px(height),
    }, {
      spring: true,
      onStart: () => {
        // 打开遮罩
        showMask.value = true
        // 状态修改为进行时
        showStatus.value = 'activity'
        // detail 层由 v-if 在本次状态变更后的微任务中挂载，nextTick 后才可操作其元素
        nextTick(() => {
          // 内容按最终高度渲染（从动画第一帧起即最终布局，文本零重排）
          setExpandHeight(height)
          // 容器圆角（此时 patch 已完成，var 解析为 px）——反补偿基准弧度
          const radius = containerRef.value ? (parseFloat(getComputedStyle(containerRef.value).borderRadius) || 8) : 8
          // 内容层缩放飞行：与容器主动画同帧启动、同一弹簧进度序列逐帧同步
          // overview 三面贴合：等比缩放（宽比驱动），底部按比例留白由容器表面兜底；
          // overview 四面贴合：非等比拉伸填满；detail 恒为四面贴合
          if (props.overviewFit === 'four') {
            transformFlight(overviewRef.value, takeoffW / srcW, width / srcW, takeoffH / srcH, height / srcH, radius)
          } else {
            const scaleFrom = takeoffW / srcW
            const scaleTo = width / srcW
            transformFlight(overviewRef.value, scaleFrom, scaleTo, scaleFrom, scaleTo, radius)
          }
          transformFlight(detailRef.value, takeoffW / width, 1, takeoffH / height, 1, radius)
        })
        // 交接滑块：展开动画时间 handoverExpand 处 overview → detail/spin 相交渐变
        handoverTimer = window.setTimeout(fadeExpandHandover, TRANSITION.fade.handoverExpand * TRANSITION.spring.duration)
      },
      onComplete: () => {
        // 展开完成：仅在 activity 状态放行（kill=被关闭打断，complete=watch 已处理过 isComplete）
        if ((props.autoComplete || props.isComplete) && showStatus.value === 'activity') {
          handleExpandComplete()
        }
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
    // 采样 detail 当前缩放分量作为续降起点——须在 animateTo 取消旧动画之前读取
    // （kill 打断的飞行中值自然衔接）
    const detailScaleNow = computedScale(detailRef.value)
    // 容器当前盒与占位盒同帧采样：overview 重钉后的飞行起点 = 前者 ÷ 后者（与 animateTo 的 from 值同一基准）
    const box = containerRef.value?.getBoundingClientRect()
    // 容器圆角（inline 的 var 已解析为 px）——反补偿基准；与上面三个读取同批完成，
    // 避免与后续样式直写交错、多付一次强制回流
    const closeRadius = containerRef.value ? (parseFloat(getComputedStyle(containerRef.value).borderRadius) || 8) : 8
    // overview 重钉成占位当前尺寸：内容按最终排版重排（complete 态它 opacity 0，跳变被交接时序遮住；
    // kill 态占位尚未变动，重钉前后同布局，起点比例恰为当前视觉，同样无缝）。
    // 终态即自然态：飞行落点恒为 scale(1,1)，落定帧与回流像素重合、复位零跳变——
    // onfinish 写回的终值就是自然态，落点残留无从谈起
    let overviewSx0 = 0
    let overviewSy0 = 0
    if (bounding && bounding.width > 0 && bounding.height > 0 && box && box.width > 0 && box.height > 0) {
      overviewSx0 = box.width / bounding.width
      overviewSy0 = props.overviewFit === 'four' ? box.height / bounding.height : overviewSx0
      overviewStyle.value = {...overviewStyle.value, width: px(bounding.width), height: px(bounding.height)}
      if (overviewRef.value) {
        // 起始 transform 先行内持位（transformFlight 首帧即刻接管）
        overviewRef.value.style.transform = props.overviewFit === 'four'
            ? `scale(${overviewSx0}, ${overviewSy0})`
            : `scale(${overviewSx0})`
      }
    }
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
        // 内容层缩放续降（与容器同序列逐帧同步）：overview 自容器当前盒缩向占位盒，
        // 终态即自然态 scale(1,1)（three 等比宽比驱动 / four 逐轴贴合）；detail 恒四面贴合
        if (overviewRef.value && overviewSx0 > 0) {
          if (props.overviewFit === 'four') {
            transformFlight(overviewRef.value, overviewSx0, 1, overviewSy0, 1, closeRadius)
          } else {
            transformFlight(overviewRef.value, overviewSx0, 1, overviewSx0, 1, closeRadius)
          }
        }
        if (flightFinalW > 0 && flightFinalH > 0) {
          transformFlight(detailRef.value, detailScaleNow.sx, (bounding?.width ?? flightFinalW) / flightFinalW,
              detailScaleNow.sy, (bounding?.height ?? flightFinalH) / flightFinalH, closeRadius)
        }
        // 打断展开：清除尚未触发的展开交接，改为关闭方向交接——handoverClose 独立配置，
        // 并钳制不晚于「动画结束前能完成渐变」的最晚位置：动画结束时 detail 恰好淡尽，
        // v-if 卸载发生在全透明态（无亮度跳变、无驻留窗口、复位零延迟）
        clearHandoverTimer()
        const closeHandoverAt = Math.max(0, Math.min(TRANSITION.fade.handoverClose,
            (TRANSITION.spring.duration - TRANSITION.fade.duration) / TRANSITION.spring.duration))
        handoverTimer = window.setTimeout(fadeCloseHandover, closeHandoverAt * TRANSITION.spring.duration)
      },
      onComplete: () => {
        // 关闭动画结束，解除关闭中标志
        closing.value = false
        // 恢复 container 默认的静态布局；表面与高度链由模板对象重申
        style.value = {position: 'static', ...SURFACE, height: '100%'}
        // 容器飞行终值（width/height/top/left/right）由 animateFromTo 的 onfinish 直写内联，
        // :style 整体替换只回收绑定过的键、管不到这些直写值，须手动清空——
        // 否则 ready 态卡片被钉死在关闭落点宽度，不再跟随窗口重排
        if (containerRef.value) {
          for (const key of ['width', 'height', 'left', 'top', 'right']) {
            containerRef.value.style.setProperty(key, '')
          }
        }
        // 各层复位：overview 回流内接管（落定帧像素与回流一致，零跳变），detail/spin 层随 v-if 卸载（交接点已钳制，此刻 detail 已淡尽）
        resetLayers()
        clearHandoverTimer()
        // 动画执行完成后，状态修改为就绪
        showStatus.value = 'ready'
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

  // 展开（complete）态下按当前视口整体重同步展开布局——幂等：
  // 容器四值 + detail 层钉扎 + detail 关闭飞行分母（flightFinalW/H）一次刷新，
  // 消除 resize 后"层还钉着展开时刻旧尺寸"的贴边/内容不复原
  // 仅 complete 态生效：ready 无展开态可同步，activity/kill 飞行中的值由打断续跑机制接管
  // （overview 层无需同步：complete 态 opacity 0 不可见，关闭起点由"容器盒÷占位盒"当帧重算）
  const syncExpandedLayout = () => {
    if (showStatus.value !== 'complete' || !containerRef.value) {
      return
    }
    const {width, height, top, left} = getExpandLayout()
    // 容器四值：left/top 走 style 绑定；width/height 直写
    // （complete 态绑定对象无 height 键，直写不与 Vue patch 冲突，关闭复位时由模板对象重申）
    style.value.left = left + 'px'
    style.value.top = top + 'px'
    containerRef.value.style.width = width + 'px'
    containerRef.value.style.height = height + 'px'
    // detail 层重钉宽高（spread 保留 opacity/transformOrigin/overflow/transitionDuration），
    // firstChild 高度直写——普通赋值整体替换 setExpandHeight 的 !important 声明，有效
    detailStyle.value = {...detailStyle.value, width: px(width), height: px(height)}
    const firstChild = detailRef.value?.firstElementChild as HTMLElement | null
    if (firstChild) {
      firstChild.style.height = height + 'px'
    }
    // detail 关闭飞行的分母基准刷新为新布局值
    flightFinalW = width
    flightFinalH = height
  }

  // 处理展开完成
  const handleExpandComplete = () => {
    showStatus.value = 'complete'
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
    style,
    overviewStyle,
    detailStyle,
    spinStyle,
    placeholderRef,
    containerRef,
    overviewRef,
    detailRef,
    keydownClose,
    handleClose,
    handleClickCard,
    handleExpandComplete,
    syncExpandedLayout
  }
}
const {showStatus, showMask, closing, style, overviewStyle, detailStyle, spinStyle, placeholderRef, containerRef, overviewRef, detailRef, keydownClose, handleClose, handleClickCard, handleExpandComplete, syncExpandedLayout} = init()


// 悬停反馈：无缩放、无状态机——仅阴影升档 + 指针（mouseenter 不冒泡，进出各触发一次）
const handleMouseEnterCard = () => {
  style.value.cursor = 'pointer'
  style.value.boxShadow = 'var(--ant-box-shadow-secondary)'
}
const handleMouseLeaveCard = () => {
  style.value.cursor = ''
  style.value.boxShadow = 'var(--ant-box-shadow-tertiary)'
}

// 键盘展开：div 加 role=button 浏览器不会自动合成 click，Enter/Space 手动触发
// （Space 阻止默认滚动）；展开后焦点仍留容器上，Esc（window 级 keydownClose）关闭后可再次触发
const handleKeydownCard = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }
  event.preventDefault()
  handleClickCard()
}

// 键盘焦点环：SURFACE 的边框是内联 outline，优先级高于 UA 样式表的 :focus 默认描边，
// 焦点环会被边框吞掉——:focus-visible 命中时临时换成 2px 主题色描边，失焦从 SURFACE 恢复；
// 只对键盘聚焦生效（鼠标点击获得的焦点不画环），展开/关闭时 style 整体替换自动回到边框态
const handleFocusCard = (event: FocusEvent) => {
  if (!(event.target instanceof HTMLElement) || !event.target.matches(':focus-visible')) {
    return
  }
  style.value.outline = '2px solid var(--ant-color-primary)'
  style.value.outlineOffset = '0'
}
const handleBlurCard = () => {
  style.value.outline = SURFACE.outline
  style.value.outlineOffset = SURFACE.outlineOffset
}

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
  // 取消进行中的全部动画（容器 + zoom），避免动画结束后向已卸载组件抛出事件
  cancelActiveAnimations()
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
    syncExpandedLayout()
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
