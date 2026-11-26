// 方案 A：把微信 openid 桥接成 CloudBase 正式账号。
// 设计原则：独立模块，不侵入现有 WorkBuddy SDK 的 session/LLM/存储逻辑。
// 依据：TencentCloudBase/CloudBase-AI-Toolkit 的 auth-nodejs-cloudbase skill
//   Web 侧正确姿势：setCustomSignFunc(fn) 注册取票回调 → 无参 signInWithCustomTicket()
// 私钥不存在前端；env ID 通过 VITE_CLOUDBASE_ENV 注入（公开值，非密钥）。
//
// ⚠️ 已知限制（必须在上线前验证）：
// WorkBuddy 数据面 cv_user_data 是 PostgreSQL 表（经 .cloud/database/rest 访问），
// 而 @cloudbase/js-sdk 的 database() 默认面向文档数据库。两者可能不是同一个存储。
// 若验证发现不同库，需改为：服务端代理 CloudBase 数据访问，或把微信轨数据落到
// 独立的文档集合 cv_user_data_wx，并在账号页标明双轨数据不互通。

let app = null
let cachedSession = null
let sdkPromise = null

export function cloudbaseConfigured() {
  return Boolean(import.meta.env.VITE_CLOUDBASE_ENV)
}

// 动态加载 SDK：只有真正走微信 CloudBase 登录时才下载这 ~1MB，
// 普通手机号 / WorkBuddy 登录首屏不受影响。
async function getApp() {
  if (!cloudbaseConfigured()) {
    throw new Error('未配置 CloudBase 环境 ID（VITE_CLOUDBASE_ENV）')
  }
  if (app) return app
  if (!sdkPromise) {
    sdkPromise = import('@cloudbase/js-sdk').then((mod) => {
      const cb = mod.default || mod
      app = cb.init({ env: import.meta.env.VITE_CLOUDBASE_ENV })
      return app
    }).catch((e) => { sdkPromise = null; throw e })
  }
  return sdkPromise
}

/** 用服务端换来的 CloudBase 自定义登录票据登录，返回 CloudBase session */
export async function signInWithWechatTicket(ticket) {
  if (!ticket) throw new Error('缺少微信登录票据')
  const sdk = await getApp()
  const auth = sdk.auth({ persistence: 'local' })

  // 官方要求：先注册“怎么拿票”的回调，再调用无参 signInWithCustomTicket()
  auth.setCustomSignFunc(async () => ticket)

  const res = await auth.signInWithCustomTicket()
  const user = res?.user || res?.data?.user || res
  cachedSession = {
    // CloudBase 不暴露 accessToken 给前端业务层，用 uid 作为身份标识
    id: user?.uid || user?.customUserId || '',
    customUserId: user?.customUserId || '',
    uid: user?.uid || '',
    provider: 'wechat-cloudbase',
    user,
  }
  return cachedSession
}

export function currentBridgeSession() {
  return cachedSession
}

export async function signOutBridge() {
  if (app) {
    try { await app.auth({ persistence: 'local' }).signOut() } catch { /* ignore */ }
  }
  cachedSession = null
}

/** 拿 CloudBase 的 database 实例（RLS 由 owner_id = auth.uid() 自动隔离） */
export async function bridgeDatabase() {
  const sdk = await getApp()
  return sdk.database()
}

/** CloudBase 轨的文件上传 */
export async function bridgeUploadFile(file, folder = 'files') {
  const sdk = await getApp()
  const cloudPath = `${folder}/${Date.now()}-${file.name}`
  await sdk.uploadFile({ cloudPath, filePath: file })
  return cloudPath
}

/** CloudBase 轨的临时访问 URL */
export async function bridgeTempUrl(cloudPath, expires = 3600) {
  if (!cloudPath) return null
  const sdk = await getApp()
  const res = await sdk.getTempFileURL({ fileList: [{ cloudPath, maxAge: expires }] })
  return res?.fileList?.[0]?.tempFileURL || null
}
