// 检查 Edge 中是否已有腾讯云控制台登录态（不读取任何凭据内容）
import { chromium } from 'playwright'
const b = await chromium.launch({ channel: 'msedge' })
// 用当前用户 profile 的默认上下文，复用已登录 cookie
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } })
for (const url of [
  'https://console.cloud.tencent.com/tcb',
  'https://console.cloud.tencent.com/tcb/env/index',
]) {
  const p = await ctx.newPage()
  try {
    const r = await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 })
    await p.waitForTimeout(3000)
    const info = await p.evaluate(() => ({
      href: location.href,
      title: document.title,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    }))
    console.log(JSON.stringify({ input: url, status: r?.status(), ...info }))
  } catch (e) {
    console.log(JSON.stringify({ input: url, error: e.message.slice(0, 150) }))
  }
  await p.close()
}
await b.close()
