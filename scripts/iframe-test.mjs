import { chromium } from 'playwright'
const cb = 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'
const relay = 'https://www.workbuddy.cn/v2/as/genie-baas/oauth/authorize?provider=wechat&callback_url=' + encodeURIComponent(cb)
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 900, height: 760 } })
await p.goto('https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX')
await p.evaluate((src) => {
  document.body.innerHTML = '<div id="box" style="width:820px;height:700px;margin:0 auto;border:1px solid #ccc"></div>'
  const f = document.createElement('iframe')
  f.src = src; f.style.width = '100%'; f.style.height = '100%'; f.id = 'f'
  document.getElementById('box').appendChild(f)
}, relay)
await p.waitForTimeout(8000)
const frames = p.frames().map(f => f.url().slice(0, 80))
console.log('frames:', frames)
const inner = p.frames().find(f => f.url().includes('qrconnect'))
if (inner) {
  const txt = await inner.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 120)).catch(e => 'evaluate failed: ' + e.message)
  console.log('iframe 内文本:', txt)
}
await p.screenshot({ path: 'docs/screenshots/iframe-qr.png' })
await b.close()
