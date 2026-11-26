import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 1000, height: 620 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 180)) })
await p.goto('http://127.0.0.1:5199/probe3d.html', { waitUntil: 'networkidle', timeout: 60000 })
await p.waitForTimeout(7000)
const info = await p.evaluate(() => {
  const c = document.querySelector('canvas')
  return {
    canvas: !!c, w: c?.width, h: c?.height,
    badge: document.querySelector('.buddy-model3d-badge')?.textContent || null,
    hint: document.querySelector('.buddy-model3d-hint')?.textContent || null,
    webgl: c ? !!(c.getContext('webgl2') || c.getContext('webgl')) : false,
  }
})
console.log('3D:', JSON.stringify(info))
console.log('错误:', errs.length ? errs.slice(0, 6) : '无')
// 初始正面
if (info.canvas) {
  await p.screenshot({ path: 'docs/screenshots/model3d-front.png' })
  // 拖拽交互检查
  await p.mouse.move(500, 300); await p.mouse.down(); await p.mouse.move(650, 320, { steps: 6 }); await p.mouse.up()
  await p.mouse.wheel(0, -240)
  await p.waitForTimeout(1500)
  await p.screenshot({ path: 'docs/screenshots/model3d.png' })
  console.log('截图: docs/screenshots/model3d.png')
}
await b.close()
