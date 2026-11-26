// 线上站点渲染体检：确认首页不是白屏、关键模块可点、控制台无致命错误
import { chromium } from 'playwright'

const URL_TO_CHECK = process.argv[2] || 'https://codeverse-workbench.app.workbuddy.host/?sharecode=P26ACHYNBX'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text().slice(0, 200)) })

await page.goto(URL_TO_CHECK, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(2500)

const info = await page.evaluate(() => {
  const root = document.getElementById('root')
  return {
    title: document.title,
    rootChildren: root ? root.children.length : -1,
    textLen: (document.body.innerText || '').trim().length,
    textHead: (document.body.innerText || '').trim().slice(0, 200).replace(/\n/g, ' | '),
    hasCanvas3D: !!document.querySelector('.turnaround-3d, .c3d-stage, [class*="3d"]'),
    imgs: [...document.images].filter(i => i.complete && i.naturalWidth > 0).length,
    imgTotal: document.images.length,
  }
})
console.log(JSON.stringify(info, null, 2))
console.log('错误数:', errors.length)
errors.slice(0, 8).forEach(e => console.log(' -', e))

await page.screenshot({ path: 'live-home.png', fullPage: false })
await page.goto(URL_TO_CHECK.split('?')[0] + '?sharecode=P26ACHYNBX#/characters', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
const chars = await page.evaluate(() => ({
  textLen: (document.body.innerText || '').trim().length,
  cards: document.querySelectorAll('[class*="char-card"], [class*="card"]').length,
}))
console.log('角色页:', JSON.stringify(chars))
await page.screenshot({ path: 'live-characters.png', fullPage: false })

await browser.close()
