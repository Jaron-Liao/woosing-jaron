// 深挖：环境列表到底有没有内容（含 iframe），并对比新旧控制台
import { chromium } from 'playwright'

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

async function deep(label, url, waitMs = 30000) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {})
  await page.waitForTimeout(waitMs)
  const main = await page.evaluate(() => ({
    href: location.href,
    text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1500),
    frames: [...document.querySelectorAll('iframe')].map(f => f.src).slice(0, 8),
    rows: [...document.querySelectorAll('tr, [class*="env-item"], [class*="card"]')].length,
  }))
  console.log(`\n===== ${label} =====`)
  console.log('地址:', main.href)
  console.log('主文档 iframe:', JSON.stringify(main.frames))
  console.log('候选行数:', main.rows)
  console.log('文本:', main.text)

  // 逐个 iframe 取文本，环境列表常在 iframe 里
  for (const f of page.frames()) {
    if (f === page.mainFrame()) continue
    try {
      const t = await f.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 800))
      if (t.trim()) console.log('  [iframe]', f.url().slice(0, 90), '→', t.slice(0, 500))
    } catch { /* cross-origin */ }
  }
  return main
}

const a = await deep('新控制台 tcb/platform/env', 'https://console.cloud.tencent.com/tcb/platform/env', 32000)
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-new.png' })

const b = await deep('旧控制台 tcb/env/index', 'https://console.cloud.tencent.com/tcb/env/index', 25000)
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-old.png' })

console.log('\n[判断] 新控制台是否提到“开通/创建环境”:', /开通环境|创建环境|立即开通/.test(a.text))
console.log('[判断] 旧控制台是否提到“开通/创建环境”:', /开通环境|创建环境|立即开通/.test(b.text))

await ctx.close()
