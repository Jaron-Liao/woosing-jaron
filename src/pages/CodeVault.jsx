import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, langOf, starterCode } from '../db.js'

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'py', label: 'Python' },
  { key: 'c', label: 'C' },
  { key: 'cpp', label: 'C++' },
]

function fmtTime(ts) {
  return new Date(ts).toLocaleString('zh-CN', { hour12: false })
}

export default function CodeVault() {
  const files = useLiveQuery(() => db.files.orderBy('updatedAt').reverse().toArray(), [])
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('untitled.py')
  const [snapsFor, setSnapsFor] = useState(null)
  const snapshots = useLiveQuery(
    () => (snapsFor ? db.snapshots.where('fileId').equals(snapsFor).reverse().sortBy('createdAt') : []),
    [snapsFor],
  )

  // 首次进入种一个示例文件
  useEffect(() => {
    db.files.count().then((n) => {
      if (n === 0) {
        db.files.add({ name: 'hello.py', content: starterCode('hello.py'), createdAt: Date.now(), updatedAt: Date.now() })
      }
    })
  }, [])

  const list = (files || []).filter((f) => {
    const matchesLanguage = filter === 'all' || langOf(f.name).ext === filter
    return matchesLanguage && f.name.toLowerCase().includes(query.trim().toLowerCase())
  })

  async function createFile() {
    const name = newName.trim()
    if (!name) return
    const exists = (files || []).some((f) => f.name === name)
    if (exists) {
      alert('同名文件已存在')
      return
    }
    await db.files.add({ name, content: starterCode(name), createdAt: Date.now(), updatedAt: Date.now() })
    setCreating(false)
  }

  async function renameFile(f) {
    const name = prompt('重命名（需带扩展名 .py / .c / .cpp）', f.name)
    if (!name || name === f.name) return
    await db.files.update(f.id, { name, updatedAt: Date.now() })
  }

  async function deleteFile(f) {
    if (!confirm('删除 "' + f.name + '"？快照会一并删除。')) return
    await db.files.delete(f.id)
    await db.snapshots.where('fileId').equals(f.id).delete()
    if (snapsFor === f.id) setSnapsFor(null)
  }

  async function makeSnapshot(f) {
    await db.snapshots.add({ fileId: f.id, name: f.name, content: f.content, createdAt: Date.now() })
    setSnapsFor(f.id)
  }

  async function restoreSnapshot(s) {
    if (!confirm('恢复快照（' + fmtTime(s.createdAt) + '）？当前内容会被覆盖。')) return
    await db.files.update(s.fileId, { content: s.content, updatedAt: Date.now() })
  }

  async function deleteSnapshot(id) {
    await db.snapshots.delete(id)
  }

  function downloadFile(f) {
    const blob = new Blob([f.content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = f.name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>代码库</h1>
        <p className="muted">统一整理 Python、C、C++ 与经典算法模板。文件保存在浏览器本地，刷新不会丢失。</p>
      </header>

      <div className="toolbar">
        <input
          className="text-input code-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索文件名…"
          aria-label="搜索代码文件"
        />
        <div className="chip-row" style={{ margin: 0 }}>
          {FILTERS.map((f) => (
            <button key={f.key} className={filter === f.key ? 'chip btn-chip active' : 'chip btn-chip'} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
        </div>
        <span className="spacer" />
        <span className="library-result-count">{list.length} 个文件</span>
        <button className="btn primary" onClick={() => setCreating(!creating)}>+ 新建文件</button>
      </div>

      {creating && (
        <div className="create-bar">
          <input
            className="text-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFile()}
            placeholder="文件名，如 demo.py / demo.c / demo.cpp"
            autoFocus
          />
          <button className="btn primary" onClick={createFile}>创建</button>
          <button className="btn" onClick={() => setCreating(false)}>取消</button>
        </div>
      )}

      {!files ? (
        <div className="empty-panel"><p>正在读取本地代码库…</p></div>
      ) : files.length === 0 ? (
        <div className="empty-panel"><p>还没有文件，点右上角「新建文件」开始。</p></div>
      ) : list.length === 0 ? (
        <div className="empty-panel"><p>没有匹配的文件，换个关键词或语言筛选。</p></div>
      ) : (
        <table className="animal-table">
          <thead>
            <tr><th>文件名</th><th>语言</th><th>更新时间</th><th>操作</th></tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr key={f.id}>
                <td className="mono">{f.name}</td>
                <td>{langOf(f.name).lang}</td>
                <td className="muted">{fmtTime(f.updatedAt)}</td>
                <td className="actions">
                  <Link className="btn sm" to={'/playground?id=' + f.id}>打开</Link>
                  <button className="btn sm" onClick={() => downloadFile(f)}>下载</button>
                  <button className="btn sm" onClick={() => makeSnapshot(f)}>存快照</button>
                  <button className="btn sm" onClick={() => setSnapsFor(snapsFor === f.id ? null : f.id)}>快照</button>
                  <button className="btn sm" onClick={() => renameFile(f)}>重命名</button>
                  <button className="btn sm danger" onClick={() => deleteFile(f)}>删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {snapsFor && (
        <div className="snap-panel">
          <h3>快照记录（{(snapshots || []).length} 个）</h3>
          {(snapshots || []).length === 0 && <p className="muted">该文件还没有快照。</p>}
          {(snapshots || []).map((s) => (
            <div key={s.id} className="snap-row">
              <span className="mono muted">{fmtTime(s.createdAt)}</span>
              <span className="spacer" />
              <button className="btn sm" onClick={() => restoreSnapshot(s)}>恢复</button>
              <button className="btn sm danger" onClick={() => deleteSnapshot(s.id)}>删</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
