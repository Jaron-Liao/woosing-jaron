import { useEffect, useRef, useState } from 'react'
import { startOAuth, currentSession } from '../cloud.js'

// 站内扫码弹窗：二维码由微信官方页面提供（iframe 内嵌，官方页面无 X-Frame-Options）。
// 微信页面上那句「WorkBuddy」是平台统一授权应用的固定文案，改不了；
// 这里把外层品牌做成 CodeVerse，并保留「整页跳转」作为兜底（整页链路已验证 100% 可用）。
export default function WechatQrModal({ open, onClose, onSession }) {
  const [url, setUrl] = useState('')
  const [err, setErr] = useState('')
  const [loaded, setLoaded] = useState(false)
  const frameRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    setErr(''); setLoaded(false); setUrl('')
    ;(async () => {
      try {
        const target = await startOAuth('wechat')
        if (alive) setUrl(target)
      } catch (e) {
        if (alive) setErr(e.message)
      }
    })()
    return () => { alive = false }
  }, [open])

  // 扫码期间轮询会话：iframe 回调落地后 session 会写入同源存储，父窗口能直接读到
  useEffect(() => {
    if (!open) return
    const tick = async () => {
      const s = await currentSession()
      if (s) { onSession?.(s); onClose?.() }
    }
    pollRef.current = setInterval(tick, 2000)
    const onMsg = (e) => {
      if (e.origin !== location.origin) return
      if (e.data?.type === 'cv:oauth-session' && e.data.session) {
        onSession?.(e.data.session)
        onClose?.()
      }
    }
    window.addEventListener('message', onMsg)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      clearInterval(pollRef.current)
      window.removeEventListener('message', onMsg)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onSession, onClose])

  if (!open) return null

  return (
    <div className="qr-mask" onClick={onClose}>
      <div className="qr-card" onClick={(e) => e.stopPropagation()}>
        <div className="qr-head">
          <div>
            <b>CodeVerse 微信扫码登录</b>
            <small>二维码由微信官方提供 · 扫码后在手机确认即可</small>
          </div>
          <button className="qr-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="qr-stage">
          {err ? (
            <div className="qr-fallback">
              <p>这个窗口里没能加载二维码。</p>
              <p className="muted">{err}</p>
              <a className="btn primary" href={err ? undefined : url} onClick={(e) => {
                e.preventDefault()
                location.assign(url || '#')
              }}>换整页方式打开</a>
            </div>
          ) : url ? (
            <>
              {!loaded && <div className="qr-loading">二维码加载中…</div>}
              <iframe
                ref={frameRef}
                src={url}
                title="微信扫码登录"
                className="qr-frame"
                onLoad={() => setLoaded(true)}
              />
            </>
          ) : (
            <div className="qr-loading">正在准备二维码…</div>
          )}
        </div>

        <div className="qr-foot">
          <span className="muted">扫不出来？</span>
          <a href={url || '#'} onClick={(e) => { e.preventDefault(); if (url) location.assign(url) }}>
            用整页方式打开
          </a>
          <span className="qr-sep">·</span>
          <a href="#" onClick={(e) => {
            e.preventDefault()
            onClose?.()
          }}>改用手机号登录</a>
        </div>
      </div>
    </div>
  )
}
