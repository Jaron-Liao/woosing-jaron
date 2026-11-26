// 新版 CloudBase 控制台（tcb.cloud.tencent.com）探测
import { chromium } from 'playwright'
const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()
await page.goto('https://tcb.cloud.tencent.com/dev', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(18000)
const d = await page.evaluate(() => ({
  href: location.href,
  title: document.title,
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
  navs: [...new Set([...document.querySelectorAll('a,li,[role="menuitem"],[class*="menu-item"]')]
    .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(s => s && s.length <= 16))].slice(0, 60),
}))
console.log('[页]', d.href, '|', d.title)
console.log('[导航]', JSON.stringify(d.navs))
console.log('[文本]', d.text)
await page.screenshot({ path: 'docs/screenshots/tcb-new-home.png' })
console.log('[SHOT] docs/screenshots/tcb-new-home.png')
await ctx.close()
