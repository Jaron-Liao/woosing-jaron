import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const dir = path.resolve('public/avatars')
const td = path.join(dir, 'turnaround')
const slugs = ['longyi', 'bit', 'neon', 'foguang', 'panda', 'block', 'teyu', 'gugu', 'xinghang', 'lingxi']
for (const s of slugs) {
  const src = path.join(td, `${s}.webp`)
  const meta = await sharp(src).metadata()
  // 三视图横排：取左侧 1/3 为正面视图
  const w = Math.round(meta.width / 3)
  const h = meta.height
  const out = path.join(dir, `${s}.webp`)
  await sharp(src)
    .extract({ left: 0, top: 0, width: w, height: h })
    .resize(512, 512, { fit: 'cover', position: 'attention' })
    .webp({ quality: 85 })
    .toFile(out)
  console.log(s, `${(fs.statSync(out).size/1024).toFixed(0)}KB`)
}
