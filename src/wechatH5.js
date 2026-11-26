// 微信内 H5 授权（公众号 snsapi_userinfo）前端桥接。
// 统一走 src/api.js：错误映射、重试策略集中在一处。
// 纯静态部署时 /api/wechat/status 不存在 → 探测失败即视为未配置，
// 界面上不出现这个入口，不影响现有登录方式。
import { endpoints } from './api.js'

let cachedStatus = null

export async function wechatH5Status() {
  if (cachedStatus) return cachedStatus
  try {
    const data = await endpoints.wechatStatus()
    cachedStatus = {
      configured: Boolean(data.configured),
      customLoginEnabled: Boolean(data.customLoginEnabled),
      scope: data.scope || '',
    }
  } catch {
    cachedStatus = { configured: false, customLoginEnabled: false, scope: '' }
  }
  return cachedStatus
}

export function startWechatH5(next = '#/') {
  location.assign(`/api/wechat/authorize?next=${encodeURIComponent(next)}`)
}

/** 授权回调落地后取一次性票据换身份资料（票据 2 分钟过期、一次性使用） */
export async function takeWechatTicket() {
  const url = new URL(location.href)
  const ticket = url.searchParams.get('wechat_ticket')
  if (!ticket) return null
  url.searchParams.delete('wechat_ticket')
  url.searchParams.delete('next')
  history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  try {
    return await endpoints.profile(ticket)
  } catch {
    return null
  }
}
