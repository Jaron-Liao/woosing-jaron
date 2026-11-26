// 实测「点击微信登录」的真实跳转链路
import { chromium } from 'playwright'

const PUBLISHED = 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'
const LOCAL = 'http://127.0.0.1:4188/'

const browser = await chromium.launch({ channel: 'msedge' })

async function clickWechat(startUrl, label, shot) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await page.waitForTimeout(2500)
  if (shot) await page.screenshot({ path: shot })
  await page.click('.oauth-wechat').catch(e => errors.push('click failed: ' + e.message))
  await page.waitForTimeout(6000)
  const finalUrl = page.url()
  let host = ''
  try { host = new URL(finalUrl).host } catch { /* ignore */ }
  console.log(`--- ${label} ---`)
  console.log('最终地址:', finalUrl.slice(0, 160))
  console.log('域名:', host, '| 是否微信二维码页:', finalUrl.includes('open.weixin.qq.com') && finalUrl.includes('qrconnect'))
  if (errors.length) console.log('错误:', errors.slice(0, 3))
  await page.close()
}

await clickWechat(PUBLISHED, '发布域名点微信', 'login-published.png')
await clickWechat(LOCAL, '本地预览点微信（应自动转发布域名）', 'login-local.png')

await browser.close()
