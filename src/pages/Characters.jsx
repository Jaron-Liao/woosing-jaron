import { useState } from 'react'
import { useStore } from '../store.js'
import { SCHEMES } from '../data/schemes.js'
import { ANIMALS, CATEGORIES } from '../data/animals.js'

function PartnerCard({ item, selected, applied, onClick }) {
  const color = item.color || ['#FF6B35', '#7EC8E3', '#8FDAC5', '#FFD66B', '#C6B5F1'][item.id % 5]
  const initial = (item.name || '').replace(/[「」《》]/g, '').slice(0, 1)
  return (
    <button className={'partner-card' + (selected ? ' selected' : '') + (applied ? ' applied' : '')} onClick={onClick}>
      <span className="partner-avatar" style={{ background: color }}>
        {item.avatar ? <img src={item.avatar} alt="" /> : <span>{initial}</span>}
        {applied && <em className="partner-badge">使用中</em>}
      </span>
      <span className="partner-meta">
        <strong>{item.name}</strong>
        <small>{item.style || `${item.cat} · 建模难度 ${item.diff}`}</small>
        {item.anim && <small className="partner-anim">动画：{item.anim}</small>}
      </span>
      <span className="partner-check">{selected ? '✓' : ''}</span>
    </button>
  )
}

export default function Characters() {
  const scheme = useStore((s) => s.scheme)
  const appliedId = useStore((s) => s.appliedId)
  const candidate = useStore((s) => s.candidate)
  const selectCandidate = useStore((s) => s.selectCandidate)
  const clearCandidate = useStore((s) => s.clearCandidate)
  const applyCandidate = useStore((s) => s.applyCandidate)

  const [tab, setTab] = useState('scheme')
  const [cat, setCat] = useState(CATEGORIES[0])

  const schemeList = SCHEMES.map((s) => ({ ...s, key: `s${s.id}` }))
  const animalList = ANIMALS.filter((a) => a.cat === cat).map((a) => ({ ...a, key: `a${a.id}` }))
  const list = tab === 'scheme' ? schemeList : animalList

  const isSelected = (item) => {
    if (candidate == null) return false
    return tab === 'scheme' ? candidate === item.id : candidate === -(item.id)
  }
  const onPick = (item) => {
    const id = tab === 'scheme' ? item.id : -(item.id) // 动物用负数 id 区分命名空间
    if (candidate === id) clearCandidate()
    else selectCandidate(id)
  }

  return (
    <div className="page wide">
      <header className="page-head">
        <h1>学习伙伴</h1>
        <p className="muted">挑一位贯穿工作台的学习搭档。点击卡片选中，再按「应用」完成切换；「取消」回到当前伙伴。</p>
      </header>

      <div className="tab-bar">
        <button className={tab === 'scheme' ? 'tab active' : 'tab'} onClick={() => { setTab('scheme'); clearCandidate() }}>10 版角色方案</button>
        <button className={tab === 'animal' ? 'tab active' : 'tab'} onClick={() => { setTab('animal'); clearCandidate() }}>100 动物候选池</button>
      </div>

      <div className="partner-layout">
        <aside className="partner-cats">
          <div className="partner-cats-title">{tab === 'scheme' ? '角色方案' : '动物类型'}</div>
          {tab === 'scheme' ? (
            <button className={cat === '全部方案' ? 'cat-item active' : 'cat-item'} onClick={() => setCat('全部方案')}>全部方案</button>
          ) : (
            CATEGORIES.map((c) => (
              <button key={c} className={cat === c ? 'cat-item active' : 'cat-item'} onClick={() => setCat(c)}>{c}</button>
            ))
          )}
        </aside>

        <div className="partner-main">
          <div className="partner-grid">
            {list.map((item) => (
              <PartnerCard key={item.key} item={item}
                selected={isSelected(item)}
                applied={tab === 'scheme' && appliedId === item.id}
                onClick={() => onPick(item)} />
            ))}
          </div>
        </div>
      </div>

      <div className="partner-actions">
        <span className="partner-current">
          当前伙伴：<strong style={{ color: scheme.color }}>{scheme.name}</strong>
          {candidate != null && <span className="partner-pending">　待应用：{candidate > 0 ? SCHEMES.find((s) => s.id === candidate)?.name : ANIMALS.find((a) => a.id === -candidate)?.name}</span>}
        </span>
        <button className="btn" onClick={clearCandidate} disabled={candidate == null}>取消</button>
        <button className="btn primary" onClick={() => { if (applyCandidate()) clearCandidate() }} disabled={candidate == null}>应用伙伴</button>
      </div>
    </div>
  )
}
