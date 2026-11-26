// 公众号网页授权（snsapi_userinfo）的纯函数实现。
// 关键安全点：AppSecret 只在服务端使用，前端永远拿不到 access_token。
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { AppError } from './config.mjs'

const AUTH_BASE = 'https://open.weixin.qq.com/connect/oauth2/authorize'
const API_BASE = 'https://api.weixin.qq.com'

export function buildAuthorizeUrl(cfg, state) {
  const u = new URL(AUTH_BASE)
  u.searchParams.set('appid', cfg.wechatAppId)
  u.searchParams.set('redirect_uri', `${cfg.baseUrl}/api/wechat/callback`)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', cfg.scope)
  u.searchParams.set('state', state)
  return `${u.toString()}#wechat_redirect`
}

/** state = base64url(payload) + '.' + hmac，10 分钟过期，防 CSRF 与重放 */
export function signState(cfg, payload = {}) {
  const body = Buffer.from(JSON.stringify({ ...payload, n: randomBytes(6).toString('hex'), t: Date.now() })).toString('base64url')
  const sig = createHmac('sha256', cfg.ticketSecret).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(cfg, state, ttlMs = 10 * 60 * 1000) {
  const [body, sig] = String(state || '').split('.')
  if (!body || !sig) throw new AppError(400, 'bad_state', '授权状态校验失败')
  const expect = createHmac('sha256', cfg.ticketSecret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expect)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new AppError(400, 'bad_state', '授权状态校验失败')
  let payload
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) } catch {
    throw new AppError(400, 'bad_state', '授权状态解析失败')
  }
  if (!payload.t || Date.now() - payload.t > ttlMs) throw new AppError(400, 'state_expired', '授权已超时，请重新扫码')
  return payload
}

async function wechatGet(path, params) {
  const u = new URL(API_BASE + path)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const res = await fetch(u, { headers: { 'User-Agent': 'codeverse-server' } })
  const json = await res.json().catch(() => ({}))
  if (json.errcode) {
    throw new AppError(502, 'wechat_api_error', `微信接口返回 ${json.errcode}: ${json.errmsg || ''}`)
  }
  return json
}

/** code → access_token + openid */
export async function exchangeCode(cfg, code) {
  return wechatGet('/sns/oauth2/access_token', {
    appid: cfg.wechatAppId,
    secret: cfg.wechatSecret,
    code,
    grant_type: 'authorization_code',
  })
}

/** access_token + openid → 用户资料（snsapi_userinfo 才有 nickname/headimgurl） */
export async function fetchProfile(cfg, accessToken, openid) {
  return wechatGet('/sns/userinfo', { access_token: accessToken, openid, lang: 'zh_CN' })
}
