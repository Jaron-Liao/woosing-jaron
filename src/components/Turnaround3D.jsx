import { useEffect, useRef, useState } from 'react'

// 四面环视：正面 / 右侧 / 背面 / 镜像侧面。
// 用 CSS 3D transform 把三视图拼成一个可旋转的「纸盒转台」，
// 不引入 @react-three/fiber（v9 与本项目 React 18 不兼容，会导致模块初始化崩溃）。
const FACES = [
  { pos: '0% 0', mirror: false, label: '正面' },
  { pos: '50% 0', mirror: false, label: '侧面' },
  { pos: '100% 0', mirror: false, label: '背面' },
  { pos: '50% 0', mirror: true, label: '左侧面' },
]

/**
 * 三视图驱动的交互式伪 3D 展示。
 * 拖拽旋转、滚轮缩放；spin=true 时自动缓慢旋转。
 */
export default function Turnaround3D({ src, spin = true, showHint = true, className = '' }) {
  const wrapRef = useRef(null)
  const sceneRef = useRef(null)
  const carouselRef = useRef(null)
  const ctl = useRef({ angle: 0, zoom: 1, dragging: false, lastX: 0 })
  const dimsRef = useRef({ faceH: 240, faceW: 120, radius: 60 })
  const [dims, setDims] = useState(dimsRef.current)

  // 依据容器尺寸计算单面宽高；三视图单格宽高比为 1:2
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => {
      const h = el.clientHeight || 240
      const faceH = Math.max(40, h * 0.82)
      const faceW = faceH / 2
      const next = { faceH, faceW, radius: faceW / 2 }
      dimsRef.current = next
      setDims(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 自动旋转 + 把角度/缩放写进 DOM，避免 React 每帧重渲染
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (!ctl.current.dragging && spin) ctl.current.angle += dt * 20
      const { radius } = dimsRef.current
      if (carouselRef.current) {
        carouselRef.current.style.transform =
          `translateZ(${-radius}px) rotateY(${ctl.current.angle}deg)`
      }
      if (sceneRef.current) {
        sceneRef.current.style.transform = `scale(${ctl.current.zoom})`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spin])

  // 滚轮缩放（非 passive，允许 preventDefault 阻止页面滚动）
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const next = ctl.current.zoom - e.deltaY * 0.0012
      ctl.current.zoom = Math.max(0.6, Math.min(2.2, next))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e) => {
    ctl.current.dragging = true
    ctl.current.lastX = e.clientX
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const onPointerMove = (e) => {
    if (!ctl.current.dragging) return
    ctl.current.angle += (e.clientX - ctl.current.lastX) * 0.6
    ctl.current.lastX = e.clientX
  }
  const onPointerUp = () => { ctl.current.dragging = false }

  return (
    <div
      ref={wrapRef}
      className={'turnaround3d ' + className}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={sceneRef} className="turnaround3d-scene">
        <div
          ref={carouselRef}
          className="turnaround3d-carousel"
          style={{ width: dims.faceW, height: dims.faceH }}
        >
          {FACES.map((f, i) => (
            <div
              key={i}
              className="turnaround3d-face"
              style={{
                width: dims.faceW,
                height: dims.faceH,
                transform: `rotateY(${i * 90}deg) translateZ(${dims.radius}px)`,
              }}
            >
              <div
                className="turnaround3d-face-inner"
                style={{
                  backgroundImage: `url("${src}")`,
                  backgroundPosition: f.pos,
                  transform: f.mirror ? 'scaleX(-1)' : undefined,
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {showHint && <span className="turnaround3d-hint">拖动旋转 · 滚轮缩放</span>}
    </div>
  )
}
