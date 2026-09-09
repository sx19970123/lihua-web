export interface CpuMonitor {
    /** 逻辑核心数 */
    logicalCores: string;

    /** 使用率 */
    usage: string;

    /** 空闲率 */
    free: string;
}