// 诊断 createTicket 的真实返回结构（不打印票据内容）
import tcb from '@cloudbase/node-sdk'
import { readFileSync } from 'node:fs'

const ENV = 'jaron-12305-d2gl0tzsrf2a68c59'
const cred = JSON.parse(readFileSync('C:/secure/cv/tcb_custom_login.json', 'utf8'))
const app = tcb.init({ env: ENV, credentials: cred })
const auth = app.auth()

console.log('createTicket 类型:', typeof auth.createTicket)
const t = auth.createTicket('wx:wxverifytest001')
console.log('返回类型:', typeof t)
if (t && typeof t === 'object') {
  console.log('对象字段:', Object.keys(t).join(', '))
  for (const [k, v] of Object.entries(t)) {
    console.log(`  ${k}: ${typeof v}${typeof v === 'string' ? ' len=' + v.length : ''}`)
  }
} else if (typeof t === 'string') {
  console.log('字符串长度:', t.length, '前缀:', t.slice(0, 8) + '…')
}
process.exit(0)
