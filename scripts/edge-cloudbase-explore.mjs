// 一个 headful 会话里完成：读环境列表 → 定位「自定义登录」入口
// 只读探索：不点击任何下载/删除按钮，先看清 UI 再说
import { chromium } from 'playwright'

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

async function dump(label, url, waitMs = 9000) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(waitMs)
    const d = await page.evaluate(() => {
      const text = (document.body.innerText || '').replace(/\s+/g, ' ')
      const ids = [...new Set((text.match(/[a-z][a-z0-9-]{2,30}-\d{6,10}/g) || []))]
      const links = [...document.querySelectorAll('a[href]')]
        .map(a => a.getAttribute('href'))
        .filter(h => h && /env|tcb|auth/i.test(h)).slice(0, 25)
      return { href: location.href, title: document.title, text, ids, links }
    })
    console.log(`\n===== ${label} =====`)
    console.log('地址:', d.href)
    console.log('标题:', d.title)
    console.log('检出ID:', JSON.stringify(d.ids))
    console.log('链接:', JSON.stringify(d.links))
    console.log('文本:', d.text.slice(0, 1200))
    return d
  } catch (e) {
    console.log(`\n===== ${label} ===== 失败:`, e.message.slice(0, 160))
    return null
  }
}

// 1. 登录态确认 + 环境列表
const list = await dump('环境列表', 'https://console.cloud.tencent.com/tcb/platform/env', 14000)
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-list.png' })

if (list && list.href.includes('/login')) {
  console.log('\n[!] 仍然未登录，需要重新扫码')
  await ctx.close()
  process.exit(2)
}

// 2. 若有环境 ID，逐个探 身份认证/登录方式 页面
const ids = list?.ids || []
if (!ids.length) {
  console.log('\n[!] 未在页面文本里检出环境 ID，可能环境列表为空或加载失败')
} else {
  const envId = ids[0]
  console.log('\n[>] 尝试环境:', envId)
  const candidates = [
    `https://console.cloud.tencent.com/tcb/platform/env/${envId}/auth`,
    `https://console.cloud.tencent.com/tcb/platform/env/${envId}/login`,
    `https://console.cloud.tencent.com/tcb/platform/env/${envId}/setting`,
    `https://console.cloud.tencent.com/tcb/env/overview?envId=${envId}`,
  ]
  for (const u of candidates) {
    const d = await dump('探测 ' + u.split('/tcb/')[1], u, 8000)
    if (d && /自定义登录|登录方式|身份认证|匿名登录/.test(d.text)) {
      console.log('\n[✓] 命中认证页:', d.href)
      await page.screenshot({ path: 'docs/screenshots/cloudbase-auth-page.png', fullPage: false })
      break
    }
  }
}

await ctx.close()
