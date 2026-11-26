import test from 'node:test'
import assert from 'node:assert/strict'
import { AppError, errors, normalizeError } from '../errors.mjs'
import { signState, verifyState, buildAuthorizeUrl } from '../wechat.mjs'
import { createRateLimiter } from '../logger.mjs'
import { loadConfig } from '../config.mjs'

const cfg = { ticketSecret: 'x'.repeat(40), wechatAppId: 'wx_test', scope: 'snsapi_userinfo', baseUrl: 'https://example.com' }

test('AppError 携带状态与错误码', () => {
  const e = errors.badRequest('缺少参数', 'missing_param')
  assert.equal(e.status, 400)
  assert.equal(e.code, 'missing_param')
  assert.equal(e.message, '缺少参数')
  assert.ok(e instanceof AppError)
})

test('normalizeError 不外泄堆栈，附带 reqId', () => {
  const r = normalizeError(new AppError(400, 'bad_ticket', '票据无效'), 'req-1')
  assert.equal(r.status, 400)
  assert.deepEqual(r.body, { error: 'bad_ticket', message: '票据无效', reqId: 'req-1' })
  const u = normalizeError(new Error('db password leak in stack'), 'req-2')
  assert.equal(u.status, 500)
  assert.equal(u.body.error, 'internal_error')
  assert.ok(!JSON.stringify(u).includes('password'))
})

test('signState / verifyState 正常往返', () => {
  const s = signState(cfg, { next: '#/account' })
  const p = verifyState(cfg, s)
  assert.equal(p.next, '#/account')
  assert.ok(p.t > 0)
  assert.ok(typeof p.n === 'string')
})

test('state 被篡改必须拒绝', () => {
  const s = signState(cfg)
  const [body] = s.split('.')
  assert.throws(() => verifyState(cfg, `${body}.forged`), /校验失败/)
})

test('state 超时必须拒绝', () => {
  const s = signState(cfg)
  assert.throws(() => verifyState(cfg, s, -1), /超时/)
})

test('buildAuthorizeUrl 参数与编码正确', () => {
  const u = buildAuthorizeUrl(cfg, 'state-abc')
  const p = new URL(u)
  assert.equal(p.host, 'open.weixin.qq.com')
  assert.equal(p.searchParams.get('appid'), 'wx_test')
  assert.equal(p.searchParams.get('scope'), 'snsapi_userinfo')
  assert.equal(p.searchParams.get('redirect_uri'), 'https://example.com/api/wechat/callback')
  assert.equal(p.searchParams.get('state'), 'state-abc')
})

test('限流器在窗口内拒绝超额请求', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 2 })
  assert.equal(limiter.check('a').allowed, true)
  assert.equal(limiter.check('a').allowed, true)
  assert.equal(limiter.check('a').allowed, false)
  assert.equal(limiter.check('b').allowed, true) // 不同 key 独立
  limiter.stop()
})

test('配置集中校验：未启用自定义登录时不报缺失', () => {
  const c = loadConfig({ PORT: '4321', WECHAT_APPID: '', WECHAT_APP_SECRET: '' })
  assert.equal(c.port, 4321)
  assert.equal(c.customLoginEnabled, false)
  assert.deepEqual(c.missing, [])
})

test('配置集中校验：启用自定义登录但缺私钥路径必须报缺失', () => {
  const c = loadConfig({ CUSTOM_LOGIN_ENABLED: '1', CLOUDBASE_ENV: 'env-1' })
  assert.equal(c.customLoginEnabled, true)
  assert.ok(c.missing.includes('CLOUDBASE_CUSTOM_LOGIN_KEY'))
})
