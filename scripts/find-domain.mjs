import { chromium } from 'playwright'
const list = [
  'codeverse.com', 'codeverse.work', 'codeverse.dev', 'codeverse.studio',
  'codeverse-lab.com', 'codeverselab.com', 'codeversehub.com', 'codeverse-jaron.com',
  'jaroncodeverse.com', 'woosingjaron.com', 'woosing-jaron.com', 'cvcodeverse.com',
  'codeverse.app', 'codeverseworkbench.com',
]
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage()
await p.goto('https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX', { waitUntil: 'domcontentloaded' })
for (const d of list) {
  const s = await p.evaluate(async (x) => {
    try { const r = await fetch('https://rdap.org/domain/' + x, { headers: { Accept: 'application/rdap+json' } }); return r.status } catch { return 'ERR' }
  }, d)
  console.log((s === 200 ? '❌ 已注册' : s === 404 ? '✅ 可注册' : s).padEnd(10), d)
}
await b.close()
