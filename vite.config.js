import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 编译期探测 Blender 产物：存在就自动启用高质感 glb，不存在则静默回退到程序化 3D。
// 用 define 而不是运行时 fetch，避免线上产生 404 噪音，也保证 CI 与本地一致。
const here = fileURLToPath(new URL('.', import.meta.url))
const hasBlenderModel = existsSync(resolve(here, 'public/models/codeverse-buddy.glb'))

export default defineConfig({
  // 相对路径，兼容 GitHub Pages 子目录部署
  base: './',
  plugins: [react()],
  define: {
    __BUDDY_GLB__: JSON.stringify(hasBlenderModel ? 'models/codeverse-buddy.glb' : null),
  },
})
