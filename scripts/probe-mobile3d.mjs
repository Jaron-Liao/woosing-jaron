// 移动端 390px 下首页 3D 渲染与横向溢出检查
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
for (const w of [390, 768, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 820 }, deviceScaleFactor: 1 })
  const errs = []
  p.on('pageerror', e => errs.push(e.message))
  await p.goto('http://127.0.0.1:5199/probe-dashboard.html', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(1800)
  await p.evaluate(() => localStorage.setItem('cv:heroView', '3d'))
  await p.reload({ waitUntil: 'networkidle' })
  await p.waitForTimeout(6500)
  const s = await p.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
    canvas: !!document.querySelector('.q-hero-art canvas'),
    badge: document.querySelector('.buddy-model3d-badge')?.textContent || null,
  }))
  console.log(w + 'px', JSON.stringify(s), '错误:', errs.length ? errs.slice(0, 2) : '无')
  if (w === 390) await p.screenshot({ path: 'docs/screenshots/dashboard-3d-mobile.png' })
  await p.close()
}
await b.close()
