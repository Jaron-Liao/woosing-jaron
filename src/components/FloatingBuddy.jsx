import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useStore } from '../store.js'
import { askAgent, saveUserData } from '../cloud.js'

const Turnaround3D = lazy(() => import('./Turnaround3D.jsx'))

export default function FloatingBuddy() {
  const scheme = useStore((s) => s.scheme)
  const appliedId = useStore((s) => s.appliedId)
  const pos = useStore((s) => s.mascotPos)
  const setPos = useStore((s) => s.setMascotPos)
  const agentOpen = useStore((s) => s.agentOpen)
  const setAgentOpen = useStore((s) => s.setAgentOpen)
  const touchAi = useStore((s) => s.touchAi)

  const [dragging, setDragging] = useState(false)
  const [dock, setDock] = useState(false) // 收起到侧栏
  const [msgs, setMsgs] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const drag = useRef(null)

  // 本地优先恢复聊天记录（本地部署化：离线也能看历史）
  useEffect(() => {
    try {
      const cached = localStorage.getItem('cv:chat')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length) setMsgs(parsed.slice(-50))
      }
    } catch { /* ignore corrupt cache */ }
  }, [])

  const persist = (all) => {
    const bounded = all.slice(-50)
    try { localStorage.setItem('cv:chat', JSON.stringify(bounded)) } catch { /* storage full */ }
    saveUserData('agent', 'history', { messages: bounded }).catch(() => {})
  }

  // 未使用 AI 超过 60s：自动收起到最近侧栏
  useEffect(() => {
    const last = useStore.getState().lastAiAt
    if (!last || Date.now() - last < 60000) return
    if (!agentOpen) { setDock(true); return }
    const t = setTimeout(() => setDock(true), 60000 - (Date.now() - last))
    return () => clearTimeout(t)
  }, [agentOpen, msgs.length])

  const onPointerDown = (e) => {
    if (e.target.closest('button')) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    setDragging(true)
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!dragging || !drag.current) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    const maxX = window.innerWidth - 120
    const maxY = window.innerHeight - 140
    setPos({ x: Math.max(0, Math.min(maxX, drag.current.ox + dx)), y: Math.max(0, Math.min(maxY, drag.current.oy + dy)) })
  }
  const onPointerUp = () => {
    if (dragging) {
      // 拖到左边缘 80px 内 → 自动吸附收起
      if (pos.x < 80) setDock(true)
      setDragging(false)
      drag.current = null
    }
  }

  const send = async () => {
    if (!input.trim() || streaming) return
    const q = input.trim()
    const history = [...msgs, { role: 'user', text: q }]
    setMsgs(history)
    setInput('')
    touchAi()
    setDock(false)
    setStreaming(true)
    // 先落一条空的 agent 回复，后续 token 增量填充
    setMsgs([...history, { role: 'agent', text: '' }])
    try {
      let acc = ''
      const reply = await askAgent(
        history.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        `你是 CodeVerse 数学工作台的学习伙伴「${scheme.name}」。简洁友好地回答编程、算法、数学问题。`,
        (token) => {
          acc += token
          setMsgs([...history, { role: 'agent', text: acc }])
        }
      )
      const final = [...history, { role: 'agent', text: reply }]
      setMsgs(final)
      persist(final)
    } catch (e) {
      const err = [...history, { role: 'agent', text: `暂时无法连接 AI：${e.message}` }]
      setMsgs(err)
      persist(err)
    } finally {
      setStreaming(false)
    }
  }

  if (!appliedId) return null

  if (dock) {
    return (
      <button className="buddy-dock" onClick={() => { setDock(false); setAgentOpen(true) }} title="展开学习伙伴">
        <span className="buddy-dock-face" style={{ background: scheme.color }}>{scheme.name.slice(0, 1)}</span>
      </button>
    )
  }

  return (
    <>
      <div className={'floating-buddy' + (dragging ? ' dragging' : '')}
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <button className="buddy-min" onClick={() => setDock(true)} title="收起到侧栏">−</button>
        <button className="buddy-chat" onClick={() => setAgentOpen(!agentOpen)} title="打开 / 收起对话栏">对话</button>
        <button className="buddy-view3d" onClick={() => setViewerOpen(true)} title="查看可旋转 3D 形象">3D</button>
        <div className="buddy-stage" onClick={() => setViewerOpen(true)} title="点击查看可旋转的 3D 形象">
          {scheme.turnaround ? (
            <Suspense fallback={<div className="buddy-loading">加载中…</div>}>
              <Turnaround3D src={scheme.turnaround} className="turnaround3d--mini" spin showHint={false} />
            </Suspense>
          ) : scheme.avatar ? (
            <img className={'buddy-avatar' + (agentOpen ? ' active' : '')} src={scheme.avatar} alt={scheme.name} />
          ) : (
            <div className="buddy-loading">{scheme.name.slice(0, 1)}</div>
          )}
        </div>
        <div className="buddy-name" style={{ color: scheme.color }}>{scheme.name}</div>
      </div>

      {viewerOpen && (
        <div className="buddy-viewer" onClick={() => setViewerOpen(false)}>
          <div className="buddy-viewer-inner" onClick={(e) => e.stopPropagation()}>
            <button className="buddy-viewer-close" onClick={() => setViewerOpen(false)}>关闭 ×</button>
            <strong style={{ color: scheme.color }}>{scheme.name} · 3D 形象</strong>
            <Suspense fallback={<div className="buddy-loading">3D 加载中…</div>}>
              <Turnaround3D src={scheme.turnaround} />
            </Suspense>
            <button className="btn primary buddy-viewer-chat" onClick={() => { setViewerOpen(false); setAgentOpen(true) }}>和 TA 对话</button>
          </div>
        </div>
      )}

      {agentOpen && (
        <div className="agent-panel">
          <header className="agent-head">
            <span className="agent-title" style={{ color: scheme.color }}>{scheme.name} · Agent 对接栏</span>
            <div className="agent-head-actions">
              <button onClick={() => { setMsgs([]); persist([]) }} title="清空对话记录">清空</button>
              <button onClick={() => setAgentOpen(false)} title="收起对话栏">收起</button>
              <button onClick={() => { setAgentOpen(false); setDock(true) }} title="收起并停靠侧栏">停靠</button>
            </div>
          </header>
          <div className="agent-body">
            {msgs.length === 0 && <p className="agent-hint">对话会保存在本地并同步到云端。问我编程、算法或数学问题。</p>}
            {msgs.map((m, i) => (
              <div key={i} className={'agent-msg ' + m.role}>{m.text}</div>
            ))}
          </div>
          <div className="agent-input">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()} placeholder={streaming ? '正在回复…' : '问我任何事…'} disabled={streaming} />
            <button className="btn primary" onClick={send} disabled={streaming || !input.trim()}>{streaming ? '…' : '发送'}</button>
          </div>
        </div>
      )}
    </>
  )
}
