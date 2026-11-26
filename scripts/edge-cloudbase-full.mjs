// 连续会话：等你通过二次验证 → 自动进环境 → 找自定义登录 → 尝试下载私钥（只存路径）
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const ENV_NAME = 'jaron-12305'
const KEY_DIR = 'C:/secure/cv'
mkdirSync(KEY_DIR, { recursive: true })
mkdirSync('docs/screenshots', { recursive: true })

const PROFILE = 'D:/WorkBuddy/数学工作台/.edge-cloudbase-profile'
const ctx = await chromium.launchPersistentContext(PROFILE, {
  channel: 'msedge', headless: false, acceptDownloads: true,
  viewport: { width: 1440, height: 920 }, locale: 'zh-CN',
})
const page = ctx.pages()[0] || await ctx.newPage()

// 下载落到安全目录，只记录路径
let savedKeyPath = null
page.on('download', async (dl) => {
  try {
    const name = dl.suggestedFilename() || 'tcb_custom_login.json'
    const dest = `${KEY_DIR}/${name}`
    await dl.saveAs(dest)
    savedKeyPath = dest
    console.log('[KEY] 已保存:', dest, '(未读取内容)')
  } catch (e) { console.log('[KEY] 保存失败:', e.message.slice(0, 120)) }
})

await page.goto('https://console.cloud.tencent.com/tcb/platform/env', { waitUntil: 'domcontentloaded', timeout: 60000 })
console.log('[1] 已打开控制台。若出现「身份验证」，请你在窗口里完成（微信/短信均可）。')

const deadline = Date.now() + 8 * 60 * 1000
let ready = false
while (Date.now() < deadline) {
  if (page.isClosed()) { console.log('[X] 窗口被关闭'); break }
  const url = page.url()
  const isLogin = url.includes('/login') || url.includes('/verify')
  if (!isLogin) {
    const ok = await page.evaluate(() => /环境列表|共\s*\d+\s*条/.test(document.body.innerText)).catch(() => false)
    if (ok) { ready = true; break }
  }
  await page.waitForTimeout(4000)
}
if (!ready) { console.log('[X] 仍未通过验证/未到列表页'); await ctx.close(); process.exit(2) }
console.log('[2] 已进入环境列表:', page.url())

// 进入环境
const cnt = await page.getByText(ENV_NAME, { exact: false }).count()
if (cnt > 0) await page.getByText(ENV_NAME, { exact: false }).first().click({ timeout: 15000 }).catch(() => {})
await page.waitForTimeout(12000)
console.log('[3] 环境页:', page.url())
const detail = await page.evaluate(() => ({
  text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1600),
  navs: [...new Set([...document.querySelectorAll('[class*="menu"] , [class*="nav"] , aside li')]
    .map(e => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(s => s && s.length <= 14))].slice(0, 40),
}))
console.log('[4] 侧栏:', JSON.stringify(detail.navs))
console.log('[5] 文本:', detail.text.slice(0, 800))
await page.screenshot({ path: 'docs/screenshots/cloudbase-env-detail.png' })

// 找「身份认证 / 登录方式」
for (const label of ['身份认证', '登录授权', '用户管理', '登录方式']) {
  const el = page.getByText(label, { exact: false }).first()
  if (await page.getByText(label, { exact: false }).count() > 0) {
    await el.click({ timeout: 8000 }).catch(() => {})
    await page.waitForTimeout(6000)
    const t = await page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 1200))
    if (/自定义登录|匿名登录|登录方式/.test(t)) {
      console.log('[6] 进入认证页 via', label, '→', page.url())
      console.log('[7] 认证页文本:', t.slice(0, 900))
      await page.screenshot({ path: 'docs/screenshots/cloudbase-auth-page.png' })
      // 只在明确标了「下载」+「私钥/密钥」时才点
      const dlBtn = page.getByText(/下载.*(私钥|密钥)|(私钥|密钥).*下载/).first()
      if (await page.getByText(/下载.*(私钥|密钥)|(私钥|密钥).*下载/).count() > 0) {
        console.log('[8] 发现下载按钮，尝试点击')
        await dlBtn.click({ timeout: 8000 }).catch(e => console.log('  点击失败:', e.message.slice(0, 80)))
        await page.waitForTimeout(6000)
      } else {
        console.log('[8] 没找到「下载私钥」按钮，可能需先在页面上启用自定义登录')
      }
      break
    }
  }
}

console.log('[RESULT] 私钥路径:', savedKeyPath || '未获取')
await ctx.close()
