<template>
  <div>
    <!--  锁屏按钮  -->
    <a-tooltip title="锁定屏幕" placement="bottom" :get-popup-container="(triggerNode: HTMLElement) => triggerNode.parentNode">
      <a-button type="text" @click="preLock">
        <template #icon>
          <LockOutlined class="icon-default-color"/>
        </template>
      </a-button>
    </a-tooltip>

    <!--  锁屏  -->
    <Teleport v-if="openLock" to="body">
      <div class="unselectable">
        <!--  锁屏页面  -->
        <div class="lihua-lock-mask fixed top-0 left-0 h-screen w-screen z-[2147483647] bg-[var(--lihua-backdrop-filter-on-color)] rounded-ant-lg shadow-ant-secondary" ref="lockMaskRef" :style="{ transform: `translateY(calc(${startLocation} + ${offsetY + breatheOffsetY}px))`}">
          <div class="text-center">
            <!-- 日期时间 -->
            <transition name="lock-layout-fade" mode="out-in">
              <div class="mt-[64px]" v-if="!isCompactLockedLayout">
                <a-typography-title :level="3"> {{nowDate}} {{nowWeek}}</a-typography-title>
                <a-typography-title :styles="{root: {fontSize: '100px', marginTop: 0}}"> {{nowTime}} </a-typography-title>
              </div>
            </transition>

            <!-- 用户头像 ｜ 昵称 ｜ 密码框 -->
            <transition name="lock-layout-fade" mode="out-in">
              <a-flex
                  vertical
                  gap="8"
                  :key="isCompactLockedLayout"
                  class="absolute bottom-[64px] w-screen"
                  :class="{ 'user-compact': isCompactLockedLayout }"
                  align="center"
                  v-if="status === 'locked'"
              >
                <user-avatar
                    :value="userStore.avatar.value"
                    :type="userStore.avatar.type"
                    :url="userStore.avatar.url"
                    :background-color="userStore.avatar.backgroundColor"
                    :size="60"
                />

                <a-typography-title :level="4">
                  {{userStore.userInfo.nickname}}
                </a-typography-title>

                <a-form-item class="form-item-single-line" name="password" :validate-status="formStatus.status" :help="formStatus.msg">
                  <a-input class="pwd" :class="{shake: startShake}"
                           v-model:value="password"
                           placeholder="请输入锁屏密码"
                           type="password"
                           @change="handleInputChange"
                           @pressEnter="submitPassword"
                  >
                    <template #suffix>
                      <a-button type="text" size="small" shape="circle" @click="submitPassword">
                        <template #icon>
                          <RightCircleOutlined class="input-prefix-icon-color"/>
                        </template>
                      </a-button>
                    </template>
                  </a-input>
                </a-form-item>

                <a-button type="text" size="small" @click="handleLogout">
                  <a-typography-text type="secondary">返回登录</a-typography-text>
                </a-button>
              </a-flex>
            </transition>

            <!-- 提示 -->
            <div class="absolute bottom-4 w-screen">
              <a-typography-text type="secondary">
                <transition name="fast-fade" mode="out-in">
                  <div v-if="status === 'reset'">
                    <DoubleRightOutlined style="transform: rotate(90deg);"/>
                    向下滑动锁定
                  </div>
                  <div v-else-if="status === 'close'">
                    <UnlockOutlined /> 取消锁屏
                  </div>
                  <div v-else-if="status === 'lockable'">
                    <LockOutlined /> 锁定屏幕
                  </div>
                </transition>
              </a-typography-text>
            </div>
          </div>
        </div>

        <!--  锁屏下隐藏背景，点击时退出锁屏  -->
        <div class="fixed top-0 left-0 h-screen w-screen z-[2147483646] bg-[var(--lihua-alpha-0)]" @click="unlock"/>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, useTemplateRef} from "vue";
import UserAvatar from "@/components/user-avatar/index.vue";
import {useUserStore} from "@/stores/user.ts";
import dayjs from "dayjs";
import {useRouter} from "vue-router";
import {
  checkPassword,
  getLockKey,
  getLockScreenInfo,
  isLocked,
  screenLock,
  screenLogout,
  screenUnlock
} from "@/helpers/lock-screen.ts";
import {message} from "@/antd-adapter";
import {throttle} from 'lodash-es'
import {disableOverflowY, enableOverflowY} from "@/utils/scrollbar.ts";

const userStore = useUserStore();
const router = useRouter()

// 启始锁屏位置
const startLocation = '-50vh'

const nowDate = ref<string>()
const nowWeek = ref<string>()
const nowTime = ref<string>()

// 锁屏高度阈值，vh小于此阈值将不显示锁屏时间信息
const lockCompactThreshold = 550
const viewportHeight = ref(0)
const isCompactLockedLayout = computed(() => viewportHeight.value < lockCompactThreshold)

// 鼠标按下
const mouseDown = ref(false)
// Y轴移动距离
const offsetY = ref(0)
// 预锁屏呼吸位移
const breatheOffsetY = ref(0)
// 是否打开锁屏页面
const openLock = ref<boolean>(false)
// 锁屏元素
const lockMaskRef = useTemplateRef<HTMLDivElement>("lockMaskRef")
// 锁屏状态，关闭锁屏、重置锁屏、可锁屏、已锁屏
const status = ref<'close' | 'reset' | 'lockable' | 'locked' | 'autoLock'>('reset')

let rafId: number | null = null
let latestClientY = 0
let breatheRafId: number | null = null
let breatheStartTime = 0

// 开始的坐标
let startY = 0
// 偏移的坐标
let startOffset = 0

// 点击进入预锁屏状态
const preLock = () => {
  const lockScreen = getLockScreenInfo();
  if (!(lockScreen && lockScreen.password)) {
    enableOverflowY()
    message.error("请先在个人中心配置锁屏密码")
    router.push({path: "/profile", query: {tab: "LockScreen"}})
    return;
  }

  disableOverflowY()
  openLock.value = true
  nextTick(() => {
    const element = lockMaskRef.value
    // 播放动画
    const animation = element?.animate(
        [
          { transform: 'translateY(-100vh)' },
          { transform: `translateY(${startLocation})` }
        ],
        { duration: 500, easing: 'ease', fill: 'forwards' }
    )

    animation?.finished.then(() => {
      // 鼠标按下
      element?.addEventListener("pointerdown", moveStart)
      // 鼠标抬起
      window.addEventListener("pointerup", moveEnd)
      // 鼠标滑动
      window?.addEventListener("pointermove", moving)
      // 预锁屏呼吸效果
      startBreathing()

      animation?.cancel()
    })
  })
}

// 开启预锁屏呼吸效果
const startBreathing = () => {
  if (breatheRafId !== null || status.value !== 'reset' || mouseDown.value) {
    return
  }

  setTimeout(() => {
    // 上下均匀呼吸：振幅 16px，完整周期 6s
    const amplitude = 16
    const period = 6000
    breatheStartTime = performance.now()

    const frame = (time: number) => {
      if (status.value !== 'reset' || mouseDown.value) {
        breatheRafId = null
        return
      }

      const progress = ((time - breatheStartTime) % period) / period
      breatheOffsetY.value = Math.sin(progress * Math.PI * 2) * amplitude
      breatheRafId = requestAnimationFrame(frame)
    }

    breatheRafId = requestAnimationFrame(frame)
  }, 500)
}

// 停止预锁屏呼吸效果
const stopBreathing = (mergeCurrentOffset = false) => {
  if (breatheRafId !== null) {
    cancelAnimationFrame(breatheRafId)
    breatheRafId = null
  }

  if (mergeCurrentOffset) {
    offsetY.value += breatheOffsetY.value
  }
  breatheOffsetY.value = 0
}

// 从当前位置回到预锁屏状态
const resetPreLock = () => {
  stopBreathing()
  const element = lockMaskRef.value
  // 播放关闭动画
  const animation = element?.animate(
      [
        { transform: `translateY(calc(${startLocation} + ${offsetY.value}px))` },
        { transform: `translateY(${startLocation})` }
      ],
      { duration: 300, easing: 'ease', fill: 'forwards' }
  )

  // 动画结束后执行清除操作
  animation?.finished.finally(() => {
    // 初始化数据
    clear()
    startBreathing()
    animation?.cancel()
  })
}

// 解锁
const unlock = () => {
  stopBreathing()
  enableOverflowY()
  const element = lockMaskRef.value
  // 播放关闭动画，关闭时移动到-120vh位置，防止快速滑动时阴影闪现
  const animation = element?.animate(
      [
        { transform: `translateY(calc(${startLocation} + ${offsetY.value}px))` },
        { transform: 'translateY(-120vh)' }
      ],
      { duration: 400, easing: 'ease', fill: 'forwards' }
  )

  // 动画结束后执行清除操作
  animation?.finished.finally(() => {
    screenUnlock()
    clear()
    animation?.cancel()
    openLock.value = false
  })
}

// 锁屏
const lock = () => {
  stopBreathing()
  disableOverflowY()
  const element = lockMaskRef.value
  // 播放关闭动画
  const animate = element?.animate(
      [
        { transform: `translateY(calc(${startLocation} + ${offsetY.value}px))` },
        { transform: 'translateY(0)' }
      ],
      { duration: 300, easing: 'ease', fill: 'forwards' }
  )
  animate?.finished.finally(() => {
    // 清除监听
    element?.removeEventListener("pointerdown", moveStart)
    window.removeEventListener("pointerup", moveEnd)
    window?.removeEventListener("pointermove", moving)

    status.value = 'locked'
    screenLock()
  })
}

// 检查锁定
const checkLock = () => {
  if (isLocked()) {
    autoLock()
  }
}

// 自动锁定
const autoLock = () => {
  // 已经在锁定状态下无需再次触发
  if (openLock.value) {
    return
  }

  status.value = 'autoLock'
  openLock.value = true
  nextTick(() => lock())
}

// 同步上锁解锁
const syncLock = () => {
  window.addEventListener('storage', (e) => {
    if (e.key !== getLockKey()) return

    // 锁定
    if (e.newValue === 'locked') {
      autoLock()
    }

    // 解锁
    if (e.newValue === 'unlocked') {
      unlock()
    }

    // 登出
    if (e.newValue === 'logout') {
      handleLogout()
    }
  })
}

// 清理数据
const clear = () => {
  startY = 0
  startOffset = 0
  offsetY.value = 0
  breatheOffsetY.value = 0
  status.value = 'reset'
}

// 开始拖动
const moveStart = (e: MouseEvent) => {
  mouseDown.value = true
  stopBreathing(true)
  startY = e.clientY
  startOffset = offsetY.value
}

// 结束拖动
const moveEnd = () => {
  mouseDown.value = false

  if (rafId !== null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }

  if (status.value === 'close') {
    unlock()
  } else if (status.value === 'reset') {
    resetPreLock()
  } else {
    lock()
  }
}

// 拖动中
const moving = (e: MouseEvent) => {
  if (!mouseDown.value || status.value === 'locked') return

  // 记录最新鼠标位置
  latestClientY = e.clientY

  // 如果当前帧还没执行
  if (rafId !== null) return

  rafId = requestAnimationFrame(() => {
    rafId = null

    const innerHeight = window.innerHeight

    // 计算拖动距离
    const moveY = latestClientY - startY
    const newOffset = startOffset + moveY

    // 限制拖动范围
    const maxOffset = innerHeight / 2
    const offset = Math.min(newOffset, maxOffset)

    // 更新位置
    offsetY.value = offset

    // 计算当前比例
    const value = (offset + innerHeight / 2) / innerHeight

    // 更新状态
    if (value < 0.3) {
      status.value = 'close'
    } else if (value < 0.7) {
      status.value = 'reset'
    } else {
      status.value = 'lockable'
    }
  })
}

/**
 * 初始化检查密码相关
 */
const initCheckPassword = () => {
  // 密码
  const password = ref<string>()
  // 表单状态
  const formStatus = ref<{status?: 'success' | 'error', msg?: string}>({})
  // 错误抖动
  const startShake = ref<boolean>(false)

  // 提交解锁
  const submitPassword = () => {

    // 必填检验
    if (!handleInputChange()) {
      return;
    }

    // 检查密码
    const checked = checkPassword(password.value)

    // 密码错误
    if (!checked) {
      formStatus.value.status = 'error';
      formStatus.value.msg = '密码错误';
      setTimeout(() => startShake.value = true)
      return
    }

    // 密码正确
    password.value = ''
    formStatus.value.status = 'success';
    formStatus.value.msg = undefined;

    unlock()
  }

  // 密码校验
  const handleInputChange = () => {
    startShake.value = false

    // 必填校验
    if (!password.value) {
      formStatus.value.status = 'error';
      formStatus.value.msg = '请输入密码';
      setTimeout(() => startShake.value = true)
      return false
    } else {
      formStatus.value.status = 'success';
      formStatus.value.msg = undefined;
      return true
    }
  }

  // 退出登录
  const handleLogout = async () => {
    userStore.handleLogout().finally(() => {
      screenLogout()
      unlock()
      router.push('/authentication')
    })
  }

  return {
    password,
    formStatus,
    startShake,
    submitPassword,
    handleInputChange,
    handleLogout
  }
}

const {password, formStatus, startShake, submitPassword, handleInputChange, handleLogout} = initCheckPassword()

/**
 * 初始化显示时间
 */
const initTime = () => {
  const now = dayjs()
  nowDate.value = now.format('MM月DD日')
  nowWeek.value = now.format('dddd')
  nowTime.value = now.format('HH:mm')
}

/**
 * 初始化自动锁定
 */
const initAutoLock = () => {
  // 上次活动时间
  let lastActiveTime = Date.now()
  // 自动锁定超时时间
  let autoLockTimeout: number | undefined
  // 是否启用了自动锁屏
  let enableAutoLock = false
  // 扫描超时计时器
  let scanActiveTimeInterval: ReturnType<typeof setInterval> | undefined

  // 监听鼠标、键盘事件
  const handleAutoLock = () => {
    const lockScreenInfo = getLockScreenInfo()
    // 判断是否设置了自动锁定
    if (lockScreenInfo && lockScreenInfo.autoLock && lockScreenInfo.timeout > 0) {
      enableAutoLock = true
      autoLockTimeout = lockScreenInfo.timeout
      window.addEventListener('keydown', updateActiveTime)
      window.addEventListener('mousemove', updateActiveTime)
      window.addEventListener('mousedown', updateActiveTime)
      window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          lastActiveTime = Date.now()
        }
      })
      scanActiveTime()
    }
  }

  // 刷新自动锁定配置
  const refreshAutoLockConfig = () => {
    const lockScreenInfo = getLockScreenInfo()
    if (!lockScreenInfo?.autoLock) {
      enableAutoLock = false
      clearAutoLock()
      autoLockTimeout = undefined
    } else {
      if (enableAutoLock) {
        autoLockTimeout = lockScreenInfo.timeout
      } else {
        handleAutoLock()
      }

    }
  }

  // 记录活动时间
  const updateActiveTime = throttle(() => {
    lastActiveTime = Date.now()
  }, 3000)

  // 扫描活动时间
  const scanActiveTime = () => {
    // 存在计时器则不重复创建
    if (scanActiveTimeInterval) {
      return
    }

    scanActiveTimeInterval = setInterval(() => {
      const diffMinutes = (Date.now() - lastActiveTime) / 60000
      if (autoLockTimeout !== undefined && diffMinutes >= autoLockTimeout) {
        autoLock()
      }
    }, 20000)
  }

  // 清除监听
  const clearAutoLock = () => {
    enableAutoLock = false
    window.removeEventListener('keydown', updateActiveTime)
    window.removeEventListener('mousemove', updateActiveTime)
    window.removeEventListener('mousedown', updateActiveTime)
    if (scanActiveTimeInterval) {
      clearInterval(scanActiveTimeInterval)
      scanActiveTimeInterval = undefined
    }
  }

  return {
    handleAutoLock,
    clearAutoLock,
    refreshAutoLockConfig
  }
}

const {handleAutoLock, clearAutoLock, refreshAutoLockConfig} = initAutoLock()

const updateViewportHeight = () => {
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  updateViewportHeight()
  window.addEventListener('resize', updateViewportHeight)

  // 获取当前时间
  initTime()
  // 10秒刷新一次时间和自动锁屏配置
  setInterval(() => {
    initTime()
    refreshAutoLockConfig()
  }, 10000)

  // 检查锁定
  checkLock()
  // 自动解锁
  syncLock()
  // 自动锁定
  handleAutoLock()
})

onUnmounted(() => {
  window.removeEventListener('resize', updateViewportHeight)
  clearAutoLock()
})
</script>

<style scoped>
/* 锁屏固定毛玻璃：有意不随高级材质开关（ground-glass）变化 */
.lihua-lock-mask {
  will-change: backdrop-filter;
  backdrop-filter: var(--lihua-backdrop-filter-sm);
}

/* 紧凑布局对基础定位/宽度的条件覆盖：scoped (0,2,0) 压过模板工具类 (0,1,0)，覆盖机制依赖此特异性 */
.user-compact {
  top: 50%;
  left: 50%;
  bottom: auto;
  width: min(100vw, 360px);
  transform: translate(-50%, -50%);
}

/* width/border-radius 需压过 .ant-input(-affix-wrapper) 根级 cssinjs 声明，故留 scoped */
.pwd {
  width: 200px;
  border-radius: 50px
}

@keyframes shake {
  0%,100% { transform: translate3d(0,0,0) rotate(0deg); }
  15% { transform: translate3d(-10px,0,0) rotate(-1deg); }
  30% { transform: translate3d(8px,0,0) rotate(1deg); }
  45% { transform: translate3d(-6px,0,0) rotate(-0.8deg); }
  60% { transform: translate3d(4px,0,0) rotate(0.6deg); }
  75% { transform: translate3d(-2px,0,0) rotate(-0.3deg); }
  90% { transform: translate3d(1px,0,0) rotate(0.2deg); }
}

.shake {
  animation: shake 0.4s ease;
  transform-origin: center;
}

.fast-fade-enter-active {
  transition: all 0.1s ease-in;
}
.fast-fade-leave-active {
  transition: all 0.1s ease-out;
}
.fast-fade-enter-from {
  opacity: 0;
}
.fast-fade-leave-to {
  opacity: 0;
}

.lock-layout-fade-enter-active,
.lock-layout-fade-leave-active {
  transition: opacity 0.28s ease;
}

.lock-layout-fade-enter-from,
.lock-layout-fade-leave-to {
  opacity: 0;
}
</style>
