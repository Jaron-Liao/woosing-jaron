import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useStore } from '../store.js'
import WechatQrModal from '../components/WechatQrModal.jsx'
import {
  sendPhoneCode, verifyPhoneCode, startOAuth,
  isPublishedOrigin, publishedEntryUrl, isWeChatBrowser, shareCode,
} from '../cloud.js'
import { wechatH5Status, startWechatH5, takeWechatTicket } from '../wechatH5.js'
import { signInWithWechatTicket, cloudbaseConfigured } from '../cloudbase-bridge.js'

export default function Login({ error = '' }) {
  const setSession = useStore((s) => s.setSession)
  const [searchParams] = useSearchParams()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState(error)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [h5, setH5] = useState({ configured: false, customLoginEnabled: false, scope: '' })
  const [wxProfile, setWxProfile] = useState(null)
  const [bridgeBusy, setBridgeBusy] = useState(false)

  const published = isPublishedOrigin()
  const inWeChat = isWeChatBrowser()
  // 微信内置浏览器里 relay 只会给到 PC 扫码页（snsapi_login），扫码不可用，
  // 直接把手机号验证码顶到前面，避免用户白跳一次。
  const wechatScanUsable = published && !inWeChat
  const autoStarted = useRef(false)

  useEffect(() => { if (error) setErr(error) }, [error])

  // 微信内置浏览器 + 服务端已配好公众号授权时，才出现「微信一键登录」
  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!inWeChat) return
      const st = await wechatH5Status()
      if (alive) setH5(st)
      if (st.configured) {
        const p = await takeWechatTicket()
        if (!alive || !p) return
        // 方案 A：服务端已签 CloudBase 票 → 前端换正式登录态，直接进站
        if (p.mode === 'session' && st.customLoginEnabled && cloudbaseConfigured()) {
          setBridgeBusy(true)
          try {
            const s = await signInWithWechatTicket(p.ticket)
            if (alive && s?.id) { setSession(s); return }
            throw new Error('CloudBase 登录未返回用户身份')
          } catch (e) {
            if (alive) setErr(`微信登录失败：${e.message}。可改用手机号登录。`)
          } finally {
            if (alive) setBridgeBusy(false)
          }
        }
        if (alive) setWxProfile(p)
      }
    })()
    return () => { alive = false }
  }, [inWeChat])

  // 从本地预览一键跳到发布域名时带 ?oauth=wechat，落地后自动续上扫码流程。
  // sessionStorage 记录时间窗，避免授权失败时来回跳转成死循环。
  useEffect(() => {
    const want = searchParams.get('oauth')
    if (!want || autoStarted.current) return
    if (!published) return
    autoStarted.current = true
    const key = 'cv:autoOauth'
    const last = Number(sessionStorage.getItem(key) || 0)
    if (Date.now() - last < 30000) return
    sessionStorage.setItem(key, String(Date.now()))
    if (want === 'wechat' && !inWeChat) setQrOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runOAuth = async (provider) => {
    setErr(''); setBusy(true)
    try {
      location.assign(await startOAuth(provider))
    } catch (e) {
      setErr(e.message); setBusy(false)
    }
  }

  // 非发布域名：不发请求，直接把用户送到能用的地址
  const goPublished = (provider) => {
    const target = publishedEntryUrl(provider ? `/login?oauth=${provider}` : '/login')
    location.assign(target)
  }

  const onOAuth = (provider) => {
    if (!published) return goPublished(provider)
    if (provider === 'wechat') {
      if (inWeChat) {
        setErr('微信内置浏览器不支持扫码，请用手机号验证码登录，或在电脑上打开发布地址扫码。')
        return
      }
      // 站内弹窗出二维码；弹窗里保留了「整页方式打开」兜底
      setErr('')
      setQrOpen(true)
      return
    }
    return runOAuth(provider)
  }

  const onSend = async () => {
    setErr(''); setBusy(true)
    try { await sendPhoneCode(phone); setSent(true) }
    catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }
  const onVerify = async () => {
    setErr(''); setBusy(true)
    try {
      const s = await verifyPhoneCode(phone, code)
      if (s) setSession(s)
      else setErr('登录未完成，请重试')
    } catch (e) { setErr(e.message) }
    finally { setBusy(false) }
  }
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(publishedEntryUrl('/login'))
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { setErr('复制失败，请手动选择地址复制') }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">W</div>
        <h1>登录 CodeVerse</h1>
        <p className="muted">登录后数据云端隔离保存，多设备实时同步</p>

        <div className={`login-origin ${published ? 'is-ok' : 'is-warn'}`}>
          <span className="login-origin-dot" aria-hidden="true" />
          <div className="login-origin-text">
            <b>{published ? '发布域名 · 微信扫码可用' : '当前不是发布地址'}</b>
            <small>
              {published
                ? `分享码 ${shareCode()} · 数据写入云端`
                : '微信登录需在发布地址使用'}
            </small>
          </div>
          {!published && (
            <button className="btn tiny" onClick={() => goPublished('')}>去发布地址</button>
          )}
          {published && (
            <button className="btn tiny" onClick={onCopy}>{copied ? '已复制' : '复制地址'}</button>
          )}
        </div>

        <div className="login-oauth">
          <button
            className="btn oauth-wechat"
            disabled={busy}
            onClick={() => onOAuth('wechat')}
            title={published ? '跳转微信官方扫码页' : '将在发布地址打开'}
          >
            {published ? '微信扫码登录' : '在发布地址打开微信登录'}
          </button>
          <button className="btn oauth-workbuddy" disabled={busy} onClick={() => onOAuth('workbuddy')}>
            {published ? 'WorkBuddy 登录' : '在发布地址打开 WorkBuddy 登录'}
          </button>
        </div>

        {published && wechatScanUsable && (
          <p className="login-hint">点击微信登录会打开微信官方二维码页，手机扫码后自动回到站内。</p>
        )}
        {published && inWeChat && (
          <p className="login-hint warn">
            当前在微信内置浏览器中，扫码页需另一台设备。建议直接用下方手机号验证码登录。
          </p>
        )}

        {bridgeBusy && <p className="login-hint">正在用微信身份登录，请稍候…</p>}
        {inWeChat && h5.configured && (
          <button className="btn primary wx-h5-btn" disabled={busy || bridgeBusy} onClick={() => startWechatH5('#/')}>
            {bridgeBusy ? '正在登录…' : wxProfile ? '重新获取微信身份' : '微信一键登录'}
          </button>
        )}
        {wxProfile && (
          <div className="wx-profile">
            {wxProfile.avatar && <img src={wxProfile.avatar} alt="" />}
            <div>
              <b>{wxProfile.nickname || '微信用户'}</b>
              <small>{wxProfile.mode === 'session' ? '微信身份已确认' : '微信身份已确认，绑定手机号即可完成登录'}</small>
            </div>
          </div>
        )}

        <div className="login-divider"><span>或手机号登录</span></div>

        <div className="login-field">
          <input value={phone} onChange={(e) => { setPhone(e.target.value); setSent(false) }} placeholder="11 位手机号" inputMode="numeric" maxLength={11} />
          <button className="btn" onClick={onSend} disabled={busy || sent || !/^1\d{10}$/.test(phone)}>{sent ? '已发送' : '获取验证码'}</button>
        </div>
        <div className="login-field">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="短信验证码" inputMode="numeric" maxLength={6} />
          <button className="btn primary" onClick={onVerify} disabled={busy || !sent || code.length < 4}>登录 / 注册</button>
        </div>
        {err && <p className="login-err">{err}</p>}
        <p className="login-note">未注册的手机号验证后自动创建账号。验证码由腾讯云发送。</p>
      </div>

      <WechatQrModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        onSession={(s) => setSession(s)}
      />
    </div>
  )
}
