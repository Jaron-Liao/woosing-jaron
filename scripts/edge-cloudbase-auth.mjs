// 进环境详情，定位「身份认证 / 登录方式 / 自定义登录」入口（只读，不点下载）
import { chromium } from 'playwright'

const ENV_ID = 'jaron-12305-d2gl0tzsrf2a68c59'
const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

const urls = [
  `https://console.cloud.tencent.com/tcb/platform/env/${ENV_ID}/overview`,
  `https://console.cloud.tencent.com/tcb/platform/env/${ENV_ID}/auth`,
  `https://console.cloud.tencent.com/tcb/platform/env/${ENV_ID}/login`,
  `https://console.cloud.tencent.com/tcb/platform/env/${ENV_ID}/setting`,
  `https://console.cloud.tencent.com/tcb/env/overview?envId=${ENV_ID}`,
]

for (const url of urls) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForTimeout(9000)
    const d = await page.evaluate(() => {
      const t = (document.body.innerText || '').replace(/\s+/g, ' ')
      // 侧边菜单项
      const menus = [...document.querySelectorAll('li, a, div')]
        .map(e => (e.getAttribute('role') === 'menuitem' || e.tagName === 'A' ? (e.innerText || '').trim() : ''))
        .filter(s => s && s.length < 12)
      return {
        href: location.href,
        text: t.slice(0, 1800),
        menus: [...new Set(menus)].slice(0, 40),
        hitAuth: /自定义登录|身份认证|登录方式|匿名登录/.test(t),
      }
    })
    console.log(`\n===== ${url.replace('https://console.cloud.tencent.com', '')} =====`)
    console.log('落点:', d.href)
    console.log('命中认证页:', d.hitAuth)
    console.log('菜单:', JSON.stringify(d.menus))
    console.log('文本:', d.text.slice(0, 900))
    if (d.hitAuth) {
      await page.screenshot({ path: 'docs/screenshots/cloudbase-auth-page.png' })
      console.log('[SHOT] docs/screenshots/cloudbase-auth-page.png')
      break
    }
  } catch (e) {
    console.log(`\n===== ${url} ===== 失败:`, e.message.slice(0, 120))
  }
}

await ctx.close()
