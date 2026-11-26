import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // 相对路径，兼容 GitHub Pages 子目录部署
  base: './',
  plugins: [react()],
})
