/**
 * 邮箱自动补全共用：常用域名候选与候选构建
 */
export const EMAIL_DOMAINS = ['qq.com', '126.com', '163.com', 'aliyun.com', 'sina.com', 'sohu.com', 'gmail.com', 'outlook.com', 'hotmail.com']

/**
 * 按输入内容构建候选：空值或已含 @（用户已明确域名）时不再给候选
 */
export const buildEmailOptions = (val: string): { value: string }[] => !val || val.indexOf('@') >= 0 ? [] : EMAIL_DOMAINS.map(domain => ({value: `${val}@${domain}`}));
