// 登录后读取 CloudBase 环境列表（只取环境名/环境ID 这类公开标识，不碰凭据）
import { chromium } from 'playwright'

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: true, viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

await page.goto('https://console.cloud.tencent.com/tcb/platform/env', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(12000)

const info = await page.evaluate(() => {
  const text = (document.body.innerText || '').replace(/\s+/g, ' ')
  // 环境 ID 常见形态：小写字母/数字/连字符，带 6-10 位随机后缀
  const ids = [...new Set((text.match(/[a-z][a-z0-9-]{2,30}-\d{6,10}/g) || []))]
  return { href: location.href, title: document.title, text: text.slice(0, 2000), ids }
})
console.log('[PAGE]', info.href, '|', info.title)
console.log('[IDS]', JSON.stringify(info.ids))
console.log('[TEXT]\n' + info.text)

await page.screenshot({ path: 'docs/screenshots/cloudbase-env-list.png', fullPage: false })
console.log('[SHOT] docs/screenshots/cloudbase-env-list.png')
await ctx.close()
