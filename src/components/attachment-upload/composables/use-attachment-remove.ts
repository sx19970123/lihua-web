import {Modal, message, type UploadFile} from "@/antd-adapter"
import {h} from "vue"
import {ExclamationCircleOutlined} from '@antdv-next/icons'
import {deleteFromBusiness} from "@/api/system/attachment/attachment-storage.ts"
import type {AttachmentEmitFn} from "./types.ts"

/**
 * 附件移除：列表内删除（可选自动业务删除确认）与暂存批量业务删除
 */
export const useAttachmentRemove = (ctx: {
  emits: AttachmentEmitFn
  autoRemove: boolean
  cancelUpload?: (file: UploadFile) => void
  // 公开附件模式：列表删除仅解除引用（url 为附件 path 非附件 id），不做业务删除
  public?: boolean
}) => {
  const {emits, autoRemove, cancelUpload} = ctx
  const removeIds: string[] = []

  // 处理附件删除
  const handleRemove = async (file: UploadFile) => {
    return new Promise( (resolve, reject) => {
      if (ctx.public) {
        cancelUpload?.(file)
        resolve({})
        return
      }
      if (file && file.url) {
        const id = file.url
        if (autoRemove) {
          Modal.confirm({
            title: '附件删除',
            icon: h(ExclamationCircleOutlined),
            content: '删除后无法恢复，是否删除？',
            // 确认删除
            onOk: async () => {
              // onOk 内异常会被 Modal 自行兜住，须显式 reject 让外层 promise 落定（否则 a-upload 行删除悬挂）
              try {
                const resp = await deleteFromBusiness([id])
                if (resp.code === 200) {
                  emits("remove", {id: id, status: "success"})
                  resolve({})
                } else {
                  reject()
                  emits("remove", {id: id, status: "error"})
                  message.error(resp.msg)
                }
              } catch (err) {
                console.error("附件删除失败", err)
                emits("remove", {id: id, status: "error"})
                message.error("删除失败")
                reject()
              }
            },
            // 取消删除
            onCancel: () => {
              reject()
            }
          })
        } else {
          removeIds.push(id)
          resolve({})
        }
      } else {
        // 无 id 条目（上传中/失败残留/秒传在途）：先取消后台上传链路（终止 hash worker、停止派片与合并，
        // 防已删文件传完后回写复活/发出成功事件）再放行，让 a-upload 直接移除本地条目
        // （reject 会取消移除，令残留条目永久滞留列表）
        cancelUpload?.(file)
        resolve({})
      }
    })
  }

  // 处理业务删除
  const businessRemove = async () => {
    return new Promise((resolve, reject) => {
      if (removeIds.length === 0) {
        reject({msg: '附件id不存在'})
        return
      }
      deleteFromBusiness(removeIds)
          .then(resp => {
            if (resp.code === 200) {
              removeIds.length = 0
            }
            resolve(resp)
          })
          .catch(err => reject(err))
    })
  }

  return {
    handleRemove,
    businessRemove
  }
}
