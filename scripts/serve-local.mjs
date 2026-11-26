// 本地部署化：一键启动生产构建站点（无需云服务，纯静态）。
// 用法：node scripts/serve-local.mjs [port]
// 聊天数据存本机 localStorage，代码/笔记存 IndexedDB，完全离线可用。

import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const port = Number(process.argv[2] || 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.glb': 'model/gltf-binary',
}

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
  if (urlPath === '/') urlPath = '/index.html'
  // 防目录穿越
  const file = path.join(root, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ''))
  if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return }
  fs.readFile(file, (err, buf) => {
    if (err) {
      // SPA fallback: hash 路由下不会发生，兜底回 index.html
      fs.readFile(path.join(root, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404).end('Not found'); return }
        res.writeHead(200, { 'Content-Type': TYPES['.html'] }).end(idx)
      })
      return
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=3600',
    })
    res.end(buf)
  })
})

server.listen(port, '0.0.0.0', () => {
  console.log(`CodeVerse local site running at http://localhost:${port}/`)
  console.log('Data stays in this browser (localStorage + IndexedDB).')
})
