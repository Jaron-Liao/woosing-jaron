// 从环境列表点击进入环境（避免深链被踢回登录），再找身份认证
import { chromium } from 'playwright'

const ENV_NAME = 'jaron-12305'
const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

await page.goto('https://console.cloud.tencent.com/tcb/platform/env', { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(22000)

const listOk = await page.evaluate(() => !location.href.includes('/login') && /共\s*\d+\s*条|环境列表/.test(document.body.innerText))
console.log('[1] 列表页可用:', listOk, '|', page.url())
if (!listOk) { console.log('[X] 未登录或列表未加载'); await ctx.close(); process.exit(2) }

// 点环境名进入
const target = page.getByText(ENV_NAME, { exact: false }).first()
const cnt = await page.getByText(ENV_NAME, { exact: false }).count()
console.log('[2] 命中环境名元素数:', cnt)
if (cnt > 0) {
  await target.click({ timeout: 15000 }).catch(e => console.log('  点击失败:', e.message.slice(0, 80)))
} else {
  console.log('  未找到环境名，尝试点第一行')
  await page.locator('tr').nth(1).click().catch(() => {})
}
await page.waitForTimeout(12000)
console.log('[3] 进入后地址:', page.url())

const after = await page.evaluate(() => {
  const t = (document.body.innerText || '').replace(/\s+/g, ' ')
  return {
    href: location.href,
    text: t.slice(0, 1500),
    // 侧栏菜单项猜测：短文本且可点
    navs: [...document.querySelectorAll('[class*="menu"] , [class*="nav"] , aside li')]
      .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim())
      .filter(s => s && s.length <= 14).slice(0, 50),
  }
})
console.log('[4] 地址:', after.href)
console.log('[5] 侧栏:', JSON.stringify([...new Set(after.navs)]))
console.log('[6] 文本:', after.text.slice(0, 900))
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-detail.png' })
console.log('[SHOT] docs/screenshots/cloudbase-env-detail.png')

await ctx.close()
