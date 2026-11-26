import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage()
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto('http://127.0.0.1:5199/probe-db.html', { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(2500)
console.log((await p.locator('pre').innerText()).slice(0, 400))
console.log('错误:', errs.length ? errs.slice(0, 3) : '无')
await b.close()
