const baseURL = import.meta.env.VITE_APP_BASE_API
const origin = window.location.origin

/**
 * 通用下载，根据传入参数不同自动调用不同的下载函数
 * @param data 连接｜blob
 * @param fileName 附件名称
 */
export const download = (data: string | Blob, fileName?: string) => {
    if (data instanceof Blob) {
        downloadBlob(data, fileName);
    } else if (data.startsWith(baseURL) || data.startsWith(origin) || data.startsWith("http")) {
        downloadFromUrl(data, fileName)
    }
}

// 下载blob附件（objectURL 延迟释放：a[download] 点击即取流，60s 足够；
// 不 revoke 则每次下载泄漏一个 blob 引用直至文档卸载）
export const downloadBlob = (blob: Blob, filename?: string) => {
    const url = URL.createObjectURL(blob)
    downloadFromUrl(url, filename)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

// 通过url下载
export const downloadFromUrl = (url: string, fileName?: string) => {
    const linkElement = document.createElement('a');
    linkElement.href = url;
    if (fileName) {
        linkElement.download = fileName;
    }
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
}