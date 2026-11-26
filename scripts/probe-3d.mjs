// 验证真 3D 建模页：canvas 是否生成、WebGL 上下文是否正常、有无 JS 错误
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
const p = await b.newPage({ viewport: { width: 1280, height: 900 } })
const errs = []
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message))
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 160)) })

await p.goto('http://127.0.0.1:4190/#/gallery', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2500)
// 需要登录守卫 → 若跳到 Login，直接注入一个 session 绕过（仅本地验证用）
const hasLogin = await p.locator('.login-page').count()
if (hasLogin) {
  await p.evaluate(() => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('workbuddy-cloud.session'))
    const pk = 'wbpk_e5UDANh6gzpXjUfL1tiGNE_otIkxi8HRMi1n4J5vD5dgsPz3JVL6E4j'
    localStorage.setItem(keys[0] || 'workbuddy-cloud.session.' + pk, JSON.stringify({
      accessToken: 'local-probe', refreshToken: 'local-probe', expiresAt: Date.now() + 3600000,
      user: { id: 'probe', name: '本地验证' },
    }))
  })
  await p.goto('http://127.0.0.1:4190/#/gallery', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2500)
}

const cards = await p.locator('.gallery-card').count()
console.log('图鉴卡片数:', cards)
if (cards > 0) {
  await p.locator('.gallery-thumb').first().click()
  await p.waitForTimeout(1200)
  await p.getByText('立体建模', { exact: true }).click()
  await p.waitForTimeout(9000)
  const info = await p.evaluate(() => {
    const c = document.querySelector('.buddy-model3d-canvas canvas')
    const badge = document.querySelector('.buddy-model3d-badge')?.textContent
    return {
      canvas: !!c,
      w: c?.width, h: c?.height,
      badge,
      hint: document.querySelector('.buddy-model3d-hint')?.textContent || null,
    }
  })
  console.log('3D 状态:', JSON.stringify(info))
  await p.screenshot({ path: 'docs/screenshots/model3d.png' })
}
console.log('错误:', errs.length ? errs.slice(0, 5) : '无')
await b.close()
