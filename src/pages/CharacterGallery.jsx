import { lazy, Suspense, useState } from 'react'
import { SCHEMES } from '../data/schemes.js'

const Turnaround3D = lazy(() => import('../components/Turnaround3D.jsx'))
const BuddyModel3D = lazy(() => import('../components/BuddyModel3D.jsx'))

export default function CharacterGallery() {
  const [zoom, setZoom] = useState(null)
  const [view, setView] = useState('3d')
  const character = SCHEMES.find((s) => s.id === zoom)

  return (
    <div className="page wide">
      <header className="page-head">
        <h1>角色三视图图鉴</h1>
        <p className="muted">10 版学习伙伴的高质感三视图（正面 / 侧面 / 背面）。点击卡片进入交互式 3D 转台，可拖动旋转、滚轮缩放。</p>
      </header>
      <div className="gallery-grid">
        {SCHEMES.map((s) => (
          <figure key={s.id} className="gallery-card">
            <button className="gallery-thumb" onClick={() => { setView('3d'); setZoom(s.id) }} title="点击查看交互式 3D">
              <img src={s.turnaround} alt={s.name} loading="lazy" />
              <span className="gallery-3d-badge">3D</span>
            </button>
            <figcaption>
              <strong style={{ color: s.color }}>{s.name}</strong>
              <small>{s.style}</small>
            </figcaption>
          </figure>
        ))}
      </div>
      {character && (
        <div className="gallery-modal" onClick={() => setZoom(null)}>
          <div className="gallery-modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-close" onClick={() => setZoom(null)}>关闭 ×</button>
            <div className="gallery-modal-head">
              <strong style={{ color: character.color }}>{character.name}</strong>
              <div className="gallery-view-tabs">
                <button className={view === '3d' ? 'active' : ''} onClick={() => setView('3d')}>转台 3D</button>
                <button className={view === 'model' ? 'active' : ''} onClick={() => setView('model')}>立体建模</button>
                <button className={view === 'raw' ? 'active' : ''} onClick={() => setView('raw')}>原始三视图</button>
              </div>
            </div>
            {view === '3d' && (
              <Suspense fallback={<div className="gallery-3d-loading">3D 查看器加载中…</div>}>
                <Turnaround3D src={character.turnaround} />
              </Suspense>
            )}
            {view === 'model' && (
              <Suspense fallback={<div className="gallery-3d-loading">立体模型加载中…</div>}>
                <BuddyModel3D height={400} />
              </Suspense>
            )}
            {view === 'raw' && <img src={character.turnaround} alt={character.name} />}
            <p>
              {view === '3d' && '拖动旋转 · 滚轮缩放 · 自动缓慢转台'}
              {view === 'model' && '真 3D 立体模型：拖动旋转 · 滚轮缩放 · 呼吸与尾巴动画。若已用 Blender 导出 glb 会自动加载高质感版本。'}
              {view === 'raw' && `${character.name} · 三视图原图`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
