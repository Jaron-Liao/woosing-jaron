// 方案 A 最小验证：服务端签票 → 浏览器内用 CloudBase Web SDK 换 session。
// 严格不读取、不打印私钥内容；只输出是否存在、票据是否可用、最终 uid。
import { chromium } from 'playwright'
import { existsSync, statSync } from 'node:fs'
import { spawn } from 'node:child_process'

const KEY_PATH = 'C:/secure/cv/tcb_custom_login.json'
const ENV_ID = 'jaron-12305-d2gl0tzsrf2a68c59'
const PORT = 4311

if (!existsSync(KEY_PATH)) {
  console.log('[X] 私钥文件不存在:', KEY_PATH)
  console.log('    请先从 CloudBase 控制台下载并放到该路径，再重跑本脚本。')
  process.exit(2)
}
console.log('[1] 私钥文件存在，大小', statSync(KEY_PATH).size, 'bytes（未读取内容）')

// 校验 JSON 可解析 + 是否有常见字段（只打印字段名，不打印值）
const { readFile } = await import('node:fs/promises')
const txt = await readFile(KEY_PATH, 'utf8')
let keys = []
try {
  const j = JSON.parse(txt)
  keys = Object.keys(j)
} catch {
  console.log('[X] 私钥文件不是合法 JSON')
  process.exit(2)
}
console.log('[2] 顶层字段:', JSON.stringify(keys))

// 起服务（带验证路由）
const env = {
  ...process.env,
  PORT: String(PORT),
  STATIC_DIR: 'dist',
  CUSTOM_LOGIN_ENABLED: '1',
  CLOUDBASE_ENV: ENV_ID,
  CLOUDBASE_CUSTOM_LOGIN_KEY: KEY_PATH,
  TICKET_SECRET: process.env.TICKET_SECRET || 'x'.repeat(40),
  ENABLE_VERIFY_ROUTE: '1',
}
const child = spawn(process.execPath, ['server/index.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] })
child.stdout.on('data', d => process.stdout.write('[srv] ' + d.toString()))
child.stderr.on('data', d => process.stdout.write('[srv:err] ' + d.toString()))
await new Promise(r => setTimeout(r, 2500))

const base = `http://127.0.0.1:${PORT}`
const health = await fetch(base + '/health').then(r => r.json()).catch(e => ({ error: e.message }))
console.log('[3] /health →', JSON.stringify(health))

// 服务端签票（先给本进程注入同一套配置）
process.env.CUSTOM_LOGIN_ENABLED = '1'
process.env.CLOUDBASE_ENV = ENV_ID
process.env.CLOUDBASE_CUSTOM_LOGIN_KEY = KEY_PATH
const { issueCustomTicket } = await import('../server/custom-login.mjs')
let ticket
try {
  const issued = await issueCustomTicket('wx:verifytest001')
  ticket = issued.ticket
  console.log('[4] 签票成功，customUserId =', issued.customUserId, '| 票据长度', ticket.length)
} catch (e) {
  console.log('[X] 签票失败:', e.status, e.code, e.message)
  child.kill()
  process.exit(3)
}

// 浏览器内换 session
const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage()
const logs = []
p.on('console', m => logs.push(m.text()))
p.on('pageerror', e => logs.push('PAGEERROR: ' + e.message))
await p.goto(`${base}/__verify/custom-login.html?ticket=${encodeURIComponent(ticket)}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await p.waitForTimeout(12000)
const result = await p.evaluate(() => ({
  status: document.getElementById('s')?.textContent,
  detail: document.getElementById('r')?.textContent,
}))
console.log('[5] 页面状态:', result.status)
console.log('[6] 结果:', result.detail)
if (logs.length) console.log('[7] 控制台:', logs.slice(0, 5).join(' | '))

await b.close()
child.kill()
