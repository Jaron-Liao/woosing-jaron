// 只做验证并把结果写入文件：服务端已单独启动，PORT 由环境变量给
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const PORT = process.env.VERIFY_PORT || '4311'
const ENV_ID = process.env.CLOUDBASE_ENV
const KEY_PATH = process.env.CLOUDBASE_CUSTOM_LOGIN_KEY
process.env.CUSTOM_LOGIN_ENABLED = '1'

const report = { steps: [] }
const step = (k, v) => { report.steps.push({ [k]: v }); console.log(k, '=', typeof v === 'string' ? v : JSON.stringify(v)) }

try {
  const { issueCustomTicket } = await import('../server/custom-login.mjs')
  const issued = await issueCustomTicket('wx:wxverifytest001')
  step('ticket_issued', { customUserId: issued.customUserId, len: issued.ticket.length })
  report.customUserId = issued.customUserId

  const b = await chromium.launch({ channel: 'msedge', headless: true })
  const p = await b.newPage()
  const netErrors = []
  p.on('response', r => { if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url().slice(0, 90)}`) })
  await p.goto(`http://127.0.0.1:${PORT}/__verify/custom-login.html?ticket=${encodeURIComponent(issued.ticket)}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await p.waitForTimeout(14000)
  const out = await p.evaluate(() => ({
    status: document.getElementById('s')?.textContent,
    detail: document.getElementById('r')?.textContent,
  }))
  step('page_status', out.status)
  let parsed = null
  try { parsed = JSON.parse(out.detail) } catch { /* keep raw */ }
  step('page_result', parsed || out.detail)
  report.result = parsed
  report.netErrors = netErrors.slice(0, 6)
  await b.close()
} catch (e) {
  step('error', { name: e.name, code: e.code, message: e.message })
  report.error = { name: e.name, code: e.code, message: e.message }
}

writeFileSync('docs/verify-report.json', JSON.stringify(report, null, 2))
process.exit(0)
