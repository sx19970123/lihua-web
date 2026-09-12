// 分片上传记录（localStorage）变更通知：同页 CustomEvent + 跨页签 storage 事件双通道
// （storage 事件只会在写入方以外的页面触发，同页另一组件实例的推进只能靠 CustomEvent 感知）
export const CHUNK_RECORD_EVENT = "attachment-chunk-record-change"

export const notifyChunkRecordChange = (md5: string) => {
    window.dispatchEvent(new CustomEvent(CHUNK_RECORD_EVENT, {detail: md5}))
}
