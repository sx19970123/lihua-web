import type {ConfigProviderProps} from 'antdv-next'
import type {ClickEffect} from "@/settings"

type WaveConfig = NonNullable<ConfigProviderProps['wave']>

// 在目标元素内创建圆点动画的承载层：内缩一个边框宽度避免溢出圆角、不拦截指针事件
function createHolder(node: HTMLElement) {
  const {borderWidth} = getComputedStyle(node)
  const borderWidthNum = Number.parseInt(borderWidth, 10)

  const div = document.createElement('div')
  div.style.position = 'absolute'
  div.style.inset = `-${borderWidthNum}px`
  div.style.borderRadius = 'inherit'
  div.style.background = 'transparent'
  div.style.zIndex = '999'
  div.style.pointerEvents = 'none'
  div.style.overflow = 'hidden'
  node.appendChild(div)

  return div
}

function createDot(holder: HTMLElement, color: string, left: number, top: number, size = 0) {
  const dot = document.createElement('div')
  dot.style.position = 'absolute'
  dot.style.left = `${left}px`
  dot.style.top = `${top}px`
  dot.style.width = `${size}px`
  dot.style.height = `${size}px`
  dot.style.borderRadius = '50%'
  dot.style.background = color
  dot.style.transform = 'translate3d(-50%, -50%, 0)'
  dot.style.transition = 'all 1s ease-out'
  holder.appendChild(dot)
  return dot
}

// 从点击位置扩散一个渐隐圆点，动画结束后清理承载层
const showDotEffect = (node: HTMLElement, event: MouseEvent, color: string, initialSize: number, finalSize: number) => {
  const holder = createHolder(node)
  const rect = holder.getBoundingClientRect()
  const dot = createDot(holder, color, event.clientX - rect.left, event.clientY - rect.top, initialSize)

  requestAnimationFrame(() => {
    dot.ontransitionend = () => {
      holder.remove()
    }
    dot.style.width = `${finalSize}px`
    dot.style.height = `${finalSize}px`
    dot.style.opacity = '0'
  })
}

const showInsetEffect: WaveConfig['showEffect'] = (node, {event}) => {
  showDotEffect(node, event, 'rgba(255, 255, 255, 0.65)', 0, 200)
}

const showShakeEffect: WaveConfig['showEffect'] = (node) => {
  // 连续点击时取消上一次未完成的抖动序列，避免两组帧循环争抢 transform
  const state = node as HTMLElement & { effectTimeout?: number }
  const seq = [0, -15, 15, -5, 5, 0]
  const framesPerStep = 10
  let steps = 0

  const loop = () => {
    cancelAnimationFrame(state.effectTimeout!)
    state.effectTimeout = requestAnimationFrame(() => {
      const currentStep = Math.floor(steps / framesPerStep)
      const current = seq[currentStep]
      const next = seq[currentStep + 1]

      if (current === undefined || next === undefined) {
        node.style.transform = ''
        node.style.transition = ''
        return
      }

      const angle = current + ((next - current) / framesPerStep) * (steps % framesPerStep)

      node.style.transform = `rotate(${angle}deg)`
      node.style.transition = 'none'

      steps += 1
      loop()
    })
  }

  loop()
}

// happy 档（快乐工作）由 @antdv-next/happy-work-theme 的 HappyProvider 作用域插槽提供官方 wave 配置，不经此映射
export const clickEffectWaveConfig: Record<Exclude<ClickEffect, 'happy'>, WaveConfig> = {
  none: {disabled: true},
  wave: {},
  inset: {showEffect: showInsetEffect},
  shake: {showEffect: showShakeEffect},
}
