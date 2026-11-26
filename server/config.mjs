// 集中配置：启动时校验，缺关键项直接失败（fail fast），不把密钥写进代码
const num = (v, d) => (v == null || v === '' ? d : Number(v))

export function loadConfig(env = process.env) {
  const missing = []
  const need = (k) => {
    const v = (env[k] || '').trim()
    if (!v) missing.push(k)
    return v
  }

  const cfg = {
    port: num(env.PORT, 3000),
    host: env.HOST || '0.0.0.0',
    nodeEnv: env.NODE_ENV || 'production',
    // 公众号网页授权：必须是已认证服务号，且网页授权域名已在该公众号后台配置
    wechatAppId: (env.WECHAT_APPID || '').trim(),
    wechatSecret: (env.WECHAT_APP_SECRET || '').trim(),
    scope: env.WECHAT_SCOPE || 'snsapi_userinfo',
    // 本服务对外地址（用于拼 redirect_uri），必须与公众号后台的网页授权域名一致
    baseUrl: (env.BASE_URL || '').replace(/\/$/, ''),
    // 签发票据用，随便一串 32+ 位随机值；泄露等于可伪造登录票据
    ticketSecret: (env.TICKET_SECRET || '').trim(),
    // CloudBase 自定义登录：环境 ID + 私钥文件路径（文件绝不提交仓库）
    cloudbaseEnv: (env.CLOUDBASE_ENV || '').trim(),
    customLoginKeyPath: (env.CLOUDBASE_CUSTOM_LOGIN_KEY || '').trim(),
    staticDir: env.STATIC_DIR || new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  }

  // 只有真正要用到微信授权时才强制凭据，静态站点模式不应因此起不来
  const wechatRequested = Boolean(cfg.wechatAppId || cfg.wechatSecret)
  if (wechatRequested) {
    if (!cfg.wechatAppId) missing.push('WECHAT_APPID')
    if (!cfg.wechatSecret) missing.push('WECHAT_APP_SECRET')
    if (!cfg.baseUrl) missing.push('BASE_URL')
    if (!cfg.ticketSecret || cfg.ticketSecret.length < 32) missing.push('TICKET_SECRET(需≥32位)')
  }

  // 方案 A：开了 CUSTOM_LOGIN_ENABLED 才要求私钥与 env，且必须整套齐全
  cfg.customLoginEnabled = (env.CUSTOM_LOGIN_ENABLED || '').trim() === '1'
  if (cfg.customLoginEnabled) {
    if (!cfg.cloudbaseEnv) missing.push('CLOUDBASE_ENV')
    if (!cfg.customLoginKeyPath) missing.push('CLOUDBASE_CUSTOM_LOGIN_KEY')
  }

  cfg.wechatConfigured = wechatRequested && missing.length === 0
  cfg.missing = missing
  return cfg
}

// 错误类型统一由 errors.mjs 定义，这里只做兼容导出
export { AppError } from './errors.mjs'
