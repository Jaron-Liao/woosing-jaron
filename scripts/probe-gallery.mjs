import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 1100, height: 860 } })
const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto('http://127.0.0.1:5199/probe-gallery.html', { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(2000)
await p.locator('.gallery-thumb').first().click()
await p.waitForTimeout(800)
await p.getByText('Blender 渲染', { exact: true }).click()
await p.waitForTimeout(3000)
const info = await p.evaluate(() => {
  const imgs = [...document.querySelectorAll('.blender-render-grid img')]
  return { count: imgs.length, loaded: imgs.filter(i => i.complete && i.naturalWidth > 0).length }
})
console.log('Blender 渲染图:', JSON.stringify(info), '错误:', errs.length ? errs.slice(0, 3) : '无')
await p.screenshot({ path: 'docs/screenshots/gallery-blender.png' })
await b.close()
