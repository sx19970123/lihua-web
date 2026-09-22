import CryptoJS from 'crypto-js';

// 安全边界声明：Key/IV 硬编码于前端源码（构建产物可见），仅作「记住我」密码与锁屏密码的本地混淆
// （防肩窥，避免 localStorage 落明文），不是真正的保密手段——拿到产物即可解密，勿将此模块用于新的保密场景
// 16 字节的 Key
const KEY = CryptoJS.enc.Utf8.parse("A1B2C3D4E5F6G7H8")
// 16 字节的 IV
const IV = CryptoJS.enc.Utf8.parse("H8G7F6E5D4C3B2A1")

// 加密
export const encrypt = (data: string): string => {
  const encrypted = CryptoJS.AES.encrypt(data, KEY, { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  return encrypted.toString()
}

// 解密
export const decrypt = (data: string): string => {
  const decrypted = CryptoJS.AES.decrypt(data, KEY, { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 })
  return decrypted.toString(CryptoJS.enc.Utf8)
}
