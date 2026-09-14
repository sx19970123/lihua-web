import {createMD5} from 'hash-wasm';

/**
 * 创建子线程进行文件 hash 计算
 * @param event
 */
self.onmessage = async (event) => {
    const chunks = event.data
    // 初始化md5计算工具
    const md5 = await createMD5();
    // read读取函数
    const read = (i: number) => {
        // 读取完成后调用digest()返回哈希
        if (i >= chunks.length) {
            self.postMessage(md5.digest("hex"))
            return
        }
        chunks[i].arrayBuffer().then((data: ArrayBuffer) => {
            md5.update(new Uint8Array(data));
            self.postMessage(Math.trunc(i * 100 / chunks.length))
            read(i + 1)
        }).catch((e: unknown) => {
            // 分片读取失败上报主线程（协议 {type:'error'}），否则哈希计算静默中断、上传方永久等待
            self.postMessage({type: 'error', message: `分片读取失败：${(e as Error)?.message ?? e}`})
        })
    }
    read(0)
}
