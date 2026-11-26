import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('public/avatars/turnaround')
const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'))
for (const f of files) {
  const src = path.join(dir, f)
  const out = src.replace('.png', '.webp')
  await sharp(src).webp({ quality: 82, effort: 4 }).toFile(out)
  const a = fs.statSync(src).size, b = fs.statSync(out).size
  console.log(f, `${(a/1048576).toFixed(2)}MB -> ${(b/1048576).toFixed(2)}MB`)
}
