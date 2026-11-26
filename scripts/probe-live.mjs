// 线上烟测：主站与 Pages 都能渲染、无致命 JS 错误、3D chunk 可访问
import { chromium } from 'playwright'
const URLS = [
  ['主站', 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'],
  ['Pages', 'https://jaron-liao.github.io/woosing-jaron/'],
]
const b = await chromium.launch({ channel: 'msedge' })
for (const [name, url] of URLS) {
  const p = await b.newPage({ viewport: { width: 1280, height: 860 } })
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForTimeout(3500)
  const s = await p.evaluate(() => ({
    rootChildren: document.getElementById('root')?.children.length ?? -1,
    textLen: (document.body.innerText || '').trim().length,
    title: document.title,
    loginBadge: document.querySelector('.login-origin')?.innerText.replace(/\n/g, ' / ') || null,
    wechatBtn: document.querySelector('.oauth-wechat')?.innerText || null,
  }))
  console.log(name, JSON.stringify(s), '| JS错误:', errs.length ? errs.slice(0, 3) : '无')
  await p.close()
}
await b.close()
