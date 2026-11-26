import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { renderMarkdown } from '../utils/markdown.js'

const DEFAULT_NOTE = '# 新笔记\n\n- 支持 **粗体**、*斜体*、`行内代码`\n- 支持代码块、列表、引用、链接、表格\n- 用 [[文件名]] 引用代码或数据集，预览里可点击跳转\n'

export default function Notes() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [])
  const files = useLiveQuery(() => db.files.toArray(), [])
  const [activeId, setActiveId] = useState(() => Number(params.get('id')) || null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [view, setView] = useState('split')
  const [saveState, setSaveState] = useState('saved')
  const [refTarget, setRefTarget] = useState('')
  const [query, setQuery] = useState('')
  const timer = useRef(null)
  const taRef = useRef(null)

  const active = (notes || []).find((n) => n.id === activeId) || null

  useEffect(() => {
    if (active) {
      setTitle(active.title)
      setBody(active.body)
      setSaveState('saved')
    } else {
      setTitle('')
      setBody('')
    }
  }, [activeId]) // eslint-disable-line react-hooks/exhaustive-deps

  function onChange(t, b) {
    setTitle(t)
    setBody(b)
    setSaveState('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      if (activeId) {
        await db.notes.update(activeId, { title: t, body: b, updatedAt: Date.now() })
        setSaveState('saved')
      }
    }, 1500)
  }

  async function createNote(prefill) {
    const id = await db.notes.add({
      title: '新笔记',
      body: prefill || DEFAULT_NOTE,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    setActiveId(id)
    setView('split')
  }

  async function deleteNote(id) {
    if (!confirm('删除这篇笔记？')) return
    await db.notes.delete(id)
    if (activeId === id) setActiveId(null)
  }

  // 在光标处插入 [[引用]]
  function insertRef() {
    if (!refTarget || !taRef.current) return
    const ta = taRef.current
    const snippet = '[[' + refTarget + ']]'
    const start = ta.selectionStart ?? body.length
    const end = ta.selectionEnd ?? body.length
    const next = body.slice(0, start) + snippet + body.slice(end)
    onChange(title, next)
    setRefTarget('')
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + snippet.length, start + snippet.length)
    })
  }

  // 预览里的 [[引用]] 点击跳转
  function onPreviewClick(e) {
    const a = e.target.closest('a.ref')
    if (!a) return
    e.preventDefault()
    const name = a.getAttribute('data-ref')
    const f = (files || []).find((x) => x.name === name)
    if (f) {
      navigate('/playground?id=' + f.id)
    } else if (name === '数据集区' || name === '数据集') {
      navigate('/datasets')
    }
  }

  const wordCount = body.replace(/\s/g, '').length
  const refOptions = (files || []).map((f) => f.name)
  const visibleNotes = (notes || []).filter((note) => {
    const text = (note.title + ' ' + note.body).toLowerCase()
    return text.includes(query.trim().toLowerCase())
  })

  return (
    <div className="page wide">
      <header className="page-head row">
        <div>
          <h1>灵感笔记</h1>
          <p className="muted">
            {active
              ? `${saveState === 'saving' ? '保存中…' : '已自动保存'} · ${wordCount} 字`
              : '支持搜索、Markdown 双栏预览，以及 [[文件名]] 双向引用。'}
          </p>
        </div>
        <span className="spacer" />
        <button className="btn primary" onClick={() => createNote()}>+ 新建笔记</button>
      </header>

      <div className="notes-layout">
        <aside className="notes-list">
          <input
            className="text-input notes-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题和正文…"
            aria-label="搜索笔记"
          />
          {(notes || []).length === 0 && <p className="muted pad">还没有笔记。</p>}
          {(notes || []).length > 0 && visibleNotes.length === 0 && <p className="muted pad">没有匹配的笔记。</p>}
          {visibleNotes.map((n) => (
            <div key={n.id} className={n.id === activeId ? 'note-item active' : 'note-item'} onClick={() => setActiveId(n.id)}>
              <div className="note-title">{n.title || '未命名'}</div>
              <div className="note-meta">{new Date(n.updatedAt).toLocaleString('zh-CN', { hour12: false })}</div>
              <button
                className="note-del"
                onClick={(e) => { e.stopPropagation(); deleteNote(n.id) }}
                aria-label="删除笔记"
              >×</button>
            </div>
          ))}
        </aside>

        {active ? (
          <section className="notes-editor">
            <div className="tab-bar" style={{ marginBottom: 10 }}>
              {['split', 'edit', 'preview'].map((v) => (
                <button key={v} className={view === v ? 'tab active' : 'tab'} onClick={() => setView(v)}>
                  {{ split: '双栏', edit: '编辑', preview: '预览' }[v]}
                </button>
              ))}
            </div>
            <input
              className="text-input note-title-input"
              value={title}
              placeholder="标题"
              onChange={(e) => onChange(e.target.value, body)}
            />
            <div className="ref-bar">
              <select className="text-input" value={refTarget} onChange={(e) => setRefTarget(e.target.value)}>
                <option value="">插入代码/数据集引用…</option>
                {refOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                <option value="数据集区">数据集区</option>
              </select>
              <button className="btn" onClick={insertRef} disabled={!refTarget}>插入 [[引用]]</button>
            </div>
            <div className={'note-panes ' + view}>
              <textarea
                ref={taRef}
                className="note-textarea mono"
                value={body}
                onChange={(e) => onChange(title, e.target.value)}
                placeholder="用 Markdown 记点什么…"
              />
              <div
                className="md-preview"
                onClick={onPreviewClick}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
              />
            </div>
          </section>
        ) : (
          <div className="empty-panel notes-empty"><p>选一篇笔记开始，或点右上角新建。</p></div>
        )}
      </div>
    </div>
  )
}
