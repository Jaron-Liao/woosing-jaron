import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 160)) })
await p.goto('http://127.0.0.1:5199/probe-dashboard.html', { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(2500)
console.log('hero 按钮:', await p.locator('.hero-view-toggle').innerText().catch(() => '无'))
console.log('SVG 场景:', await p.locator('.workbench-scene').count())
await p.locator('.hero-view-toggle').click()
await p.waitForTimeout(6000)
const info = await p.evaluate(() => ({
  canvas: !!document.querySelector('.q-hero-art canvas'),
  badge: document.querySelector('.buddy-model3d-badge')?.textContent || null,
  btn: document.querySelector('.hero-view-toggle')?.textContent || null,
}))
console.log('切 3D 后:', JSON.stringify(info))
await p.screenshot({ path: 'docs/screenshots/dashboard-3d.png' })
console.log('错误:', errs.length ? errs.slice(0, 5) : '无')
await b.close()
