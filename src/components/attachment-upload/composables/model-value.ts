// 组件 v-model 契约封装：对外值为逗号分隔的附件 id 串（拆分时空段过滤）
export const splitAttachmentIds = (value?: string): string[] => (value ?? "").split(",").filter(Boolean)

export const joinAttachmentIds = (ids: Array<string | undefined>): string => ids.filter(id => !!id).join(",")
