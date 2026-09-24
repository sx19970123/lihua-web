import {type UploadFile, type VcFile} from "@/antd-adapter"
import {onUnmounted} from "vue"
import {
  CHUNK_MD5_QUERY,
  chunksMerge,
  chunksUpload,
  chunksUploadedIndex,
  chunksUploadStart,
  existsAttachmentByMd5
} from "@/api/system/attachment/attachment-storage.ts"
import {currentRequests} from "@/utils/request.ts"
import type {ChunkUploadApi, UploadContext, UploadCoreApi, UploadRecordType} from "./types.ts"
import type {UploadState} from "./use-upload-state.ts"
import {CHUNK_UPLOAD_RECORD_PREFIX, HASH_CHUNK_SIZE_MB, UPLOAD_MODE} from "./constants.ts"

/**
 * 分片上传链路：哈希计算、断点续传判存、分片上传（游标 worker-pool）与合并。
 * 同附件并发语义（2026-09-22 拍板）：接受双份结果——发现他方在传时不等待、不共写同一任务，
 * 各自开独立 uploadId 传完；后端按 md5 多行容错设计（findUploadableByMd5 遍历取首个物理存在行），
 * 秒传天然兼容，无需为重复结果做任何处理。
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

  // per-文件上传活动登记（取消通道）：取消标志 + 在途 hash worker 引用。
  // 删行（cancelUpload）或组件卸载时置位——终止 worker、停止派片与合并；本地记录保留供断点续传。
  // 条目在合并终态/链路失败处删除，个别中间失败路径可能残留至组件卸载，无害（仅占位小对象）
  const activeUploads = new Map<string, {aborted: boolean, worker?: Worker}>()
  onUnmounted(() => {
    activeUploads.forEach(entry => {
      entry.aborted = true
      entry.worker?.terminate()
    })
  })

  const ensureActive = (uid: string) => {
    let entry = activeUploads.get(uid)
    if (!entry) {
      entry = {aborted: false}
      activeUploads.set(uid, entry)
    }
    return entry
  }
  const isAborted = (uid: string) => activeUploads.get(uid)?.aborted ?? false

  // 取消指定文件的上传链路（删行时调用）：静默收场不报错——停止分片/合并后不再回写列表与发事件，
  // uploading 状态就地复位（分片模式单文件串行，不存在会被波及的并发上传）
  const cancelUpload = (file: UploadFile) => {
    const entry = activeUploads.get(file.uid)
    if (!entry) {
      return
    }
    entry.aborted = true
    entry.worker?.terminate()
    entry.worker = undefined
    resetUploadState()
  }

  // 开始进行分片上传（外层兜底：步骤 2/3 中的网络 reject 与本地记录 JSON.parse 损坏等逃逸异常
  // 在此收口，否则 uploading 永久为 true 且异常成为 unhandled rejection）
  const startChunkUpload = async (file: VcFile) => {
    uploadState.uploading = true
    try {
      // 1. 获取附件md5值（失败时终止本次上传，handleUploadError 内复位 loading）
      let md5: string
      try {
        md5 = await handleCalculateHash(file)
      } catch {
        activeUploads.delete(file.uid)
        handleUploadError(file, "附件哈希计算失败")
        return
      }
      // 哈希期间该行已被删除（cancelUpload 已复位状态），静默结束
      if (isAborted(file.uid)) {
        activeUploads.delete(file.uid)
        return
      }
      // 2. 判断是否进行附件上传
      const allow = await allowUpload(file, md5)
      if (allow) {
        // 3. 处理分片上传逻辑
        await handleChunkUpload(file, md5)
      } else {
        // 不允许 = 附件已传完（记录 completed 或库中命中），秒传直接拿现成附件
        handleFastUpload(file, md5)
      }
    } catch {
      // 兜底收口（网络类异常拦截器已提示，本地记录损坏等走泛文案）
      activeUploads.delete(file.uid)
      handleUploadError(file, "分片上传失败")
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
          // 业务失败统一走失败收口（handleUploadError 内弹提示并复位 loading），停止后续派片
          handleUploadError(file, resp.msg)
          ensureActive(file.uid).aborted = true
        }
      } catch {
        // 网络类异常（ResponseError）拦截器已统一提示，此处只收尾状态
        handleUploadError(file, "分片上传失败")
        ensureActive(file.uid).aborted = true
      }
    }

    // 6. 游标 worker-pool：固定数量 worker 从共享游标取片；停派标志统一为登记表的取消位
    //（删行取消与业务失败共用），在途分片自然收尾
    let nextChunkCursor = 0
    const chunkWorker = async () => {
      while (!isAborted(file.uid) && nextChunkCursor < needUploadChunks.length) {
        await uploadChunk(nextChunkCursor++)
      }
    }
    await Promise.all(
        Array.from({length: Math.min(chunkUploadCount, needUploadChunks.length)}, () => chunkWorker())
    ).catch((e) => {
      // 网络类异常（ResponseError）拦截器已提示，统一泛文案收口
      console.error(e)
      handleUploadError(file, "分片上传失败")
    })
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
    return new Promise<string>((resolve, reject) => {
      // 通过webWorker后台处理hash计算，防止ui阻塞
      const worker = new Worker(new URL("./hash-worker.ts", import.meta.url), {type: "module"})
      // 登记 worker 供取消通道终止；被取消时 terminate 后本 promise 保持挂起——取消是用户主动行为，
      // 不应走 reject 弹错误提示（挂起的 await 无后续副作用，组件卸载后随实例回收）
      const entry = ensureActive(file.uid)
      entry.worker = worker
      const detachWorker = () => {
        entry.worker = undefined
      }
      // worker 加载/运行异常兜底：不处理则 promise 永不落定、上传流程永久卡死
      worker.onerror = () => {
        reject(new Error("附件哈希计算失败"))
        worker.terminate()
        detachWorker()
      }
      // 接收hash计算完成后的结果
      worker.onmessage = (event) => {
        const resp = event.data
        if (typeof resp === "string") {
          resolve(resp)
          worker.terminate()
          detachWorker()
        } else if (typeof resp === "number") {
          uploadState.progress = resp
        } else if (resp && typeof resp === "object" && resp.type === "error") {
          // worker 内分片读取失败的主动上报（协议：{type: 'error', message}）
          reject(new Error(resp.message ?? "附件哈希计算失败"))
          worker.terminate()
          detachWorker()
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
        if (uploadRecord.status === "in_progress") {
          // 记录在途且仍有对应请求 = 他方正在上传同附件：按拍板接受双份结果，走查库→未命中则
          // 新建自己的任务（各持独立 uploadId，不共写互踩）；查库命中则自然落秒传
          // 记录在途但无对应请求 = 上次中断，续传旧任务（断点续传）
          const inFlight = [...currentRequests].some(url => url.startsWith("post:") && url.includes("?" + CHUNK_MD5_QUERY + md5))
          if (!inFlight) {
            resolve(true)
            return
          }
          needFetch = true
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
          } else {
            handleUploadError(file, resp.msg)
          }
        }
      }
    })
  }

  // 处理附件合并
  const handleChunksMerge = (file: UploadFile, recordObj: UploadRecordType, md5: string) => {
    // 删行取消：静默收场，不再合并/回写列表/发事件（本地记录保留供断点续传）
    if (isAborted(file.uid)) {
      resetUploadState()
      return
    }
    uploadState.status = "MERGE"
    // 进入合并前把本地记录置为 completed（分片已全部就绪）：合并期间会话中断（刷新/关闭）后，
    // 重传会经 existsAttachmentByMd5 命中秒传闭环，而非把已消费的 uploadId 当全新任务全量重传
    recordObj.status = "completed"
    localStorage.setItem(CHUNK_UPLOAD_RECORD_PREFIX + md5, JSON.stringify(recordObj))
    chunksMerge({originalName: file.name, md5: md5, uploadId:  recordObj.uploadId}, recordObj.chunkSize).then((resp) => {
      if (resp.code === 200) {
        // 上传成功后删除浏览器缓存记录
        localStorage.removeItem(CHUNK_UPLOAD_RECORD_PREFIX + md5)
        // fileList重新赋值（公开附件模式回写 path，其余回写附件表 id）
        fileList.value.forEach(item => {
          if (item.uid === file.uid) {
            item.url = ctx.public ? resp.data?.path : resp.data?.id
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
      // 网络类异常（ResponseError）拦截器已提示，统一泛文案收口
      console.error(e)
      handleUploadError(file, "附件合并失败")
    }).finally(() => {
      resetUploadState()
      activeUploads.delete(file.uid)
    })
  }

  return {
    startChunkUpload,
    handleCalculateHash,
    cancelUpload
  } satisfies ChunkUploadApi
}
