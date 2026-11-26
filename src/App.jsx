import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import FloatingBuddy from './components/FloatingBuddy.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CodeVault from './pages/CodeVault.jsx'
import Playground from './pages/Playground.jsx'
import Notes from './pages/Notes.jsx'
import Algorithms from './pages/Algorithms.jsx'
import Datasets from './pages/Datasets.jsx'
import Characters from './pages/Characters.jsx'
import CharacterGallery from './pages/CharacterGallery.jsx'
import Account from './pages/Account.jsx'
import Login from './pages/Login.jsx'
import { useStore } from './store.js'
import { restoreAuth, currentSession, loadUserData, saveUserData } from './cloud.js'

export default function App() {
  const session = useStore((s) => s.session)
  const setSession = useStore((s) => s.setSession)
  const setScheme = useStore((s) => s.setScheme)
  const [booting, setBooting] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { session: restored, error: restoreError } = await restoreAuth()
        if (alive && restoreError) setAuthError(restoreError)
        const s = restored || await currentSession()
        if (alive && s) {
          setSession(s)
          // 拉取云端角色/伙伴配置，覆盖本地
          try {
            const pref = await loadUserData('preference', 'partner')
            if (pref?.value?.schemeId) setScheme(pref.value.schemeId)
          } catch { /* offline / first login */ }
        }
      } catch { /* stay signed out */ }
      finally { if (alive) setBooting(false) }
    })()
    return () => { alive = false }
  }, [setSession, setScheme])

  // 伙伴切换后自动同步到云端
  const appliedId = useStore((s) => s.appliedId)
  useEffect(() => {
    if (!session || !appliedId) return
    saveUserData('preference', 'partner', { schemeId: appliedId }).catch(() => {})
  }, [appliedId, session])

  // 站内扫码：回调落地页是被嵌在主页面里的 iframe，登录成功后只渲染一句提示，
  // 并把 session 通过 postMessage 交给父窗口，避免整个工作台在弹窗里铺开。
  const inFrame = typeof window !== 'undefined' && window.parent !== window
  useEffect(() => {
    if (!session || !inFrame) return
    try { window.parent.postMessage({ type: 'cv:oauth-session', session }, location.origin) } catch { /* cross-origin parent */ }
  }, [session, inFrame])

  if (booting) return <div className="app-booting">正在连接云端…</div>
  if (inFrame && session) {
    return (
      <div className="oauth-frame-done">
        <b>登录成功</b>
        <span>正在返回 CodeVerse…</span>
      </div>
    )
  }
  if (!session) return <Login error={authError} />

  return (
    <div className="layout">
      <Sidebar />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/code" element={<CodeVault />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/algorithms" element={<Algorithms />} />
          <Route path="/datasets" element={<Datasets />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/gallery" element={<CharacterGallery />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <FloatingBuddy />
    </div>
  )
}
