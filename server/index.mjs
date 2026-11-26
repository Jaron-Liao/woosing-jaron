// CodeVerse 服务端：静态站点 + 公众号网页授权（H5 微信登录）
// 无第三方依赖，只监听 $PORT，绑定 0.0.0.0
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { extname, join, normalize } from 'node:path'
import { loadConfig, AppError } from './config.mjs'
import { buildAuthorizeUrl, signState, verifyState, exchangeCode, fetchProfile } from './wechat.mjs'
import { issueCustomTicket } from './custom-login.mjs'
import { normalizeError } from './errors.mjs'
import { log as logger, createRateLimiter, securityHeaders } from './logger.mjs'

const cfg = loadConfig()
if (cfg.missing.length) {
  logger.warn('missing_config', { missing: cfg.missing })
}

// 显式允许的来源（同源静态站 + 发布域名），生产禁用通配符
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || '').trim()
const limiter = createRateLimiter({
  windowMs: Number(process.env.RATE_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_MAX || 90),
})
const MAX_BODY = Number(process.env.MAX_BODY_BYTES || 1024 * 1024)

/** 一次性票据存储（openid 等敏感信息留在服务端，前端只拿短期 ticket） */
const tickets = new Map()
const TICKET_TTL = 2 * 60 * 1000
const issueTicket = (payload) => {
  const id = randomBytes(18).toString('base64url')
  tickets.set(id, { ...payload, exp: Date.now() + TICKET_TTL })
  return id
}
const readTicket = (id) => {
  const t = tickets.get(id)
  if (!t) return null
  tickets.delete(id) // 一次性
  if (Date.now() > t.exp) return null
  return t
}
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of tickets) if (now > v.exp) tickets.delete(k)
}, 60 * 1000).unref()

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.map': 'application/json; charset=utf-8',
}

const json = (res, status, body) => {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  })
  res.end(data)
}

// 兼容原有调用点：所有 return json(...), log(req, status) 保持不变
const log = (req, status, extra = {}) => logger.request(req, status, extra)

async function serveStatic(req, res, pathname) {
  const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  let file = join(cfg.staticDir, safe)
  try {
    const st = await stat(file)
    if (st.isDirectory()) file = join(file, 'index.html')
  } catch {
    file = join(cfg.staticDir, 'index.html') // SPA 回退
  }
  const buf = await readFile(file)
  const ext = extname(file).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': buf.length,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  res.end(buf)
}

const server = createServer(async (req, res) => {
  req.startedAt = Date.now()
  req.reqId = randomBytes(6).toString('hex')
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const path = url.pathname

  // 安全头 + CORS 显式来源（每个响应都带，包括错误响应）
  securityHeaders(res, ALLOWED_ORIGIN || (req.headers.origin && cfg.baseUrl) || '')
  if (req.method === 'OPTIONS') {
    res.writeHead(204); res.end()
    return log(req, 204)
  }

  // 限流按 IP + 路径，健康检查不计入
  if (!path.startsWith('/health') && !path.startsWith('/ready')) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown'
    const { allowed, remaining } = limiter.check(`${ip}:${path}`)
    res.setHeader('X-RateLimit-Remaining', String(remaining))
    if (!allowed) {
      json(res, 429, { error: 'rate_limited', message: '请求过于频繁，请稍后重试', reqId: req.reqId })
      return log(req, 429)
    }
  }

  // 边界输入校验：拒绝超大请求体
  const len = Number(req.headers['content-length'] || 0)
  if (len > MAX_BODY) {
    json(res, 413, { error: 'payload_too_large', message: '请求体过大', reqId: req.reqId })
    return log(req, 413)
  }

  try {
    if (path === '/ready') {
      return json(res, 200, {
        ready: true, customLoginEnabled: cfg.customLoginEnabled,
        wechatConfigured: cfg.wechatConfigured, uptime: Math.round(process.uptime()),
      }), log(req, 200)
    }

    // 仅本地验证用：开启 ENABLE_VERIFY_ROUTE=1 才暴露，生产默认不存在
    if (process.env.ENABLE_VERIFY_ROUTE === '1' && path === '/__verify/pg.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(`<!doctype html><meta charset="utf-8"><title>CloudBase PostgreSQL 验证</title>
<body style="font:14px/1.6 system-ui;padding:24px"><p id="s">启动…</p><pre id="r" style="white-space:pre-wrap"></pre>
<script type="module">
const out = []
const push = (k, v) => { out.push({ [k]: v }); document.getElementById('r').textContent = JSON.stringify(out, null, 2) }
const step = (t) => document.getElementById('s').textContent = t
try {
  const mod = await import('https://esm.sh/@cloudbase/js-sdk@3.11.2')
  const cloudbase = mod.default || mod
  const app = cloudbase.init({ env: ${JSON.stringify(cfg.cloudbaseEnv || '')} })
  const auth = app.auth({ persistence: 'local' })
  const ticket = new URLSearchParams(location.search).get('ticket') || ''
  auth.setCustomSignFunc(async () => ticket)
  const s = await auth.signInWithCustomTicket()
  push('login_uid', s?.user?.uid || s?.uid || null)

  push('capabilities', {
    models: typeof app.models,
    runSQL: typeof app.models?.$runSQL,
    mysql: typeof app.mysql,
    rdb: typeof app.rdb,
  })

  if (typeof app.models?.$runSQL === 'function') {
    try {
      const r1 = await app.models.$runSQL("select current_database() as db, version() as v")
      push('sql_ok', { rows: r1?.data ?? r1 })
    } catch (e) { push('sql_error', { code: e?.code, message: String(e?.message || e).slice(0, 300) }) }
  }

  if (typeof app.mysql === 'function') {
    try {
      const r2 = await app.mysql().from('cv_user_data').select().limit(1)
      push('mysql_ok', { count: r2?.data?.length ?? null })
    } catch (e) { push('mysql_error', { code: e?.code, message: String(e?.message || e).slice(0, 300) }) }
  }
  step('完成')
} catch (e) { step('失败'); push('fatal', String(e?.message || e)) }
</script>`)
      return log(req, 200)
    }

    if (process.env.ENABLE_VERIFY_ROUTE === '1' && path === '/__verify/db.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(`<!doctype html><meta charset="utf-8"><title>CloudBase 数据层验证</title>
<body style="font:14px/1.6 system-ui;padding:24px"><p id="s">启动…</p><pre id="r" style="white-space:pre-wrap"></pre>
<script type="module">
const log = (t) => { document.getElementById('s').textContent = t }
const out = [] 
const push = (k, v) => { out.push({ [k]: v }); document.getElementById('r').textContent = JSON.stringify(out, null, 2) }
try {
  const mod = await import('https://esm.sh/@cloudbase/js-sdk@3.11.2')
  const cloudbase = mod.default || mod
  const app = cloudbase.init({ env: ${JSON.stringify(cfg.cloudbaseEnv || '')} })
  const auth = app.auth({ persistence: 'local' })
  const ticket = new URLSearchParams(location.search).get('ticket') || ''
  auth.setCustomSignFunc(async () => ticket)
  const s = await auth.signInWithCustomTicket()
  push('login', { ok: true, uid: s?.user?.uid || s?.uid || null })

  const db = app.database()
  const col = db.collection('cv_user_data')
  try {
    const add = await col.add({ kind: 'probe', key: 'k1', value: { n: 1 }, owner_name: 'probe' })
    push('add', { ok: true, id: add?.id || add?._id || null })
  } catch (e) { push('add_error', { code: e?.code, message: String(e?.message || e) }) }

  try {
    const got = await col.where({ kind: 'probe' }).limit(3).get()
    push('read', { ok: true, count: got?.data?.length ?? null, sample: got?.data?.[0] ? Object.keys(got.data[0]) : [] })
  } catch (e) { push('read_error', { code: e?.code, message: String(e?.message || e) }) }

  log('完成')
} catch (e) { log('失败'); push('fatal', { message: String(e?.message || e) }) }
</script>`)
      return log(req, 200)
    }

    if (process.env.ENABLE_VERIFY_ROUTE === '1' && path === '/__verify/custom-login.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
      res.end(`<!doctype html><meta charset="utf-8"><title>CloudBase 自定义登录验证</title>
<body style="font:14px/1.6 system-ui;padding:24px">
<p id="s">加载 SDK 中…</p><pre id="r" style="white-space:pre-wrap"></pre>
<script type="module">
const out = (t) => { document.getElementById('s').textContent = t; console.log(t) }
const raw = (o) => document.getElementById('r').textContent = JSON.stringify(o, null, 2)
try {
  const mod = await import('https://esm.sh/@cloudbase/js-sdk@3.11.2')
  const cloudbase = mod.default || mod
  const app = cloudbase.init({ env: ${JSON.stringify(cfg.cloudbaseEnv || '')} })
  const auth = app.auth({ persistence: 'local' })
  const ticket = new URLSearchParams(location.search).get('ticket') || ''
  out('SDK 已加载，开始 signInWithCustomTicket…')
  auth.setCustomSignFunc(async () => ticket)
  const res = await auth.signInWithCustomTicket()
  out('成功')
  raw({ ok: true, uid: res?.user?.uid || res?.uid || null, customUserId: res?.user?.customUserId || res?.customUserId || null })
} catch (e) {
  out('失败')
  raw({ ok: false, name: e?.name, code: e?.code, message: String(e?.message || e) })
}
</script>`)
      return log(req, 200)
    }

    if (path === '/health' || path === '/api/health') {
      return json(res, 200, {
        ok: true, wechatConfigured: cfg.wechatConfigured,
        customLoginEnabled: cfg.customLoginEnabled,
        missing: cfg.missing, uptime: Math.round(process.uptime()),
      }), log(req, 200)
    }

    // 仅回显“是否已配置”，绝不返回私钥内容或路径细节
    if (path === '/api/wechat/config-state') {
      return json(res, 200, { state: cfg.customLoginEnabled ? 'ready' : 'unconfigured' }), log(req, 200)
    }

    if (path === '/api/wechat/status') {
      // 前端据此决定是否展示「微信一键登录」
      return json(res, 200, {
        configured: cfg.wechatConfigured,
        customLoginEnabled: cfg.customLoginEnabled,
        scope: cfg.scope,
      }), log(req, 200)
    }

    if (path === '/api/wechat/authorize') {
      if (!cfg.wechatConfigured) {
        return json(res, 503, { error: 'wechat_not_configured', message: '服务端未配置公众号授权凭据' }), log(req, 503)
      }
      const next = url.searchParams.get('next') || '#/'
      const state = signState(cfg, { next: next.startsWith('#') ? next : '#/' })
      res.writeHead(302, { Location: buildAuthorizeUrl(cfg, state), 'Cache-Control': 'no-store' })
      res.end()
      return log(req, 302)
    }

    if (path === '/api/wechat/callback') {
      if (!cfg.wechatConfigured) {
        return json(res, 503, { error: 'wechat_not_configured', message: '服务端未配置公众号授权凭据' }), log(req, 503)
      }
      const code = url.searchParams.get('code')
      if (!code) throw new AppError(400, 'missing_code', '微信未返回 code')
      const { next } = verifyState(cfg, url.searchParams.get('state'))
      const token = await exchangeCode(cfg, code)
      let profile = { openid: token.openid, nickname: '', headimgurl: '', unionid: token.unionid || '' }
      if (cfg.scope === 'snsapi_userinfo') {
        try {
          const info = await fetchProfile(cfg, token.access_token, token.openid)
          profile = {
            openid: info.openid, nickname: info.nickname || '',
            headimgurl: info.headimgurl || '', unionid: info.unionid || token.unionid || '',
          }
        } catch (e) {
          // 拿不到资料不影响身份识别，openid 已经拿到
          console.warn(JSON.stringify({ level: 'warn', msg: 'userinfo_failed', detail: e.message }))
        }
      }
      // 方案 A：为这个微信身份签发 CloudBase 自定义登录票据。
      // 失败时降级为「仅识别身份」的一次性票据，前端会提示改用手机号登录，
      // 不让用户在授权中途撞到白屏或死循环。
      let sessionTicket = null
      let loginError = null
      try {
        const issued = await issueCustomTicket(profile.openid)
        sessionTicket = issueTicket({ ...issued, kind: 'session', profile })
      } catch (e) {
        loginError = e.code || 'ticket_issue_failed'
        console.warn(JSON.stringify({ level: 'warn', msg: 'custom_ticket_skipped', detail: loginError }))
        sessionTicket = issueTicket({ ...profile, kind: 'profile' })
      }
      const dest = `${cfg.baseUrl}/?wechat_ticket=${sessionTicket}`
        + `${loginError ? `&wechat_login_error=${encodeURIComponent(loginError)}` : ''}`
        + `${next && next !== '#/' ? `&next=${encodeURIComponent(next)}` : ''}`
      res.writeHead(302, { Location: dest, 'Cache-Control': 'no-store' })
      res.end()
      return log(req, 302)
    }

    if (path === '/api/wechat/profile') {
      const t = readTicket(url.searchParams.get('ticket') || '')
      if (!t) throw new AppError(400, 'bad_ticket', '票据无效或已过期')
      if (t.kind === 'session') {
        // 只把 CloudBase 票据交给前端，openid 与 profile 留在服务端
        return json(res, 200, {
          mode: 'session',
          ticket: t.ticket,
          customUserId: t.customUserId,
          profile: { nickname: t.profile?.nickname || '', avatar: t.profile?.headimgurl || '' },
        }), log(req, 200)
      }
      // 降级：只回身份资料，openid 脱敏
      return json(res, 200, {
        mode: 'profile',
        nickname: t.nickname, avatar: t.headimgurl,
        unionid: t.unionid ? 'present' : '', identity: `wx_${t.openid.slice(0, 4)}***${t.openid.slice(-4)}`,
      }), log(req, 200)
    }

    if (path.startsWith('/api/')) throw new AppError(404, 'not_found', '接口不存在')

    await serveStatic(req, res, path)
    return log(req, res.statusCode)
  } catch (err) {
    const { status, body } = normalizeError(err, req.reqId)
    if (!(err instanceof AppError)) {
      logger.error('unhandled', { reqId: req.reqId, message: err.message, stack: err.stack?.split('\n').slice(0, 3) })
    }
    json(res, status, body)
    return log(req, status)
  }
})

server.listen(cfg.port, cfg.host, () => {
  logger.info('server_started', {
    port: cfg.port, host: cfg.host,
    wechatConfigured: cfg.wechatConfigured,
    customLoginEnabled: cfg.customLoginEnabled,
    staticDir: cfg.staticDir,
  })
})

const shutdown = (sig) => {
  logger.info('shutting_down', { signal: sig })
  limiter.stop()
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 8000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
