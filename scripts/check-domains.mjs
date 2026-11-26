// 在真实浏览器里查 RDAP，判断域名是否已被注册（404 = 大概率可注册）
import { chromium } from 'playwright'
const domains = [
  'codeverse.cn', 'codeverse.work', 'codeverse-lab.cn', 'codeverse-studio.cn',
  'codeversehub.cn', 'woosingjaron.com', 'woosing-jaron.com',
  'jaron-codeverse.com', 'codeverse-jaron.com', 'cvstudio.cn',
]
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage()
await p.goto('https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX', { waitUntil: 'domcontentloaded' })
for (const d of domains) {
  const r = await p.evaluate(async (domain) => {
    try {
      const res = await fetch('https://rdap.org/domain/' + domain, { headers: { Accept: 'application/rdap+json' } })
      return { status: res.status }
    } catch (e) { return { status: 'ERR', msg: e.message } }
  }, d)
  const verdict = r.status === 200 ? '已注册' : r.status === 404 ? '可注册(未查到)' : String(r.status)
  console.log(verdict.padEnd(14), d)
}
await b.close()
