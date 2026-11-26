// 打开可见 Edge 窗口 → 截图确认登录二维码已渲染 → 等用户扫码（10 分钟）
// 安全：不读取/不打印账号、密码、cookie、私钥。
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
mkdirSync(PROFILE, { recursive: true })
mkdirSync('docs/screenshots', { recursive: true })

const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge',
  headless: false,
  viewport: { width: 1440, height: 920 },
  locale: 'zh-CN',
  args: ['--start-maximized'],
})

const page = ctx.pages()[0] || await ctx.newPage()
await page.goto('https://console.cloud.tencent.com/tcb/env/index', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(6000)

const QR_SHOT = 'docs/screenshots/tencent-login-qr.png'
await page.screenshot({ path: QR_SHOT, fullPage: false })

// 判断页面上是否存在二维码区域（只看有没有 canvas/img/iframe，不解析内容）
const qrProbe = await page.evaluate(() => {
  const hasIframe = !!document.querySelector('iframe')
  const imgs = [...document.images].filter(i => i.complete && i.naturalWidth > 120).length
  const canvas = document.querySelectorAll('canvas').length
  const text = (document.body.innerText || '').replace(/\s+/g, ' ')
  const mentionsQr = /扫码|二维码|扫一扫/.test(text)
  return { hasIframe, imgs, canvas, mentionsQr, title: document.title }
})
console.log('[QR] 截图:', QR_SHOT)
console.log('[QR] 页面特征:', JSON.stringify(qrProbe))

console.log('[WAIT] 请扫码登录，最多等 10 分钟…')
const deadline = Date.now() + 10 * 60 * 1000
let loggedIn = false
while (Date.now() < deadline) {
  if (page.isClosed()) { console.log('[X] 窗口被关闭'); break }
  const url = page.url()
  if (url.includes('console.cloud.tencent.com') && !url.includes('/login')) { loggedIn = true; break }
  await page.waitForTimeout(3000)
}

if (!loggedIn) {
  console.log('[X] 未检测到登录成功')
  await ctx.close()
  process.exit(2)
}

console.log('[OK] 登录成功:', page.url())
await page.waitForTimeout(5000)
await page.goto('https://console.cloud.tencent.com/tcb/env/index', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(6000)

const info = await page.evaluate(() => ({
  href: location.href,
  title: document.title,
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1600),
}))
console.log('[ENV] 地址:', info.href)
console.log('[ENV] 标题:', info.title)
console.log('[ENV] 文本:\n' + info.text)
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-list.png', fullPage: false })
console.log('[ENV] 截图: docs/screenshots/cloudbase-env-list.png')

await ctx.close()
