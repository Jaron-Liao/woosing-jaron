// 复查：用同一个 persistent profile 打开控制台，判断是否已登录（不打印任何凭据）
import { chromium } from 'playwright'

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge',
  headless: true,
  viewport: { width: 1280, height: 800 },
  locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()
const r = await page.goto('https://console.cloud.tencent.com/tcb/env/index', { waitUntil: 'domcontentloaded', timeout: 45000 })
await page.waitForTimeout(4000)
const info = await page.evaluate(() => ({
  href: location.href,
  title: document.title,
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 400),
}))
const needLogin = info.href.includes('/login')
console.log(JSON.stringify({
  status: r?.status(),
  needLogin,
  verdict: needLogin ? '未登录' : '已登录',
  href: info.href,
  title: info.title,
  textHead: info.text.slice(0, 260),
}, null, 2))
await ctx.close()
