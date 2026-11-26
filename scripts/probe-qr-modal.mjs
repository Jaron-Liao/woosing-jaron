// 验证站内扫码弹窗：点击微信 → 弹窗出现 → iframe 内是微信二维码页
import { chromium } from 'playwright'

const URL_PUB = 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 1180, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push(e.message))

await p.goto(URL_PUB, { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)

await p.click('.oauth-wechat')
await p.waitForTimeout(7000)

const state = await p.evaluate(() => {
  const card = document.querySelector('.qr-card')
  const frame = document.querySelector('.qr-frame')
  return {
    modal: !!card,
    title: document.querySelector('.qr-head b')?.innerText || null,
    sub: document.querySelector('.qr-head small')?.innerText || null,
    frameSrc: frame ? frame.getAttribute('src')?.slice(0, 90) : null,
    bodyText: document.body.innerText.includes('二维码加载中'),
    scrolled: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }
})
console.log(JSON.stringify(state, null, 2))

const inner = p.frames().find(f => f.url().includes('qrconnect'))
if (inner) {
  const t = await inner.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 80)).catch(() => 'n/a')
  console.log('iframe 内文本:', t)
}
console.log('页面错误:', errs.length ? errs.slice(0, 3) : '无')

await p.screenshot({ path: 'docs/screenshots/qr-modal.png' })

// 小屏检查
await p.setViewportSize({ width: 390, height: 780 })
await p.waitForTimeout(1200)
const m = await p.evaluate(() => ({
  overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  cardWidth: document.querySelector('.qr-card')?.getBoundingClientRect().width,
}))
console.log('手机视口:', JSON.stringify(m))
await p.screenshot({ path: 'docs/screenshots/qr-modal-mobile.png' })

await b.close()
