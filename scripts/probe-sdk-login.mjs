// 在发布站页面上下文里，直接调用页面已加载的 SDK 方法（走 SDK 自己的同源 fetch）
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage()
await p.goto('https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)

const res = await p.evaluate(async () => {
  const EP = 'https://codeverse-workbench.app.workbuddy.host'
  const PK = 'wbpk_e5UDANh6gzpXjUfL1tiGNE_otIkxi8HRMi1n4J5vD5dgsPz3JVL6E4j'
  const out = []
  // 直接 fetch，看浏览器内是否能 POST
  for (const [label, body] of [
    ['缺 appid', { code: 'fake' }],
    ['公众号appid+假code', { code: 'fake_h5_code', appid: 'wx31d4d71eb5f8c69e' }],
  ]) {
    try {
      const r = await fetch(EP + '/v1/login-wechat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wb-webapp-access-key': PK },
        body: JSON.stringify(body),
      })
      const t = await r.text()
      out.push({ label, status: r.status, body: t.slice(0, 240) })
    } catch (e) { out.push({ label, error: e.message }) }
  }
  return out
})
console.log(JSON.stringify(res, null, 2))
await b.close()
