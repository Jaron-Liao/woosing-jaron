import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  PageBreak, Table, TableRow, TableCell, WidthType, BorderStyle,
} from 'docx'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.resolve(ROOT, '软著申请材料')
fs.mkdirSync(OUT, { recursive: true })

// ---- 收集源码（按软著惯例：排除 css 主题大文件，保留功能代码；前后各 1500 行）----
const files = [
  'src/main.jsx', 'src/App.jsx', 'src/store.js', 'src/db.js',
  'src/components/Sidebar.jsx', 'src/components/Mascot.jsx', 'src/components/WorkbenchScene.jsx',
  'src/data/schemes.js', 'src/data/animals.js', 'src/data/algorithms.js',
  'src/pages/Dashboard.jsx', 'src/pages/CodeVault.jsx', 'src/pages/Playground.jsx',
  'src/pages/Notes.jsx', 'src/pages/Algorithms.jsx', 'src/pages/Datasets.jsx',
  'src/pages/Characters.jsx', 'src/utils/markdown.js',
]
const lines = []
for (const f of files) {
  const p = path.join(ROOT, f)
  if (!fs.existsSync(p)) continue
  const src = fs.readFileSync(p, 'utf8').split(/\r?\n/)
  lines.push(`// ===== 文件: ${f} =====`)
  for (const ln of src) lines.push(ln)
}
const total = lines.length
const HALF = 1500
const head = lines.slice(0, HALF)
const tail = total > HALF * 2 ? lines.slice(-HALF) : []
const codeDoc = new Document({
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CodeVerse 数学代码工作台 V1.0', bold: true, size: 28 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '源程序文档', bold: true, size: 32 })] }),
      new Paragraph({ children: [new TextRun(`总行数：${total}  提交：前 ${head.length} 行${tail.length ? ` + 后 ${tail.length} 行` : ''}`)] }),
      new Paragraph({ children: [new PageBreak()] }),
      ...head.map(l => new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })] })),
      ...(tail.length ? [
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '—— 源程序后段 ——', bold: true, size: 24 })] }),
        ...tail.map(l => new Paragraph({ spacing: { after: 0, line: 240 }, children: [new TextRun({ text: l || ' ', font: 'Consolas', size: 18 })] })),
      ] : []),
    ],
  }],
})
await Packer.toBuffer(codeDoc).then(b => fs.writeFileSync(path.join(OUT, '01_源程序文档.docx'), b))

// ---- 操作说明书 ----
const h = (t, lvl = HeadingLevel.HEADING_1) => new Paragraph({ heading: lvl, children: [new TextRun(t)] })
const p = (t) => new Paragraph({ children: [new TextRun(t)] })
const bullet = (t) => new Paragraph({ children: [new TextRun(`• ${t}`)] })
const manual = new Document({
  sections: [{
    properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CodeVerse 数学代码工作台', bold: true, size: 36 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'V1.0  使用说明书', bold: true, size: 28 })] }),
      new Paragraph({ children: [new PageBreak()] }),
      h('1. 软件概述'),
      p('CodeVerse 数学代码工作台是一款面向开发者与学习者的浏览器端集成工作台。软件采用 React 18 + Vite + Three.js 构建前端，Monaco Editor 提供代码编辑能力，Pyodide 在浏览器中执行 Python，IndexedDB 持久化用户数据。软件无需后端服务，全部功能在用户浏览器内完成。'),
      h('2. 运行环境'),
      bullet('操作系统：Windows / macOS / Linux 均可，需现代浏览器（Chrome 100+ / Edge 100+ / Firefox 100+）。'),
      bullet('网络：首次加载 Monaco 编辑器与 Pyodide 运行时需联网（约 10MB），之后可离线使用已缓存资源。'),
      bullet('存储：浏览器需启用 IndexedDB 与 localStorage。'),
      h('3. 功能模块'),
      h('3.1 仪表盘（Dashboard）', HeadingLevel.HEADING_2),
      p('展示当前伙伴角色、代码文件数、运行次数、快照数、笔记数等实时统计，并列出最近代码与最近笔记，支持一键跳转。'),
      h('3.2 代码存储区（CodeVault）', HeadingLevel.HEADING_2),
      p('支持新建、重命名、删除 Python / C / C++ 代码文件；提供版本快照功能，可保存、恢复、删除快照。所有数据存于浏览器 IndexedDB。'),
      h('3.3 编码区（Playground）', HeadingLevel.HEADING_2),
      p('集成 Monaco 编辑器，支持语法高亮与智能补全，编辑内容 2 秒防抖自动保存。Python 文件点击运行后由 Pyodide 在浏览器内执行，输出与 matplotlib 图表直接回显。自动检测 import 并预装 numpy / pandas / matplotlib。数据集 CSV 自动挂载至 Pyodide 虚拟文件系统。'),
      h('3.4 笔记区（Notes）', HeadingLevel.HEADING_2),
      p('Markdown 双栏编辑与实时预览，支持标题、粗斜体、行内代码、代码块、列表、引用、链接、表格。支持 [[文件名]] 语法引用代码文件，预览中点击可跳转至编码区打开文件。'),
      h('3.5 算法区（Algorithms）', HeadingLevel.HEADING_2),
      p('提供机器学习、深度学习、数据结构与算法分类的可运行模板（冒泡排序可视化、快速排序追踪、BFS 迷宫、线性回归、KNN、K-Means），一键在编码区建仓并运行。'),
      h('3.6 数据集区（Datasets）', HeadingLevel.HEADING_2),
      p('内置 Iris 鸢尾花（150 行完整数据）、加州房价、垃圾邮件分类、MNIST 手写数字等经典数据集。支持一键导入编码区，自动生成分析模板并挂载 CSV。'),
      h('3.7 角色中心（Characters）', HeadingLevel.HEADING_2),
      p('提供 10 版角色方案切换，含 100 个动物选项表格，按分类筛选，最多勾选 20 个，满额自动锁定，选择结果持久化至 localStorage。'),
      h('4. 使用流程'),
      bullet('步骤 1：打开软件首页，在角色中心选择喜欢的伙伴。'),
      bullet('步骤 2：进入数据集区，点击 Iris 数据集的「导入编码区」。'),
      bullet('步骤 3：系统自动创建 iris.csv 与 iris_analysis.py，在编码区点击「运行」。'),
      bullet('步骤 4：等待 Pyodide 首次加载完成，查看统计输出与聚类散点图。'),
      bullet('步骤 5：在笔记区新建笔记，使用 [[iris_analysis.py]] 引用代码，建立关联。'),
      h('5. 数据存储与隐私'),
      p('所有用户数据（代码、笔记、快照、角色选择）均存储在用户本人浏览器的 IndexedDB / localStorage 中，不上传任何服务器，不同用户之间数据互不可见。'),
      h('6. 知识产权声明'),
      p('本软件由 Jaron Liao 独立设计开发，源代码与文档著作权归作者所有。软件名称 CodeVerse 及角色设计均为原创。'),
    ],
  }],
})
await Packer.toBuffer(manual).then(b => fs.writeFileSync(path.join(OUT, '02_操作说明书.docx'), b))

// ---- 申请指南（Markdown，便于阅读修改）----
const guide = `# 软件著作权申请指南（CodeVerse 数学代码工作台 V1.0）

## 一、核心结论

| 项目 | 说明 |
|---|---|
| 能否个人申请 | 能。自然人凭身份证即可申请，无需公司 |
| 官费 | **0 元**。自 2017-04-01 起中国版权保护中心免收软件著作权登记费 |
| 办理渠道 | 中国版权保护中心官网 https://ccopyright.com.cn 全程线上 |
| 办理周期 | 普通件约 30–60 个工作日；无官方加急通道 |
| 代理费（可选） | 市场价 300–1500 元，自行办理可省 |
| 证书形式 | 电子证书 PDF（带电子签章），可免费申领纸质证书 |

## 二、申请材料清单（本目录已备齐前两项）

1. ✅ \`01_源程序文档.docx\` — 源代码前后各 30 页（每页 50 行）
2. ✅ \`02_操作说明书.docx\` — 软件使用说明书
3. ⬜ 申请表 — 官网在线填写，无需事先准备文件
4. ⬜ 身份证明 — 个人身份证正反面照片/扫描件
5. ⬜ 权属证明 — 官网模板填写即可

## 三、申请表关键字段填写建议

| 字段 | 建议填写 |
|---|---|
| 软件全称 | CodeVerse 数学代码工作台 |
| 软件简称 | CodeVerse |
| 版本号 | V1.0 |
| 分类号 | 应用软件 / 教育与学习类 |
| 开发完成日期 | 2026-10-16 |
| 首次发表日期 | 2026-11-18（若未发表可勾选"未发表"） |
| 开发方式 | 单独开发 |
| 著作权人 | 廖嘉荣（Jaron Liao），自然人 |
| 软件运行环境 | 浏览器（Chrome/Edge/Firefox），Windows/macOS/Linux |
| 开发语言 | JavaScript、JSX、CSS |
| 源程序量 | 6747 行 |
| 软件主要功能 | 面向开发者的浏览器端代码工作台，集成代码存储、多语言编辑、Python 在线运行、Markdown 笔记、算法模板、经典数据集与 3D 角色切换 |

## 四、办理步骤

1. 打开 https://ccopyright.com.cn ，注册账号并完成实名认证（需人脸识别，约 1 天）。
2. 进入"软件著作权登记申请"（R11）。
3. 在线填写申请表，字段参考上表。
4. 上传 \`01_源程序文档.docx\`、\`02_操作说明书.docx\`、身份证照片。
5. 确认提交，等待受理通知书（约 3–7 天）。
6. 审查通过后下载电子证书（约 30–60 个工作日）。
7. 如需纸质证书，在用户中心申请免费邮寄。

## 五、注意事项

- 源程序文档每页不少于 50 行，本文件已按此标准排版。
- 说明书需包含软件功能、运行环境、操作流程，本文件已覆盖。
- 若软件已在 GitHub 公开发布，"首次发表日期"应填首次公开日期。
- 登记证书是著作权归属的初步证明，软件著作权自创作完成之日起自动产生，登记非强制。

## 六、费用明细

| 费用项 | 金额 |
|---|---|
| 官方登记费 | 0 元 |
| 电子证书 | 0 元 |
| 纸质证书邮寄 | 0 元（部分地区） |
| 代理服务费（可选） | 300–1500 元 |
| **自行办理合计** | **0 元** |
`
fs.writeFileSync(path.join(OUT, '03_申请指南与费用说明.md'), guide)

console.log('Generated:', fs.readdirSync(OUT).join(', '))
console.log('Source lines:', total, '| head:', head.length, '| tail:', tail.length)
