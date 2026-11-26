// 统一 API 客户端：Base URL 走环境变量、错误映射为可读文案、
// 4xx 不重试、5xx 最多重试 3 次、fetch 失败给离线提示。
// 所有业务组件只通过这里访问后端，不硬编码 URL。

const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

/** 后端错误码 → 用户能看懂的中文 */
const MESSAGES = {
  bad_ticket: '登录凭证已过期，请重新获取',
  bad_state: '登录状态校验失败，请重新发起登录',
  state_expired: '登录已超时，请重新发起',
  missing_code: '授权未返回有效凭证，请重试',
  wechat_not_configured: '服务端尚未配置微信登录',
  custom_login_not_enabled: '服务端尚未开启自定义登录',
  custom_login_not_configured: '服务端缺少 CloudBase 配置',
  ticket_issue_failed: '登录凭证签发失败，请稍后重试',
  rate_limited: '请求太频繁，请稍等一下',
  payload_too_large: '内容太大，请精简后重试',
  not_found: '请求的接口不存在',
  internal_error: '服务暂时不可用，请稍后重试',
}

export class ApiError extends Error {
  constructor(code, message, status, reqId) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.reqId = reqId
  }
  /** 4xx 属于用户/请求问题，重试没有意义 */
  get retryable() { return this.status >= 500 }
}

let offlineHandler = null
/** 注册全局离线提示（App 层接一个 toast） */
export function onOffline(handler) { offlineHandler = handler }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * @param {string} path 以 / 开头的接口路径
 * @param {{ method?, body?, signal?, retries? }} options
 */
export async function api(path, options = {}) {
  const { method = 'GET', body, signal, retries = 3 } = options
  const url = `${BASE}${path}`
  let lastErr

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        signal,
        credentials: 'same-origin',
      })
      const text = await res.text()
      let data = null
      try { data = text ? JSON.parse(text) : null } catch { data = { message: text.slice(0, 160) } }

      if (!res.ok) {
        const code = data?.error || `http_${res.status}`
        const msg = MESSAGES[code] || data?.message || '请求失败，请稍后重试'
        throw new ApiError(code, msg, res.status, data?.reqId)
      }
      return data
    } catch (err) {
      lastErr = err
      // 网络断开：不重试，直接通知 UI
      if (err instanceof TypeError || err.name === 'AbortError') {
        if (err.name !== 'AbortError') offlineHandler?.('网络连接已断开，请检查网络后重试')
        throw new ApiError('offline', '网络连接不可用', 0)
      }
      if (!(err instanceof ApiError)) {
        throw new ApiError('unknown', '请求异常，请稍后重试', 0)
      }
      if (!err.retryable || attempt >= retries) throw err
      await sleep(350 * (attempt + 1)) // 递增退避
    }
  }
  throw lastErr
}

export const endpoints = {
  health: () => api('/health'),
  ready: () => api('/ready'),
  wechatStatus: () => api('/api/wechat/status'),
  configState: () => api('/api/wechat/config-state'),
  profile: (ticket) => api(`/api/wechat/profile?ticket=${encodeURIComponent(ticket)}`),
}
