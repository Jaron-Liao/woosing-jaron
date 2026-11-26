// 结构化 JSON 日志，贯穿 requestId；不记录令牌、密钥、隐私数据
let serviceName = 'codeverse-server'

export function initLogger(name) {
  serviceName = name
}

const write = (level, fields) => {
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    service: serviceName,
    ...fields,
  })
  ;(level === 'error' ? process.stderr : process.stdout).write(line + '\n')
}

export const log = {
  info: (msg, fields = {}) => write('info', { msg, ...fields }),
  warn: (msg, fields = {}) => write('warn', { msg, ...fields }),
  error: (msg, fields = {}) => write('error', { msg, ...fields }),
  request: (req, status, extra = {}) => write(status >= 500 ? 'error' : 'info', {
    msg: 'http_request',
    reqId: req.reqId,
    method: req.method,
    path: req.url?.split('?')[0],
    status,
    ms: Date.now() - req.startedAt,
    ...extra,
  }),
}

/** 简易固定窗口限流：按 IP + 路径，默认 60 次/分钟 */
export function createRateLimiter({ windowMs = 60_000, max = 60 } = {}) {
  const buckets = new Map()
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k)
  }, windowMs).unref?.()
  return {
    check(key) {
      const now = Date.now()
      const b = buckets.get(key)
      if (!b || now > b.reset) {
        buckets.set(key, { count: 1, reset: now + windowMs })
        return { allowed: true, remaining: max - 1 }
      }
      b.count += 1
      return { allowed: b.count <= max, remaining: Math.max(0, max - b.count) }
    },
    stop() { clearInterval(sweep) },
  }
}

/** 生产安全头：显式来源，不用通配符 */
export function securityHeaders(res, allowedOrigin) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('X-XSS-Protection', '0')
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.setHeader('Vary', 'Origin')
  }
}
