// 用本机 Edge 内核逐个访问候选来源，记录真实跳转、标题、canonical 与关键文案
import { chromium } from 'playwright'

const SITES = [
  'https://www.workbuddy.cn/',
  'https://www.workbuddy.ai/',
  'https://www.workbuddy.cn/docs/workbuddy/Overview',
  'https://www.workbuddy.ai/docs/zh/workbuddy/Overview',
  'https://codebuddy.cn/work/',
  'https://clawhub.ai',
  'https://github.com/Tencent/workbuddy-bench',
  'https://www.tencentcloud.com/products/ai',
]

const b = await chromium.launch({ channel: 'msedge' })
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN' })

for (const url of SITES) {
  const page = await ctx.newPage()
  const started = Date.now()
  let status = null
  const errs = []
  page.on('pageerror', e => errs.push(e.message))
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    status = resp?.status()
    await page.waitForTimeout(1800)
    const info = await page.evaluate(() => {
      const meta = (name) => document.querySelector(`meta[name="${name}"]`)?.content
        || document.querySelector(`meta[property="${name}"]`)?.content || ''
      const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim()
      return {
        title: document.title.slice(0, 120),
        href: location.href,
        canonical: document.querySelector('link[rel="canonical"]')?.href || '',
        desc: (meta('description') || meta('og:description') || '').slice(0, 180),
        siteName: meta('og:site_name'),
        h1: (document.querySelector('h1')?.innerText || '').slice(0, 100),
        textHead: text.slice(0, 220),
        len: text.length,
      }
    })
    console.log(JSON.stringify({ input: url, status, ms: Date.now() - started, ...info, errs: errs.slice(0, 2) }, null, 2))
  } catch (e) {
    console.log(JSON.stringify({ input: url, status, error: e.message.slice(0, 180) }))
  }
  await page.close()
}
await b.close()
