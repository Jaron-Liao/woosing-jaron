import fs from 'node:fs'
const p = 'src/data/schemes.js'
let s = fs.readFileSync(p, 'utf8')
const map = { 1: 'xinghang', 3: 'longyi', 4: 'bit', 5: 'neon', 6: 'foguang', 7: 'panda', 8: 'block', 9: 'teyu', 10: 'gugu' }
for (const [id, slug] of Object.entries(map)) {
  const marker = `id: ${id},`
  const idx = s.indexOf(marker)
  if (idx < 0) continue
  const end = s.indexOf(' },', idx)
  if (end < 0) continue
  const seg = s.slice(idx, end)
  if (seg.includes('avatar:')) continue
  s = s.slice(0, end) + `, avatar: '/avatars/${slug}.webp'` + s.slice(end)
}
fs.writeFileSync(p, s)
console.log(s.split('\n').filter(l => l.includes('avatar')).map(l => l.trim().slice(0, 60)).join('\n'))
