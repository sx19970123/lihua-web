import {message, type UploadFile, type VcFile} from "@/antd-adapter"
import {onUnmounted} from "vue"
import {
  CHUNK_MD5_QUERY,
  chunksMerge,
  chunksUpload,
  chunksUploadedIndex,
  chunksUploadStart,
  existsAttachmentByMd5
} from "@/api/system/attachment/attachment-storage.ts"
import {ResponseError} from "@/api/global/type.ts"
import {currentRequests} from "@/utils/request.ts"
import type {ChunkUploadApi, UploadContext, UploadCoreApi, UploadRecordType} from "./types.ts"
import type {UploadState} from "./use-upload-state.ts"
import {CHUNK_UPLOAD_RECORD_PREFIX, HASH_CHUNK_SIZE_MB, UPLOAD_MODE} from "./constants.ts"
import {CHUNK_RECORD_EVENT, notifyChunkRecordChange} from "./chunk-record-event.ts"

/**
 * 分片上传链路：哈希计算、断点续传判存、分片上传（游标 worker-pool）与合并
 */
export const useChunkUpload = (ctx: UploadContext & {
  uploadState: UploadState
  resetUploadState: () => void
  core: UploadCoreApi
  chunkSize: number
  chunkUploadCount: number
}) => {
  const {emits, fileList, sysAttachment, buildSysAttachment, uploadState, resetUploadState, core, chunkSize, chunkUploadCount} = ctx
  const {handleUploadError, handleFastUpload, handleModelValue} = core

  // 运行期注册的记录同步监听，组件卸载时统一移除
  const recordCleanups: Array<() => void> = []
  onUnmounted(() => recordCleanups.forEach(fn => fn()))

  // 开始进行分片上传
  const startChunkUpload = async (file: VcFile) => {
    uploadState.uploading = true
    // 1. 获取附件md5值（失败时终止本次上传，handleUploadError 内复位 loading）
    let md5: string
    try {
      md5 = await handleCalculateHash(file) as string
    } catch {
      handleUploadError(file, "附件哈希计算失败")
      return
    }
    // 2. 判断是否进行附件上传
    let allow = await allowUpload(file, md5);
    // 允许上传附件
    if (allow) {
      // 3. 处理分片上传逻辑
      await handleChunkUpload(file, md5)
    } else {
      // 3 不允许分片上传 包含两种情况：1 同一附件有正在执行的上传任务；2 附件已上传完毕
      handleSyncChunkUploadStatus(file, md5)
    }
  }

  // 处理分片上传逻辑
  const handleChunkUpload = async (file: VcFile, md5: string) => {
    uploadState.status = "UPDATE"
    uploadState.progress = 0
    // 获取浏览器缓存中记录的分片上传信息
    const record = localStorage.getItem(CHUNK_UPLOAD_RECORD_PREFIX + md5)
    if (!record) { return }
    const recordObj: UploadRecordType = JSON.parse(record)

    // 1. 对附件进行分片
    const chunks = handleChunk(file, chunkSize).map((chunk, index) => ({index: index + 1, chunk}));
    // 2. 获取已上传的分片索引
    const uploadedIndexResp = await chunksUploadedIndex(recordObj.uploadId);
    if (uploadedIndexResp.code !== 200) {
      handleUploadError(file, uploadedIndexResp.msg)
      return
    }
    recordObj.chunkSize = chunks.length
    const uploadedIndexList = uploadedIndexResp.data

    // 3. 获取到需要上传的分片附件，并构建分片对象
    const needUploadChunks = chunks.filter((item) => !uploadedIndexList.includes(item.index)).map((item) => ({
      index: item.index,
      chunk: item.chunk
    }))
    // 4. 创建各种计数器
    // 分片上传计数器
    let uploadedChunkNum = 0
    // 已上传大小计数器（按分片实际大小累计：尾片不足整片大小）
    let uploadedChunkSize = uploadedIndexList.reduce((sum, index) => sum + (chunks[index - 1]?.chunk.size ?? 0), 0)
    // 分片维度的已上传字节（进度回调的 bytes 为该分片内累积值，跨回调直接累加会重复计数）
    const chunkUploadedBytes = new Map<number, number>()

    // 没有需要上传的情况，直接调用合并
    if (needUploadChunks.length === 0) {
      handleChunksMerge(file, recordObj, md5)
      return
    }

    // 5. 分片上传主体（单次调度：取片、上传、结算；调度由 worker 循环驱动）
    const uploadChunk = async (i: number) => {
      const {chunk, index} = needUploadChunks[i]
      try {
        // 调用分片上传接口
        const resp = await chunksUpload(chunk, recordObj.uploadId, md5, index, (bytes: number) => {
          // 上传状态显示，并实时更新上传进度（bytes 为该分片内累积值，取增量累加）
          const last = chunkUploadedBytes.get(index) ?? 0
          chunkUploadedBytes.set(index, bytes)
          uploadedChunkSize += bytes - last
          recordObj.uploadedChunkSize = Math.trunc(uploadedChunkSize / 1024 / 1024)
          recordObj.totalSize = Math.trunc(file.size ? file.size / 1024 / 1024 : 0 )
          localStorage.setItem(CHUNK_UPLOAD_RECORD_PREFIX + md5, JSON.stringify(recordObj))
          notifyChunkRecordChange(md5)
          uploadState.progress = recordObj.totalSize ? Math.trunc(recordObj.uploadedChunkSize / recordObj.totalSize * 100) : 0
        })
        if (resp.code === 200) {
          // 分片完成按实际大小结算，消除进度回调可能漏报的尾差
          uploadedChunkSize += chunk.size - (chunkUploadedBytes.get(index) ?? 0)
          chunkUploadedBytes.set(index, chunk.size)
          // 计数器 + 1
          uploadedChunkNum++
          // 所有分片上传完成
          if (uploadedChunkNum == needUploadChunks.length) {
            // 处理分片合并
            handleChunksMerge(file, recordObj, md5)
          }
        } else {
          message.error(resp.msg)
          uploadAborted = true
        }
      } catch (e) {
        if (e instanceof ResponseError) {
          message.error(e.msg)
        }
        handleUploadError(file, "分片上传失败")
        uploadAborted = true
      }
    }

    // 6. 游标 worker-pool：固定数量 worker 从共享游标取片，任意分片失败即停止派片（在途分片自然收尾）
    let nextChunkCursor = 0
    let uploadAborted = false
    const chunkWorker = async () => {
      while (!uploadAborted && nextChunkCursor < needUploadChunks.length) {
        await uploadChunk(nextChunkCursor++)
      }
    }
    await Promise.all(
        Array.from({length: Math.min(chunkUploadCount, needUploadChunks.length)}, () => chunkWorker())
    ).catch((e) => {
      if (e instanceof ResponseError) {
        handleUploadError(file, e.msg)
      } else {
        handleUploadError(file, "分片上传失败")
        console.error(e)
      }
    })
  }

  // 同步分片上传状态：其他上传方（本页其他实例或跨页签）推进 localStorage 记录，事件驱动同步进度直至完成
  const handleSyncChunkUploadStatus = (file: UploadFile, md5: string) => {
    const recordKey = CHUNK_UPLOAD_RECORD_PREFIX + md5
    if (!localStorage.getItem(recordKey)) {
      // 没有本地记录直接调用附件秒传
      handleFastUpload(file, md5)
      return
    }
    const syncRecord = () => {
      // 每次重读记录：进度由并发上传方推进，闭包快照会恒为旧值
      const record = localStorage.getItem(recordKey)
      if (!record) {
        cleanup()
        return
      }
      const recordObj: UploadRecordType = JSON.parse(record)
      uploadState.progress = recordObj.totalSize ? Math.trunc(recordObj.uploadedChunkSize / recordObj.totalSize * 100) : 0
      // 检测到上传状态为completed时，执行附件秒传获取数据
      if (recordObj.status === "completed") {
        cleanup()
        handleFastUpload(file, md5)
      }
    }
    // 同页实例推进走 CustomEvent；跨页签写入走 storage 事件（storage 不在写入页自身触发）
    const onCustomEvent = (event: Event) => {
      if ((event as CustomEvent<string>).detail === md5) {
        syncRecord()
      }
    }
    const onStorageEvent = (event: StorageEvent) => {
      if (event.key === recordKey) {
        syncRecord()
      }
    }
    const cleanup = () => {
      window.removeEventListener(CHUNK_RECORD_EVENT, onCustomEvent)
      window.removeEventListener("storage", onStorageEvent)
    }
    recordCleanups.push(cleanup)
    window.addEventListener(CHUNK_RECORD_EVENT, onCustomEvent)
    window.addEventListener("storage", onStorageEvent)
    // 立即同步一次：记录可能已处于 completed
    syncRecord()
  }

  // 处理分片
  const handleChunk = (file: VcFile, size: number): Blob[] => {
    const chunks:Blob[] = []
    if (file.size) {
      size = size * 1024 * 1024
      for (let i = 0; i < file.size; i = size + i) {
        chunks.push(file.slice(i, size + i))
      }
    }
    return chunks;
  }

  // 计算附件哈希
  const handleCalculateHash = (file: VcFile) => {
    uploadState.status = "MD5"
    uploadState.progress = 0

    const chunks = handleChunk(file, HASH_CHUNK_SIZE_MB)
    return new Promise((resolve, reject) => {
      // 通过webWorker后台处理hash计算，防止ui阻塞
      const worker = new Worker(new URL("../hash-worker.ts", import.meta.url), {type: "module"})
      // worker 加载/运行异常兜底：不处理则 promise 永不落定、上传流程永久卡死
      worker.onerror = () => {
        reject(new Error("附件哈希计算失败"))
        worker.terminate()
      }
      // 接收hash计算完成后的结果
      worker.onmessage = (event) => {
        const resp = event.data
        if (typeof resp === "string") {
          resolve(resp)
          worker.terminate()
        } else if (typeof resp === "number") {
          uploadState.progress = resp
        } else if (resp && typeof resp === "object" && resp.type === "error") {
          // worker 内分片读取失败的主动上报（协议：{type: 'error', message}）
          reject(new Error(resp.message ?? "附件哈希计算失败"))
          worker.terminate()
        }
      }
      worker.postMessage(chunks)
    })
  }

  // 是否允许上传
  const allowUpload = async (file: UploadFile, md5: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      const record = localStorage.getItem(CHUNK_UPLOAD_RECORD_PREFIX + md5)
      let needFetch = false
      if (record) {
        const uploadRecord: UploadRecordType = JSON.parse(record)
        // 缓存对象为上传中状态，检查当前正在进行的请求，post:开头，包含md5是否存在，存在即处于正在上传状态，不存在即为中途断开状态
        if (uploadRecord.status === "in_progress") {
          resolve(![... currentRequests].some(url => url.startsWith("post:") && url.includes("?" + CHUNK_MD5_QUERY + md5)))
        } else {
          // 已完成上传，从数据库查询对应信息
          needFetch = true
        }
      } else {
        // 记录不存在，从数据库查询对应信息
        needFetch = true
      }

      if (needFetch) {
        // 根据md5 查询数据库数据
        existsAttachmentByMd5(md5).then(async resp => {
          if (resp.code === 200) {
            // 数据存在，返回false
            if (resp.data) {
              resolve(false)
            } else {
              await _initChunkUploadStorage()
              resolve(true)
            }
          } else {
            await _initChunkUploadStorage()
            resolve(true)
            console.error(resp.msg, "为业务正常进行，继续上传附件")
          }
        }).catch(e => {
          reject(e)
        })
        // 新建localStorage缓存数据
        async function _initChunkUploadStorage() {
          buildSysAttachment(file, md5, UPLOAD_MODE.CHUNK)
          // 从后端获取updateId
          const resp = await chunksUploadStart(sysAttachment.value)
          if (resp.code === 200) {
            const data = resp.data
            localStorage.setItem(CHUNK_UPLOAD_RECORD_PREFIX + md5, JSON.stringify({
              uploadId: data.uploadId,
              attachmentId: data.attachmentId,
              status: "in_progress",
              uploadedChunkSize: 0,
              totalSize: 0,
              chunkSize: 0
            } as UploadRecordType))
            notifyChunkRecordChange(md5)
          } else {
            message.error(resp.msg)
            handleUploadError(file, resp.msg)
          }
        }
      }
    })
  }

  // 处理附件合并
  const handleChunksMerge = (file: UploadFile, recordObj: UploadRecordType, md5: string) => {
    uploadState.status = "MERGE"
    // 进入合并前把本地记录置为 completed（分片已全部就绪）：合并期间会话中断（刷新/关闭）后，
    // 重传会经 existsAttachmentByMd5 命中秒传闭环，而非把已消费的 uploadId 当全新任务全量重传
    recordObj.status = "completed"
    localStorage.setItem(CHUNK_UPLOAD_RECORD_PREFIX + md5, JSON.stringify(recordObj))
    notifyChunkRecordChange(md5)
    chunksMerge({originalName: file.name, md5: md5, uploadId:  recordObj.uploadId}, recordObj.chunkSize).then((resp) => {
      if (resp.code === 200) {
        // 上传成功后删除浏览器缓存记录
        localStorage.removeItem(CHUNK_UPLOAD_RECORD_PREFIX + md5)
        notifyChunkRecordChange(md5)
        // fileList重新赋值
        fileList.value.forEach(item => {
          if (item.uid === file.uid) {
            item.url = resp.data?.id
            item.status = "done"
          }
        })
        // 处理双向绑定
        handleModelValue(file, fileList.value)
        emits("uploadSuccess", {file, fileList: fileList.value})
      } else {
        handleUploadError(file, resp.msg)
      }
    }).catch((e) => {
      if (e instanceof ResponseError) {
        handleUploadError(file, e.msg)
      } else {
        handleUploadError(file, "附件合并失败")
        console.error(e)
      }
    }).finally(() => {
      resetUploadState()
    })
  }

  return {
    startChunkUpload,
    handleCalculateHash
  } satisfies ChunkUploadApi
}
