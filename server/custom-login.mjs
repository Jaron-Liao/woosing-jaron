// CloudBase 自定义登录：用服务端私钥为已认证的微信用户签票。
// 依据：TencentCloudBase/CloudBase-AI-Toolkit 的 auth-nodejs-cloudbase skill
//   - 必须用“启用自定义登录后下载的私钥”初始化 app，不能用默认 admin app
//   - Node: auth.createTicket(customUserId, options)
//   - Web: setCustomSignFunc(fn) + 无参 signInWithCustomTicket()
// 密钥只从文件读取，文件绝不进仓库、不打印内容。
import { readFile } from 'node:fs/promises'
import { AppError } from './config.mjs'

let cached = null

function customUserIdFromOpenid(openid) {
  // 官方约束：4–32 字符，字母数字与 _-#@(){}[]:.,<>+#~；wx: 前缀与官方小程序会话一致
  const id = `wx:${String(openid || '').replace(/[^A-Za-z0-9_-]/g, '')}`
  if (id.length < 4 || id.length > 32) {
    throw new AppError(500, 'invalid_custom_user_id', '微信 openid 无法映射为合法的 customUserId')
  }
  return id
}

async function getAuth() {
  if (cached) return cached
  if (!process.env.CUSTOM_LOGIN_ENABLED || process.env.CUSTOM_LOGIN_ENABLED !== '1') {
    throw new AppError(503, 'custom_login_not_enabled', '服务端尚未开启自定义登录')
  }
  const env = process.env.CLOUDBASE_ENV
  const keyPath = process.env.CLOUDBASE_CUSTOM_LOGIN_KEY
  if (!env || !keyPath) {
    throw new AppError(503, 'custom_login_not_configured', '缺少 CloudBase 环境或自定义登录私钥配置')
  }

  let credentials
  try {
    const text = await readFile(keyPath, 'utf8')
    credentials = JSON.parse(text)
  } catch (e) {
    throw new AppError(503, 'custom_login_key_unreadable', `自定义登录私钥不可读：${e.message}`)
  }

  // 动态 import，避免没启用时因缺依赖导致服务起不来
  let tcb
  try {
    const mod = await import('@cloudbase/node-sdk')
    tcb = mod.default || mod
  } catch {
    throw new AppError(503, 'cloudbase_sdk_missing', '缺少 @cloudbase/node-sdk，请先安装')
  }

  const app = tcb.init({ env, credentials })
  cached = app.auth()
  return cached
}

/** 用微信 openid 换取 CloudBase 自定义登录票据 */
export async function issueCustomTicket(openid) {
  const customUserId = customUserIdFromOpenid(openid)
  const auth = await getAuth()
  try {
    // 官方 skill 场景 8：createTicket(customUserId, options)
    // 注意：@cloudbase/node-sdk 的实现返回 Promise<string>，必须 await；
    // 直接当字符串用会得到 "[object Promise]"，换 session 时报 400。
    const ticket = await auth.createTicket(customUserId, {
      refresh: 3600 * 1000,
      expire: 24 * 3600 * 1000,
    })
    if (!ticket) throw new Error('empty ticket')
    // 兼容不同版本可能返回 { ticket } 的情况
    const value = typeof ticket === 'string' ? ticket : ticket.ticket
    if (typeof value !== 'string' || !value) {
      throw new Error(`unexpected ticket shape: ${typeof ticket}`)
    }
    return { ticket: value, customUserId }
  } catch (e) {
    throw new AppError(500, 'ticket_issue_failed', `签发自定义登录票据失败：${e.message}`)
  }
}
