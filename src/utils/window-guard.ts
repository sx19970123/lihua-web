/**
 * 按键时间窗守卫（前沿节流）：同一 key 在窗口期内只有第一次放行，其后拒直到窗口过期。
 * 窗口按时间流逝自动复位，不需要任何重置接线——勿改回布尔标志方案，
 * 布尔不复位会把窗口后的下一次真实触发永久吞掉。
 * 典型用途：并发请求失败时同文案 message 只弹一条、认证失效联动只执行一次。
 */
export const createWindowGuard = (windowMs: number) => {
    const lastFiredAt = new Map<string, number>()
    return (key: string) => {
        const now = Date.now()
        if (now - (lastFiredAt.get(key) ?? 0) < windowMs) {
            return false
        }
        lastFiredAt.set(key, now)
        return true
    }
}
