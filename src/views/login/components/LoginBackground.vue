<template>
  <!-- 登录页全屏氛围背景：z-0 压在内容层（z-1）之下；页面根节点不可建层叠上下文（验证码弹窗需与 body 级蒙版直接比较 z-index）；
       时段主题类（morning/noon/dusk/night）驱动整套色板变量 -->
  <div class="login-bg" :class="`login-bg--${period}`" aria-hidden="true">
    <div class="login-bg-base"></div>
    <div class="login-bg-beam"></div>
    <div class="login-bg-cats"></div>
    <div class="login-bg-orb orb-a"></div>
    <div class="login-bg-orb orb-b"></div>
    <div class="login-bg-orb orb-c"></div>
    <div class="login-bg-orb orb-d"></div>
    <div class="login-bg-noise"></div>
  </div>
</template>

<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from "vue"

type TimePeriod = "morning" | "noon" | "dusk" | "night"

const PERIODS: TimePeriod[] = ["morning", "noon", "dusk", "night"]

const period = ref<TimePeriod>("noon")
let timer: number | undefined

// 早上 5-11 / 中午 11-16 / 黄昏 16-19 / 晚上 19-5
const resolvePeriod = (now: Date): TimePeriod => {
  const h = now.getHours()
  if (h >= 5 && h < 11) {
    return "morning"
  }
  if (h >= 11 && h < 16) {
    return "noon"
  }
  if (h >= 16 && h < 19) {
    return "dusk"
  }
  return "night"
}

const updatePeriod = () => {
  period.value = resolvePeriod(new Date())
}

// 演示/截图用：URL ?loginBg=morning|noon|dusk|night 强制指定时段（优先于真实时间，不受定时复查覆盖）
const urlOverride = (() => {
  const value = new URLSearchParams(window.location.search).get("loginBg")
  return value && PERIODS.includes(value as TimePeriod) ? value as TimePeriod : null
})()
if (urlOverride) {
  period.value = urlOverride
}

onMounted(() => {
  if (!urlOverride) {
    updatePeriod()
    timer = window.setInterval(updatePeriod, 60_000)
  }
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<style scoped>
/*
 * 时段主题 × 海天构图：上半光球为天空（orb-a 左 / orb-b 右），下半光球为海洋（orb-c 右 / orb-d 左），
 * 基底渐变垂直（上天色 → 下海色），地平线光带在 58vh 处相接；morning/noon/dusk/night 四组色板
 * （scoped 内为亮色），暗色覆盖见文件末尾全局块
 * 性能：光球/光带动画只用 transform 与 opacity（GPU 合成）；blur 为静态值不参与动画
 */
.login-bg {
  --cat-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='264' height='264'%3E%3Cg fill='none' stroke='%23465efb' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M 2 6.5 Q 7 11.5 12 5.5 Q 17 11.5 22 6.5' stroke-opacity='0.12' transform='translate(36,52) rotate(-12) scale(0.8)'/%3E%3Cpath d='M 2 13 Q 2.8 8 4.8 4 Q 7.2 6.8 9 11 M 8.5 11 Q 9.5 13 10.5 11 M 11 11 Q 12.8 6.8 15.2 4 Q 17.2 8 18 13' stroke-opacity='0.11' transform='translate(160,60) rotate(8) scale(1.05)'/%3E%3Cpath d='M 2 13 Q 2.8 8 4.8 4 Q 7.2 6.8 9 11 M 8.5 11 Q 9.5 13 10.5 11 M 11 11 Q 12.8 6.8 15.2 4 Q 17.2 8 18 13' stroke-opacity='0.09' transform='translate(60,190) rotate(15) scale(0.7)'/%3E%3Cpath d='M 2 6.5 Q 7 11.5 12 5.5 Q 17 11.5 22 6.5' stroke-opacity='0.08' transform='translate(190,196) rotate(-4) scale(0.65)'/%3E%3C/g%3E%3C/svg%3E");
  --noise-opacity: 0.05;

  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--bg-base);
}

/* 早上：灰金的晨、灰青苏醒的海（莫兰迪调，微留彩度） */
.login-bg--morning {
  --bg-base: linear-gradient(180deg, #faf8f1 0%, #eff4ec 55%, #ecf3ec 100%);
  --orb-a: rgba(224, 204, 162, 0.4);
  --orb-b: rgba(168, 210, 226, 0.32);
  --orb-c: rgba(122, 190, 188, 0.32);
  --orb-d: rgba(122, 156, 210, 0.28);
  --beam-light: rgba(248, 246, 238, 0.5);
  --base-glow-a: rgba(246, 244, 236, 0.45);
  --base-glow-b: rgba(238, 243, 242, 0.3);
}

/* 中午：灰蓝的天、灰青海的水（莫兰迪调，微留彩度） */
.login-bg--noon {
  --bg-base: linear-gradient(180deg, #f5fafb 0%, #ebf1f4 55%, #ecf1f5 100%);
  --orb-a: rgba(136, 180, 228, 0.42);
  --orb-b: rgba(150, 200, 220, 0.36);
  --orb-c: rgba(92, 172, 180, 0.38);
  --orb-d: rgba(108, 130, 214, 0.34);
  --beam-light: rgba(250, 250, 250, 0.5);
  --base-glow-a: rgba(250, 250, 250, 0.45);
  --base-glow-b: rgba(246, 248, 250, 0.3);
}

/* 黄昏：陶土与灰玫瑰的天、映着余温的海（莫兰迪调，微留彩度） */
.login-bg--dusk {
  --bg-base: linear-gradient(180deg, #fbf3e9 0%, #f5ede4 55%, #efedf4 100%);
  --orb-a: rgba(226, 174, 122, 0.42);
  --orb-b: rgba(218, 156, 150, 0.34);
  --orb-c: rgba(206, 146, 134, 0.28);
  --orb-d: rgba(120, 134, 212, 0.36);
  --beam-light: rgba(222, 202, 182, 0.5);
  --base-glow-a: rgba(240, 228, 212, 0.4);
  --base-glow-b: rgba(232, 228, 236, 0.28);
}

/* 晚上：灰蓝的月夜、灰靛的海（莫兰迪调，微留彩度） */
.login-bg--night {
  --bg-base: linear-gradient(180deg, #f1f5fb 0%, #e4ebf7 55%, #dfe7f4 100%);
  --orb-a: rgba(188, 210, 238, 0.4);
  --orb-b: rgba(126, 150, 224, 0.44);
  --orb-c: rgba(110, 134, 220, 0.46);
  --orb-d: rgba(94, 156, 176, 0.4);
  --beam-light: rgba(224, 230, 240, 0.45);
  --base-glow-a: rgba(220, 228, 240, 0.4);
  --base-glow-b: rgba(214, 222, 234, 0.3);
}

/* 基底渐变之上叠一层缓慢呼吸的径向光，避免大面积纯渐变的呆板（明暗各自定义光色） */
.login-bg-base {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(42% 36% at 18% 22%, var(--base-glow-a), transparent 70%),
    radial-gradient(50% 44% at 84% 78%, var(--base-glow-b), transparent 72%);
  animation: bg-breathe 18s ease-in-out infinite alternate;
}

/* 斜向光带：横穿画面的柔光，低频往复 */
.login-bg-beam {
  position: absolute;
  top: -25%;
  left: -60%;
  width: 220%;
  height: 150%;
  background: linear-gradient(100deg,
    transparent 32%,
    var(--beam-light) 50%,
    transparent 68%);
  opacity: 0.16;
  transform: rotate(8deg) translateX(-12%);
  filter: blur(30px);
  animation: beam-sweep 26s ease-in-out infinite alternate;
}

/* 猫嘴纹样：ω 形小猫嘴 SVG 平铺（单元内三只错落大小/角度/深浅），径向遮罩中心让位、四缘显影；
   颜色按明暗主题各烤一版（data-URI 内不可用 CSS 变量，故以变量切换整张 url） */
.login-bg-cats {
  position: absolute;
  inset: 0;
  background-image: var(--cat-pattern);
  background-size: 264px 264px;
  -webkit-mask-image: radial-gradient(ellipse 70% 62% at 50% 44%, transparent 42%, #000 100%);
  mask-image: radial-gradient(ellipse 70% 62% at 50% 44%, transparent 42%, #000 100%);
}

/* 光球：尺寸/落点/节奏各异，blur 静态、位移走 transform */
.login-bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  will-change: transform;
}

.orb-a {
  width: 46vw;
  height: 46vw;
  left: -10vw;
  top: -14vh;
  background: radial-gradient(circle at 35% 35%, var(--orb-a), transparent 68%);
  animation: orb-a-drift 32s ease-in-out infinite alternate;
}

.orb-b {
  width: 38vw;
  height: 38vw;
  right: -8vw;
  top: -10vh;
  background: radial-gradient(circle at 60% 40%, var(--orb-b), transparent 66%);
  animation: orb-b-drift 40s ease-in-out infinite alternate;
}

.orb-c {
  width: 50vw;
  height: 50vw;
  right: -14vw;
  bottom: -22vh;
  background: radial-gradient(circle at 45% 55%, var(--orb-c), transparent 68%);
  animation: orb-c-drift 46s ease-in-out infinite alternate;
}

.orb-d {
  width: 30vw;
  height: 30vw;
  left: 6vw;
  bottom: -12vh;
  background: radial-gradient(circle at 50% 40%, var(--orb-d), transparent 64%);
  animation: orb-d-drift 28s ease-in-out infinite alternate;
}

/* 噪点颗粒：压掉大渐变的色带断层 */
.login-bg-noise {
  position: absolute;
  inset: 0;
  opacity: var(--noise-opacity);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@keyframes bg-breathe {
  from {
    opacity: 0.75;
    transform: scale(1);
  }
  to {
    opacity: 1;
    transform: scale(1.03);
  }
}

@keyframes beam-sweep {
  from {
    transform: rotate(8deg) translateX(-12%);
  }
  to {
    transform: rotate(8deg) translateX(12%);
  }
}

@keyframes orb-a-drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(6vw, 5vh, 0) scale(1.12);
  }
}

@keyframes orb-b-drift {
  from {
    transform: translate3d(0, 0, 0) scale(1.08);
  }
  to {
    transform: translate3d(-7vw, 7vh, 0) scale(0.96);
  }
}

@keyframes orb-c-drift {
  from {
    transform: translate3d(0, 0, 0) scale(1);
  }
  to {
    transform: translate3d(-5vw, -6vh, 0) scale(1.15);
  }
}

@keyframes orb-d-drift {
  from {
    transform: translate3d(0, 0, 0) scale(0.94);
  }
  to {
    transform: translate3d(5vw, -4vh, 0) scale(1.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-bg,
  .login-bg * {
    animation: none;
  }
}
</style>

<style>
/* 暗色主题 × 时段：仅覆盖色板变量（scoped 无法选中 html 属性，沿用项目全局块惯例） */

[data-theme='dark'] .login-bg {
  --cat-pattern: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='264' height='264'%3E%3Cg fill='none' stroke='%238caaff' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M 2 6.5 Q 7 11.5 12 5.5 Q 17 11.5 22 6.5' stroke-opacity='0.10' transform='translate(36,52) rotate(-12) scale(0.8)'/%3E%3Cpath d='M 2 13 Q 2.8 8 4.8 4 Q 7.2 6.8 9 11 M 8.5 11 Q 9.5 13 10.5 11 M 11 11 Q 12.8 6.8 15.2 4 Q 17.2 8 18 13' stroke-opacity='0.09' transform='translate(160,60) rotate(8) scale(1.05)'/%3E%3Cpath d='M 2 13 Q 2.8 8 4.8 4 Q 7.2 6.8 9 11 M 8.5 11 Q 9.5 13 10.5 11 M 11 11 Q 12.8 6.8 15.2 4 Q 17.2 8 18 13' stroke-opacity='0.07' transform='translate(60,190) rotate(15) scale(0.7)'/%3E%3Cpath d='M 2 6.5 Q 7 11.5 12 5.5 Q 17 11.5 22 6.5' stroke-opacity='0.07' transform='translate(190,196) rotate(-4) scale(0.65)'/%3E%3C/g%3E%3C/svg%3E");
  --noise-opacity: 0.07;
}

/* 早上：黎明前——残夜尽头天际微金，暗海未醒 */
[data-theme='dark'] .login-bg--morning {
  --bg-base: linear-gradient(180deg, #0b0d10 0%, #090f12 55%, #090f12 100%);
  --orb-a: rgba(132, 118, 70, 0.36);
  --orb-b: rgba(54, 108, 140, 0.4);
  --orb-c: rgba(28, 110, 108, 0.42);
  --orb-d: rgba(40, 78, 134, 0.38);
  --beam-light: rgba(140, 158, 178, 0.26);
  --base-glow-a: rgba(115, 135, 170, 0.07);
  --base-glow-b: rgba(115, 135, 170, 0.05);
}

/* 中午：白昼——晴空与深海各自深邃 */
[data-theme='dark'] .login-bg--noon {
  --bg-base: linear-gradient(180deg, #090f14 0%, #081013 55%, #081013 100%);
  --orb-a: rgba(48, 114, 152, 0.44);
  --orb-b: rgba(42, 100, 134, 0.42);
  --orb-c: rgba(26, 106, 118, 0.46);
  --orb-d: rgba(48, 72, 150, 0.42);
  --beam-light: rgba(148, 168, 192, 0.3);
  --base-glow-a: rgba(118, 138, 172, 0.07);
  --base-glow-b: rgba(118, 138, 172, 0.05);
}

/* 黄昏：暮色余烬——落日烧尽后的天与映着残霞的海 */
[data-theme='dark'] .login-bg--dusk {
  --bg-base: linear-gradient(180deg, #100d0c 0%, #0e0f13 55%, #0d0f14 100%);
  --orb-a: rgba(164, 106, 52, 0.44);
  --orb-b: rgba(148, 74, 78, 0.36);
  --orb-c: rgba(124, 64, 62, 0.32);
  --orb-d: rgba(54, 68, 156, 0.42);
  --beam-light: rgba(178, 158, 138, 0.26);
  --base-glow-a: rgba(165, 142, 122, 0.06);
  --base-glow-b: rgba(140, 132, 148, 0.05);
}

/* 晚上：深夜——月悬天际，荧光靛蓝的海在黑暗里发光 */
[data-theme='dark'] .login-bg--night {
  --bg-base: linear-gradient(180deg, #070b12 0%, #050a0e 55%, #050a0c 100%);
  --orb-a: rgba(122, 158, 222, 0.36);
  --orb-b: rgba(62, 88, 178, 0.46);
  --orb-c: rgba(54, 80, 178, 0.48);
  --orb-d: rgba(28, 96, 122, 0.46);
  --beam-light: rgba(138, 156, 190, 0.34);
  --base-glow-a: rgba(108, 128, 168, 0.08);
  --base-glow-b: rgba(104, 122, 160, 0.06);
}
</style>
