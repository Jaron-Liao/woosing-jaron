import { useEffect, useRef, useState } from 'react'

/**
 * 真·3D 学习伙伴（灵犀机械狐）。
 *
 * 为什么直接用 three 而不用 @react-three/fiber：
 * r3f v9 需要 React 19，本项目是 React 18，初始化会崩掉整页（已踩过）。
 * 这里手写 renderer / scene / raf，与 React 生命周期完全解耦。
 *
 * 模型来源：
 * 1) 若 public/models/codeverse-buddy.glb 存在 → 加载 Blender 导出的高质感模型
 * 2) 否则用与 blender/generate_buddy.py 同构的程序化几何即时生成
 *
 * 交互：拖拽旋转 / 滚轮缩放 / 自动转台 / 呼吸与尾巴摆动。
 */
// __BUDDY_GLB__ 由 vite.config.js 在构建期决定：public/models 下存在 glb 就启用，
// 否则为 null，静默回退到程序化 3D，不产生任何探针请求或 404。
const DEFAULT_GLB = typeof __BUDDY_GLB__ === 'undefined' ? null : __BUDDY_GLB__

export default function BuddyModel3D({ height = 360, glbUrl = DEFAULT_GLB, className = '' }) {
  const mountRef = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let disposed = false
    let cleanup = () => {}

    ;(async () => {
      const THREE = await import('three')
      if (disposed || !mountRef.current) return
      const mount = mountRef.current

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
      camera.position.set(2.1, 1.9, 4.4)
      camera.lookAt(0, 1.15, 0)

      let renderer
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      } catch (e) {
        setStatus('no-webgl')
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.18
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      mount.appendChild(renderer.domElement)
      renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;cursor:grab;touch-action:none'

      // ---- 光照：三点布光，与 Blender 脚本一致 ----
      scene.add(new THREE.AmbientLight(0xffffff, 0.55))
      const key = new THREE.DirectionalLight(0xfff2e0, 2.2)
      key.position.set(2.6, 4.2, -3.4)
      key.castShadow = true
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.radius = 4
      key.shadow.bias = -0.0004
      key.shadow.camera.left = -3; key.shadow.camera.right = 3
      key.shadow.camera.top = 4; key.shadow.camera.bottom = -1
      scene.add(key)
      const fill = new THREE.DirectionalLight(0x9ee8ff, 1.15)
      fill.position.set(-3.2, 2.2, -1.0)
      scene.add(fill)
      const rim = new THREE.DirectionalLight(0x59ffd9, 2.0)
      rim.position.set(0.4, 3.4, 3.2)
      scene.add(rim)

      // 地面 + 柔和接触阴影
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(2.6, 48),
        new THREE.ShadowMaterial({ opacity: 0.18 }),
      )
      ground.rotation.x = -Math.PI / 2
      ground.position.y = 0.005
      ground.receiveShadow = true
      scene.add(ground)

      const root = new THREE.Group()
      scene.add(root)

      const C = {
        body: 0x218cd9, accent: 0x10dcb8, dark: 0x17232e,
        white: 0xf5faff, gold: 0xffc854,
      }
      const material = (color, metalness = 0.2, roughness = 0.4, emissive = 0x000000, intensity = 0) =>
        new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: intensity })
      const M = {
        body: material(C.body, 0.28, 0.36),
        accent: material(C.accent, 0.12, 0.3, C.accent, 0.28),
        dark: material(C.dark, 0.65, 0.34),
        white: material(C.white, 0.05, 0.52),
        gold: material(C.gold, 0.72, 0.28),
      }

      const geometries = []
      const track = (g) => { geometries.push(g); return g }
      const sphere = (r, seg = 20) => track(new THREE.SphereGeometry(r, seg, Math.max(8, seg - 8)))
      const boxG = () => track(new THREE.BoxGeometry(1, 1, 1))
      const coneG = (r, h) => track(new THREE.ConeGeometry(r, h, 16))

      const put = (geo, m, pos, scale, parent = root) => {
        const o = new THREE.Mesh(geo, m)
        o.position.set(...pos)
        if (scale) o.scale.set(...scale)
        o.castShadow = true
        o.receiveShadow = true
        parent.add(o)
        return o
      }

      /** 程序化建模（与 Blender 脚本同构） */
      const buildProcedural = () => {
        const s = sphere(1)
        const b = boxG()
        // Blender 是 Z-up、three.js 是 Y-up：整组绕 X 轴 -90° 立起来。
        // 旋转后原 -Y（正面）变成 +Z，正好朝向初始相机。
        const model = new THREE.Group()
        model.rotation.x = -Math.PI / 2
        root.add(model)
        // 显式签名，不用 rest + spread 转发（Vite 转译下会参数错位）
        const place = (geo, m, pos, scale, parent) => put(geo, m, pos, scale, parent || model)

        place(s, M.body, [0, 0, 1.02], [0.62, 0.46, 0.58])
        // 肚皮前移并缩小，避免被躯干完全包住（第一版这里是看不见的）
        place(s, M.white, [0, -0.24, 1.02], [0.38, 0.30, 0.40])
        place(b, M.accent, [0, -0.02, 1.30], [0.52, 0.12, 0.10])
        place(s, M.body, [0, -0.30, 1.72], [0.48, 0.44, 0.44])
        place(s, M.white, [0, -0.62, 1.62], [0.24, 0.26, 0.20])
        place(s, M.dark, [0, -0.85, 1.66], [0.085, 0.07, 0.07])

        const ears = []
        for (const side of [-1, 1]) {
          const e = place(coneG(0.19, 0.52), M.body, [0.29 * side, -0.20, 2.12])
          e.rotation.z = -0.18 * side
          e.rotation.x = 0.12
          ears.push(e)
          const inner = place(coneG(0.10, 0.34), M.accent, [0.29 * side, -0.27, 2.10])
          inner.rotation.z = -0.18 * side
          inner.rotation.x = 0.12
          place(s, M.dark, [0.19 * side, -0.68, 1.79], [0.085, 0.045, 0.095])
          place(s, M.accent, [0.19 * side, -0.71, 1.79], [0.042, 0.022, 0.048])
        }

        // 尾巴挂在根部枢轴上，摆动时是「摇尾巴」而不是整条尾巴平移
        const tail = new THREE.Group()
        tail.position.set(0, 0, 0.95)
        model.add(tail)
        ;[[0, 0.55, 0.05, 0.24, M.body], [0, 0.86, 0.23, 0.26, M.body], [0, 1.12, 0.46, 0.21, M.accent]]
          .forEach(([x, y, z, r, m]) => place(s, m, [x, y, z], [r, r * 1.1, r], tail))

        for (const x of [-0.34, 0.34]) for (const y of [-0.28, 0.30]) {
          place(b, M.body, [x, y, 0.44], [0.19, 0.20, 0.72])
          place(s, M.dark, [x, y - 0.04, 0.13], [0.15, 0.20, 0.11])
        }
        // 胸口能量核心贴到躯干前表面，避免被身体吃掉
        place(s, M.accent, [0, -0.56, 1.18], [0.15, 0.07, 0.15])
        place(s, M.gold, [0, -0.61, 1.18], [0.080, 0.035, 0.080])
        return { tail, ears }
      }

      let animated = { tail: null, ears: [] }
      let usedGlb = false

      // 优先尝试 Blender 导出的 glb；缺失或损坏时静默回退到程序化模型
      try {
        const probe = await fetch(glbUrl, { method: 'HEAD' })
        if (probe.ok) {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
          const loader = new GLTFLoader()
          const gltf = await new Promise((resolve, reject) => loader.load(glbUrl, resolve, undefined, reject))
          root.clear()
          const model = gltf.scene
          model.traverse((o) => {
            if (o.isMesh) { o.castShadow = true; o.receiveShadow = true }
          })
          root.add(model)
          usedGlb = true
        }
      } catch { /* 无 glb 或加载失败 → 程序化 */ }

      if (!usedGlb) animated = buildProcedural()
      setStatus(usedGlb ? 'glb' : 'procedural')

      // ---- 交互 ----
      const ctl = { angle: 0, zoom: 1, dragging: false, lastX: 0, lastY: 0, pitch: 0, autoSpin: true }
      const el = renderer.domElement
      const down = (e) => {
        ctl.dragging = true; ctl.autoSpin = false
        ctl.lastX = e.clientX; ctl.lastY = e.clientY
        el.style.cursor = 'grabbing'
        el.setPointerCapture?.(e.pointerId)
      }
      const move = (e) => {
        if (!ctl.dragging) return
        ctl.angle += (e.clientX - ctl.lastX) * 0.008
        ctl.pitch = Math.max(-0.35, Math.min(0.5, ctl.pitch + (e.clientY - ctl.lastY) * 0.004))
        ctl.lastX = e.clientX; ctl.lastY = e.clientY
      }
      const up = (e) => {
        ctl.dragging = false
        el.style.cursor = 'grab'
        el.releasePointerCapture?.(e.pointerId)
      }
      const wheel = (e) => {
        e.preventDefault()
        ctl.zoom = Math.max(0.6, Math.min(1.8, ctl.zoom - e.deltaY * 0.001))
      }
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
      el.addEventListener('wheel', wheel, { passive: false })

      const resize = () => {
        const w = mount.clientWidth || 600
        const h = mount.clientHeight || height
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(mount)

      let raf = 0
      const clock = new THREE.Clock()
      const loop = () => {
        raf = requestAnimationFrame(loop)
        const t = clock.getElapsedTime()
        if (ctl.autoSpin) ctl.angle += 0.0013
        const radius = 4.6 / ctl.zoom
        camera.position.set(
          Math.sin(ctl.angle) * radius,
          1.9 + ctl.pitch * 3,
          Math.cos(ctl.angle) * radius,
        )
        camera.lookAt(0, 1.15, 0)
        root.position.y = Math.sin(t * 1.6) * 0.025
        if (animated.tail) animated.tail.rotation.z = Math.sin(t * 1.9) * 0.22
        animated.ears.forEach((e, i) => { e.rotation.x = 0.12 + Math.sin(t * 2.2 + i) * 0.06 })
        renderer.render(scene, camera)
      }
      loop()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        el.removeEventListener('pointerdown', down)
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        el.removeEventListener('wheel', wheel)
        geometries.forEach((g) => g.dispose())
        Object.values(M).forEach((m) => m.dispose())
        ground.geometry.dispose(); ground.material.dispose()
        renderer.dispose()
        if (el.parentNode === mount) mount.removeChild(el)
      }
    })()

    return () => { disposed = true; cleanup() }
  }, [glbUrl, height])

  return (
    <div className={`buddy-model3d ${className}`} style={{ height }}>
      <div ref={mountRef} className="buddy-model3d-canvas" />
      {status === 'loading' && <div className="buddy-model3d-hint">正在构建 3D 模型…</div>}
      {status === 'no-webgl' && <div className="buddy-model3d-hint">当前浏览器不支持 WebGL，已回退到三视图模式。</div>}
      <span className="buddy-model3d-badge">{status === 'glb' ? 'Blender 模型' : '程序化 3D'}</span>
    </div>
  )
}
