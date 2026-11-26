import { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { cloud, currentSession, listFiles, loadUserData } from '../cloud.js'

function providerLabel(p) {
  const map = {
    wechat: '微信扫码', workbuddy: 'WorkBuddy 扫码', phone: '手机号验证码',
    sms: '手机号验证码', email: '邮箱',
  }
  return map[p] || p || '未知'
}

export default function Account() {
  const session = useStore((s) => s.session)
  const setSession = useStore((s) => s.setSession)
  const scheme = useStore((s) => s.scheme)
  const [files, setFiles] = useState(0)
  const [prefs, setPrefs] = useState(null)
  const [serverOk, setServerOk] = useState(null)

  useEffect(() => {
    if (!session) return
    ;(async () => {
      try {
        const [f, p] = await Promise.all([listFiles(), loadUserData('preference', 'partner')])
        setFiles(Array.isArray(f) ? f.length : 0)
        setPrefs(p?.value || null)
      } catch { /* offline */ }
      try {
        const { data } = await cloud.auth.getUser()
        setServerOk(!!data?.user)
      } catch { setServerOk(false) }
    })()
  }, [session])

  const signOut = async () => {
    try { await cloud.auth.signOut() } catch { /* ignore */ }
    setSession(null)
  }

  if (!session) {
    return (
      <div className="page">
        <header className="page-head"><h1>个人账号</h1><p className="muted">登录后查看账号信息与云同步状态。</p></header>
        <div className="card account-empty">
          <p>当前未登录。工作台数据仅保存在本机浏览器，不会云端同步。</p>
          <button className="btn primary" onClick={() => { location.href = '/#/' }}>去登录</button>
        </div>
      </div>
    )
  }

  const user = session.user || {}
  const provider = user.app_metadata?.provider || user.raw_user_meta_data?.provider || session.provider

  return (
    <div className="page">
      <header className="page-head">
        <h1>个人账号</h1>
        <p className="muted">账号信息、登录状态与云端数据概览。所有数据按账号隔离，其他用户无法访问。</p>
      </header>

      <div className="card account-hero">
        <div className="account-avatar">
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span>{(user.name || 'U').slice(0, 1).toUpperCase()}</span>}
        </div>
        <div className="account-id">
          <h2>{user.name || '未设置昵称'}</h2>
          <p className="muted">{user.phone ? `手机号 ${String(user.phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}` : user.email || '第三方账号登录'}</p>
          <code className="account-uid">UID: {user.id || '-'}</code>
        </div>
        <button className="btn" onClick={signOut}>退出登录</button>
      </div>

      <div className="account-grid">
        <div className="card account-stat">
          <small>登录方式</small>
          <strong>{providerLabel(provider)}</strong>
          <span className="muted">{serverOk === null ? '校验中…' : serverOk ? '服务端会话有效' : '服务端校验失败'}</span>
        </div>
        <div className="card account-stat">
          <small>云端文件</small>
          <strong>{files}</strong>
          <span className="muted">COS 私有存储</span>
        </div>
        <div className="card account-stat">
          <small>当前伙伴</small>
          <strong style={{ color: scheme.color }}>{scheme.name}</strong>
          <span className="muted">偏好已同步云端</span>
        </div>
        <div className="card account-stat">
          <small>登录状态</small>
          <strong className="account-ok">已登录</strong>
          <span className="muted">Token 由 SDK 自动续期</span>
        </div>
      </div>

      <div className="card account-json">
        <h3>云数据快照（preference/partner）</h3>
        <pre>{prefs ? JSON.stringify(prefs, null, 2) : '暂无同步数据'}</pre>
      </div>
    </div>
  )
}
