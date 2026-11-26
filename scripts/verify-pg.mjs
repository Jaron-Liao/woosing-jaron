// 用自定义登录身份跑数据层验证（集合是否存在/能否写入/权限规则生效）
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

process.env.CUSTOM_LOGIN_ENABLED = '1'
const PORT = process.env.VERIFY_PORT || '4311'
const report = { steps: [] }
const push = (k, v) => { report.steps.push({ [k]: v }); console.log(k, '=', JSON.stringify(v)) }

const { issueCustomTicket } = await import('../server/custom-login.mjs')
const issued = await issueCustomTicket('wx:dbprobe001')
push('ticket', { len: issued.ticket.length })

const b = await chromium.launch({ channel: 'msedge', headless: true })
const p = await b.newPage()
const net = []
p.on('response', r => { if (r.status() >= 400) net.push(`${r.status()} ${r.url().slice(0, 80)}`) })
await p.goto(`http://127.0.0.1:${PORT}/__verify/pg.html?ticket=${encodeURIComponent(issued.ticket)}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
await p.waitForTimeout(16000)
const out = await p.evaluate(() => ({
  status: document.getElementById('s')?.textContent,
  detail: document.getElementById('r')?.textContent,
}))
push('status', out.status)
try { report.parsed = JSON.parse(out.detail) } catch { report.raw = out.detail }
console.log('RESULT:', out.detail?.slice(0, 700))
report.net = net.slice(0, 8)
await b.close()
writeFileSync('docs/verify-pg.json', JSON.stringify(report, null, 2))
process.exit(0)
