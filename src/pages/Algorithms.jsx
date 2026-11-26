import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db.js'
import { ALGO_GROUPS } from '../data/algorithms.js'

const LEVELS = ['全部', '入门', '进阶']

export default function Algorithms() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState('全部')
  const [expanded, setExpanded] = useState(null)
  const [copied, setCopied] = useState('')

  async function openInPlayground(item) {
    const name = item.key + '.py'
    const exists = await db.files.where('name').equals(name).first()
    if (!exists) {
      await db.files.add({ name, content: item.template, createdAt: Date.now(), updatedAt: Date.now() })
    }
    const f = await db.files.where('name').equals(name).first()
    navigate('/playground?id=' + f.id)
  }

  async function copyCode(item) {
    try {
      await navigator.clipboard.writeText(item.template)
    } catch {
      const area = document.createElement('textarea')
      area.value = item.template
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(item.key)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const groups = ALGO_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .map((item) => ({
        ...item,
        level: group.name.includes('数据结构') && item.key !== 'quick_sort' ? '入门' : '进阶',
      }))
      .filter((item) => {
        const keyword = (item.name + item.desc + item.key).toLowerCase()
        return keyword.includes(query.trim().toLowerCase()) && (level === '全部' || item.level === level)
      }),
  })).filter((group) => group.items.length > 0)

  return (
    <div className="page">
      <header className="page-head">
        <h1>算法乐园</h1>
        <p className="muted">每个算法都是可运行模板：可以先看代码、复制带走，或一键建仓到编程实验。依赖 iris.csv 的模板请先导入数据集。</p>
      </header>
      <div className="library-tools">
        <input
          className="text-input library-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索排序、回归、KNN…"
          aria-label="搜索算法"
        />
        <div className="chip-row" style={{ margin: 0 }}>
          {LEVELS.map((item) => (
            <button
              key={item}
              className={level === item ? 'chip btn-chip active' : 'chip btn-chip'}
              onClick={() => setLevel(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="library-result-count">{groups.reduce((total, group) => total + group.items.length, 0)} 个模板</span>
      </div>

      {groups.length === 0 && (
        <div className="empty-panel"><p>没有找到匹配的算法，换个关键词试试。</p></div>
      )}

      {groups.map((g) => (
        <section key={g.name} className="group">
          <div className="group-head">
            <h2>{g.name}</h2>
            <span>{g.items.length} 个模板</span>
          </div>
          <div className="card-grid three">
            {g.items.map((it) => (
              <div key={it.key} className="card static algo-card">
                <div className="algo-card-head">
                  <h3>{it.name}</h3>
                  <span className={'level-tag level-' + it.level}>{it.level}</span>
                </div>
                <p className="muted algo-desc">{it.desc}</p>
                {expanded === it.key && (
                  <pre className="algo-code-preview"><code>{it.template}</code></pre>
                )}
                <div className="algo-actions">
                  <button className="btn primary sm" onClick={() => openInPlayground(it)}>打开并运行</button>
                  <button className="btn sm" onClick={() => setExpanded(expanded === it.key ? null : it.key)}>
                    {expanded === it.key ? '收起代码' : '查看代码'}
                  </button>
                  <button className="btn sm" onClick={() => copyCode(it)}>
                    {copied === it.key ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
