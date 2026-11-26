// 数据层初始化：在 CloudBase 文档库创建 cv_user_data 集合（幂等）
import tcb from '@cloudbase/node-sdk'
import { readFileSync } from 'node:fs'

const ENV = 'jaron-12305-d2gl0tzsrf2a68c59'
const cred = JSON.parse(readFileSync('C:/secure/cv/tcb_custom_login.json', 'utf8'))
const app = tcb.init({ env: ENV, credentials: cred })
const db = app.database()

const out = {}
try {
  const cols = await db.listCollections()
  out.existing = (cols?.length ? cols : cols).map?.(c => c.collection_name || c.name || c) || cols
} catch (e) {
  out.listError = e.message
}

try {
  await db.createCollection('cv_user_data')
  out.created = 'cv_user_data'
} catch (e) {
  out.createError = e.message
}

try {
  const cols = await db.listCollections()
  out.after = (cols || []).map?.(c => c.collection_name || c.name || c) || cols
} catch (e) {
  out.afterError = e.message
}

console.log(JSON.stringify(out, null, 2))
process.exit(0)
