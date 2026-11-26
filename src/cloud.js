import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

// publicConfig from workbuddy_cloud_service (public values, safe in frontend).
// endpoint / publishableKey / oauthRelayBaseUrl all come from the activated app.
export const PUBLIC_CONFIG = {
  endpoint: 'https://codeverse-workbench.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_e5UDANh6gzpXjUfL1tiGNE_otIkxi8HRMi1n4J5vD5dgsPz3JVL6E4j',
}

export const cloud = createWorkBuddyCloud({
  endpoint: PUBLIC_CONFIG.endpoint,
  oauthRelayBaseUrl: PUBLIC_CONFIG.oauthRelayBaseUrl,
  publishableKey: PUBLIC_CONFIG.publishableKey,
})

// ---- 部署域名判定 ----
// WorkBuddy 的 OAuth 中继只接受「已发布应用」的 https 域名作为 callback_url，
// 本地预览（localhost）与第三方域名（如 GitHub Pages）一律返回 400：
//   callback_url must be an absolute https:// URL of a published application
//   callback_url is not a registered domain of any published application
// 因此第三方登录必须先判断当前 origin，否则用户只会撞到那张“暂不支持”的错误页。
const PUBLISHED_ORIGIN = new URL(PUBLIC_CONFIG.endpoint).origin
// 发布域名前面有 sharecode 网关，缺了它连静态资源都是 403“链接不完整”
const DEFAULT_SHARECODE = 'P26ACHYNBX'

export function shareCode() {
  try {
    return new URLSearchParams(location.search).get('sharecode') || DEFAULT_SHARECODE
  } catch {
    return DEFAULT_SHARECODE
  }
}

/** 当前是否运行在已发布域名上（只有这里能走微信/WorkBuddy 第三方登录） */
export function isPublishedOrigin() {
  try {
    return location.origin === PUBLISHED_ORIGIN
  } catch {
    return false
  }
}

/** 发布域名入口（自动带 sharecode），可附加 hash 路由，如 '#/login?oauth=wechat' */
export function publishedEntryUrl(hashPath = '') {
  const url = new URL(PUBLISHED_ORIGIN)
  url.searchParams.set('sharecode', shareCode())
  return `${url.toString()}${hashPath ? `#${hashPath.replace(/^#/, '')}` : ''}`
}

/** 是否微信内置浏览器（relay 写死 snsapi_login 扫码，微信内拿不到 H5 授权） */
export function isWeChatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

// ---- Auth helpers ----
// 方案 A 双轨：微信 CloudBase 登录后，优先返回桥接 session；
// 其余（手机号 / WorkBuddy OAuth）仍走原来的 WorkBuddy SDK。
import { currentBridgeSession } from './cloudbase-bridge.js'

export async function currentSession() {
  const bridged = currentBridgeSession()
  if (bridged?.id) return bridged
  const { data, error } = await cloud.auth.getSession()
  return error ? null : data?.session || data || null
}

// Web WeChat / WorkBuddy OAuth: returns URL, caller navigates in same tab.
// redirectTo must stay on the site root; business query params (e.g. sharecode)
// and the hash are preserved across the round trip for both providers.
// 非发布域名直接短路：中继必然 400，不如交给 UI 引导用户去发布地址。
export async function startOAuth(provider) {
  if (!isPublishedOrigin()) {
    const err = new Error('微信 / WorkBuddy 登录需要在应用发布后的网址上使用')
    err.code = 'ORIGIN_NOT_PUBLISHED'
    throw err
  }
  const back = new URL(location.href)
  back.pathname = '/'
  back.hash = ''
  for (const k of ['code', 'state', 'provider']) back.searchParams.delete(k)
  // 中继回跳时不一定带 provider，自带一个标记，回调分发才不会落到“缺少登录方式”
  back.searchParams.set('oauth', provider)
  const { data, error } = await cloud.auth.signInWithOAuth({
    provider,
    redirectTo: back.toString(),
  })
  if (error) throw new Error(error.message)
  return data.url
}

// Callback dispatcher: call once at app entry, before any auth guard.
// Always returns { session, error } so an error can never be mistaken for a
// signed-in session by the caller.
export async function restoreAuth() {
  const url = new URL(location.href)
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
    return { session: null, error: null }
  }
  const clearCallbackParams = () => {
    for (const k of ['code', 'state', 'provider', 'oauth']) url.searchParams.delete(k)
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }
  // provider 优先，其次读我们自己埋的 oauth 标记（中继回跳可能只带 code/state）
  const provider = url.searchParams.get('provider') || url.searchParams.get('oauth')
  if (provider !== 'workbuddy' && provider !== 'wechat') {
    const description = url.searchParams.get('error_description')
    const reason = url.searchParams.get('error')
    clearCallbackParams()
    return {
      session: null,
      error: description || (reason ? `授权失败：${reason}` : '授权回调缺少有效的登录方式，请重新登录。'),
    }
  }
  const handler = provider === 'workbuddy'
    ? cloud.auth.handleWorkBuddyCallback
    : cloud.auth.handleWechatWebCallback
  if (typeof handler !== 'function') {
    clearCallbackParams()
    return { session: null, error: '暂时无法使用此方式登录，请联系应用管理员。' }
  }
  const { data, error } = await handler.call(cloud.auth)
  clearCallbackParams()
  if (error) return { session: null, error: error.message }
  return { session: data?.session || data || null, error: null }
}

// Phone OTP
let pendingPhoneOtp = null
export async function sendPhoneCode(phone) {
  if (!/^1\d{10}$/.test(phone)) throw new Error('请输入正确的 11 位手机号')
  const { data, error } = await cloud.auth.sendOtp({ phone })
  if (error) throw new Error(error.message)
  pendingPhoneOtp = { phone, ...data }
  return data
}
export async function verifyPhoneCode(phone, token) {
  const p = pendingPhoneOtp
  if (!p || p.phone !== phone) throw new Error('请先获取验证码')
  const { data, error } = await cloud.auth.verifyOtp({
    phone: p.phone, verificationId: p.verificationId,
    isExistingUser: p.isExistingUser, token,
  })
  if (error) throw new Error(error.message)
  pendingPhoneOtp = null
  return data?.session || data || null
}

// ---- Cloud user data (per-user isolated via RLS) ----
// 微信 CloudBase 轨所在环境只有 PostgreSQL、没有文档数据库，
// 所以这一轨的云端调用会失败。为了不让聊天记录 / 伙伴配置丢失，
// 统一降级到本地 IndexedDB（Dexie），并在结果里标记 local=true。
import { db as localDb } from './db.js'

async function localGet(kind, key) {
  const row = await localDb.userData.get([kind, key])
  return row ? { value: row.value, updated_at: row.updatedAt, local: true } : null
}
async function localPut(kind, key, value) {
  const updatedAt = new Date().toISOString()
  await localDb.userData.put({ kind, key, value, updatedAt })
  return { value, updated_at: updatedAt, local: true }
}

/** 微信轨：优先云端，云端不可用则本地；任何失败都不向调用方抛出 */
async function bridgedData(action, kind, key, value) {
  try {
    const { bridgeDatabase } = await import('./cloudbase-bridge.js')
    const db = await bridgeDatabase()
    const col = db.collection('cv_user_data')
    if (action === 'get') {
      const res = await col.where({ kind, key }).limit(1).get()
      return res?.data?.[0] || null
    }
    const found = await col.where({ kind, key }).limit(1).get()
    const row = found?.data?.[0]
    const payload = { kind, key, value, updated_at: new Date().toISOString() }
    if (row?._id) {
      await col.doc(row._id).update(payload)
      return { ...row, ...payload }
    }
    const added = await col.add({ ...payload })
    return { id: added?.id, ...payload }
  } catch {
    // DATABASE_COLLECTION_NOT_EXIST 等：自动落到本地，保证功能可用
    return action === 'get' ? localGet(kind, key) : localPut(kind, key, value)
  }
}

export async function loadUserData(kind, key) {
  const session = await currentSession()
  if (!session) return null
  if (session.provider === 'wechat-cloudbase') return bridgedData('get', kind, key)
  const { data, error } = await cloud.database
    .from('cv_user_data').select('value, updated_at')
    .eq('kind', kind).eq('key', key).maybeSingle()
  if (error) throw error
  return data
}
export async function saveUserData(kind, key, value) {
  const session = await currentSession()
  if (!session) throw new Error('请先登录')
  const name = session.user?.name || null
  if (session.provider === 'wechat-cloudbase') return bridgedData('put', kind, key, value)
  // upsert on (owner_id, kind, key) — owner_id omitted, DB fills from auth.uid()
  const { data, error } = await cloud.database
    .from('cv_user_data')
    .upsert({ kind, key, value, owner_name: name, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id,kind,key' })
    .select()
  if (error) throw error
  return data?.[0]
}

// ---- Cloud storage (COS-backed, per-user) ----
export async function uploadFile(file, folder = 'files') {
  const session = await currentSession()
  if (!session) throw new Error('请先登录')
  if (session.provider === 'wechat-cloudbase') {
    let path
    try {
      const { bridgeUploadFile } = await import('./cloudbase-bridge.js')
      path = await bridgeUploadFile(file, folder)
    } catch {
      // 云存储不可用：把文件本体落到本地 IndexedDB，保证导入/下载照样可用
      path = `${folder}/${crypto.randomUUID()}-${file.name}`
      const dataUrl = await new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result)
        fr.onerror = () => reject(fr.error)
        fr.readAsDataURL(file)
      })
      await localPut('blob', path, { name: file.name, dataUrl })
    }
    // 登记索引，供 listFiles 读取
    try {
      const prev = await loadUserData('uploads', folder)
      const files = Array.isArray(prev?.value?.files) ? prev.value.files : []
      await saveUserData('uploads', folder, { files: [...files, { path, name: file.name, at: Date.now() }].slice(-200) })
    } catch { /* 索引失败不影响上传成功 */ }
    return path
  }
  const path = cloud.storage.userPath(session.user.id, `${folder}/${crypto.randomUUID()}-${file.name}`)
  const { error } = await cloud.storage.upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return path
}
export async function listFiles(folder = 'files') {
  const session = await currentSession()
  if (!session) return []
  if (session.provider === 'wechat-cloudbase') {
    // 文档库里存文件索引；取回后转临时 URL。没有记录时返回空数组。
    const rows = await loadUserData('uploads', folder)
    return Array.isArray(rows?.value?.files) ? rows.value.files : []
  }
  const { data, error } = await cloud.storage.list(`users/${session.user.id}/${folder}`, { limit: 100 })
  return error ? [] : (data || [])
}
export async function signedUrl(path, ttl = 3600) {
  const session = await currentSession()
  if (session?.provider === 'wechat-cloudbase') {
    try {
      const { bridgeTempUrl } = await import('./cloudbase-bridge.js')
      const url = await bridgeTempUrl(path, ttl)
      if (url) return url
    } catch { /* 落到本地副本 */ }
    const local = await localGet('blob', path)
    return local?.value?.dataUrl || null
  }
  const { data, error } = await cloud.storage.createSignedUrl(path, ttl)
  return error ? null : data?.url
}

// ---- LLM (keyless) for real Agent chat ----
// The API ONLY supports streaming. Non-streaming requests are rejected with
// `request_stream_required`. Collect SSE deltas into a full reply here.

let cachedModelId = null

export async function listModels() {
  const models = await cloud.llm.models.list()
  const list = Array.isArray(models) ? models : (models?.data || [])
  const usable = list.filter((m) => m.disabled !== true && m.enabled !== false)
  return usable
}

async function pickModel() {
  if (cachedModelId) return cachedModelId
  const models = await listModels()
  if (models.length === 0) {
    throw new Error('当前应用未配置可用模型，请在 WorkBuddy 管理页开通 LLM 能力。')
  }
  cachedModelId = models[0].id
  return cachedModelId
}

// onDelta(text) receives each token for live rendering; returns full reply.
export async function askAgent(messages, personality = '你是 CodeVerse 数学工作台的学习伙伴，简洁友好地回答。', onDelta) {
  const model = await pickModel()
  let answer = ''
  const stream = cloud.llm.chat.completions.create({
    model,
    messages: [{ role: 'system', content: personality }, ...messages],
    stream: true,
    stream_options: { include_usage: true },
  })
  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta
    if (delta?.content) {
      answer += delta.content
      if (typeof onDelta === 'function') onDelta(delta.content)
    }
  }
  return answer || '（无回复）'
}
