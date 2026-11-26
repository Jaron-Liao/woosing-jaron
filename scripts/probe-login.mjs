// 用本机 Edge 内核验证登录页的域名分支（不需要下载 playwright chromium）
import { chromium } from 'playwright'

const PUBLISHED = 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'
const PAGES_URL = 'http://127.0.0.1:4188/'

const browser = await chromium.launch({ channel: 'msedge' })

async function probe(url, label) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(3000)
  const state = await page.evaluate(() => ({
    origin: location.origin,
    url: location.href,
    bodyLen: (document.body.innerText || '').trim().length,
    badge: document.querySelector('.login-origin')?.innerText.replace(/\n/g, ' / ') || null,
    badgeClass: document.querySelector('.login-origin')?.className || null,
    wechatBtn: document.querySelector('.oauth-wechat')?.innerText || null,
    hint: document.querySelector('.login-hint')?.innerText || null,
  }))
  console.log(`--- ${label} ---`)
  console.log(JSON.stringify(state, null, 2))
  if (errors.length) console.log('JS 错误:', errors.slice(0, 3))
  await page.close()
  return state
}

await probe(PUBLISHED, '发布域名')
await probe(PAGES_URL, '本地预览')

await browser.close()
