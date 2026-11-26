import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

// low-poly 机械狐：几何体拼装，程序化动画。color 来自 scheme，决定主色。
function FoxModel({ color = '#B87333', mood = 'idle' }) {
  const g = useRef()
  const tail = useRef()
  const earL = useRef()
  const earR = useRef()
  const gear = useRef()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (g.current) {
      g.current.position.y = Math.sin(t * 1.6) * 0.09          // 漂浮
      g.current.rotation.y = Math.sin(t * 0.6) * 0.35          // 左右转头
    }
    if (tail.current) tail.current.rotation.z = Math.sin(t * 3) * 0.35
    if (earL.current) earL.current.rotation.z = Math.sin(t * 2.2) * 0.12
    if (earR.current) earR.current.rotation.z = -Math.sin(t * 2.2 + 0.5) * 0.12
    if (gear.current) gear.current.rotation.z = t * 0.8
  })

  const base = new THREE.Color(color)
  const dark = base.clone().multiplyScalar(0.55)
  const light = base.clone().lerp(new THREE.Color('#ffffff'), 0.45)

  return (
    <group ref={g} scale={1.15}>
      {/* 身体 */}
      <mesh position={[0, -0.55, 0]} castShadow>
        <capsuleGeometry args={[0.42, 0.42, 6, 12]} />
        <meshStandardMaterial color={light} roughness={0.75} flatShading />
      </mesh>
      {/* 胸口齿轮 */}
      <mesh ref={gear} position={[0, -0.5, 0.4]}>
        <torusGeometry args={[0.16, 0.05, 6, 10]} />
        <meshStandardMaterial color="#ffd66b" metalness={0.6} roughness={0.3} flatShading />
      </mesh>
      {/* 头 */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <sphereGeometry args={[0.52, 10, 8]} />
        <meshStandardMaterial color={base} roughness={0.7} flatShading />
      </mesh>
      {/* 耳朵 */}
      <mesh ref={earL} position={[-0.34, 0.68, 0]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.2, 0.42, 5]} />
        <meshStandardMaterial color={base} roughness={0.7} flatShading />
      </mesh>
      <mesh ref={earR} position={[0.34, 0.68, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.2, 0.42, 5]} />
        <meshStandardMaterial color={base} roughness={0.7} flatShading />
      </mesh>
      <mesh position={[-0.34, 0.7, 0.06]}>
        <coneGeometry args={[0.1, 0.22, 5]} />
        <meshStandardMaterial color="#ffb0a1" flatShading />
      </mesh>
      <mesh position={[0.34, 0.7, 0.06]}>
        <coneGeometry args={[0.1, 0.22, 5]} />
        <meshStandardMaterial color="#ffb0a1" flatShading />
      </mesh>
      {/* 口鼻（白） */}
      <mesh position={[0, 0.06, 0.44]}>
        <sphereGeometry args={[0.26, 8, 6]} />
        <meshStandardMaterial color="#fff6e8" roughness={0.8} flatShading />
      </mesh>
      {/* 眼睛 */}
      <mesh position={[-0.19, 0.27, 0.46]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color="#26344f" />
      </mesh>
      <mesh position={[0.19, 0.27, 0.46]}>
        <sphereGeometry args={[0.075, 8, 6]} />
        <meshStandardMaterial color="#26344f" />
      </mesh>
      <mesh position={[-0.17, 0.29, 0.52]}>
        <sphereGeometry args={[0.026, 6, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.21, 0.29, 0.52]}>
        <sphereGeometry args={[0.026, 6, 6]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* 鼻子 */}
      <mesh position={[0, 0.08, 0.68]}>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#26344f" />
      </mesh>
      {/* 侧齿轮装饰 */}
      <mesh position={[-0.5, 0.05, 0.1]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.11, 0.035, 5, 8]} />
        <meshStandardMaterial color="#ffd66b" metalness={0.5} roughness={0.35} flatShading />
      </mesh>
      {/* 尾巴 */}
      <mesh ref={tail} position={[-0.5, -0.7, -0.2]} rotation={[0, 0, -0.7]}>
        <coneGeometry args={[0.18, 0.85, 6]} />
        <meshStandardMaterial color={light} roughness={0.75} flatShading />
      </mesh>
    </group>
  )
}

export default function Buddy3D({ color, mood }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.4], fov: 42 }}
      gl={{ alpha: true, antialias: true }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={1.4} castShadow />
      <pointLight position={[-3, -1, 2]} intensity={0.5} color="#8fdac5" />
      <FoxModel color={color} mood={mood} />
    </Canvas>
  )
}
