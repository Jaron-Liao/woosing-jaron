// 尝试在新版控制台用「腾讯云账号登录」走 SSO
import { chromium } from 'playwright'
const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()
await page.goto('https://tcb.cloud.tencent.com/dev', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(6000)

const btn = page.getByText('使用腾讯云账号登录', { exact: false }).first()
if (await page.getByText('使用腾讯云账号登录', { exact: false }).count() > 0) {
  console.log('[1] 点击「使用腾讯云账号登录」')
  await btn.click({ timeout: 10000 }).catch(e => console.log('  点击失败:', e.message.slice(0, 80)))
} else {
  console.log('[1] 未找到 SSO 按钮，当前地址:', page.url())
}

// 等 SSO 回跳
const deadline = Date.now() + 120000
let ok = false
while (Date.now() < deadline) {
  const url = page.url()
  if (url.includes('tcb.cloud.tencent.com') && !url.includes('/login')) { ok = true; break }
  await page.waitForTimeout(4000)
}
console.log('[2] 回跳结果:', ok ? '已进入控制台' : '仍停留在登录', '|', page.url())

if (ok) {
  await page.waitForTimeout(12000)
  const d = await page.evaluate(() => ({
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1400),
    navs: [...new Set([...document.querySelectorAll('a,li,[role="menuitem"],[class*="menu"]')]
      .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(s => s && s.length <= 16))].slice(0, 60),
  }))
  console.log('[3] 导航:', JSON.stringify(d.navs))
  console.log('[4] 文本:', d.text.slice(0, 800))
  await page.screenshot({ path: 'docs/screenshots/tcb-new-console.png' })
  console.log('[SHOT] docs/screenshots/tcb-new-console.png')
}
await ctx.close()
