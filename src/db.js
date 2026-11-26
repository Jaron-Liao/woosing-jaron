import Dexie from 'dexie'

export const db = new Dexie('codeverse')

db.version(1).stores({
  files: '++id, name, updatedAt',
  snapshots: '++id, fileId, createdAt',
})

db.version(2).stores({
  notes: '++id, title, updatedAt',
})

export const LANGS = { py: 'Python', c: 'C', cpp: 'C++', csv: '数据' }

export function langOf(name) {
  const ext = name.split('.').pop().toLowerCase()
  return { ext, lang: LANGS[ext] || '文本', monaco: { py: 'python', c: 'c', cpp: 'cpp' }[ext] || 'plaintext' }
}

export const TEMPLATES = {
  py: `import pandas as pd

# 从数据集区导入 CSV 后，这里可以直接分析
df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
print(df)
`,
  c: `#include <stdio.h>

int main(void) {
    printf("Hello, CodeVerse!\\n");
    return 0;
}
`,
  cpp: `#include <iostream>

int main() {
    std::cout << "Hello, CodeVerse!" << std::endl;
    return 0;
}
`,
}

export function starterCode(name) {
  return TEMPLATES[name.split('.').pop().toLowerCase()] || ''
}

// Pyodide CDN 运行时（懒加载，首次点运行才拉取约 10MB）
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full'
let pyodidePromise = null

export function loadPyodideRuntime() {
  if (pyodidePromise) return pyodidePromise
  pyodidePromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = PYODIDE_BASE + '/pyodide.js'
    s.onload = async () => resolve(await window.loadPyodide({ indexURL: PYODIDE_BASE + '/' }))
    s.onerror = () => reject(new Error('Pyodide CDN 加载失败，检查网络后重试'))
    document.head.appendChild(s)
  })
  return pyodidePromise
}

const PKG_MAP = { numpy: 'numpy', pandas: 'pandas', matplotlib: 'matplotlib', sklearn: 'scikit-learn' }

export function detectPackages(code) {
  const pkgs = new Set()
  const re = /^\s*(?:import|from)\s+([a-zA-Z0-9_]+)/gm
  let m
  while ((m = re.exec(code))) {
    const p = PKG_MAP[m[1]]
    if (p) pkgs.add(p)
  }
  return [...pkgs]
}

// 运行后提取 matplotlib 所有图，base64 PNG 返回
const FIG_SNIPPET = `
import io, base64
import matplotlib.pyplot as plt
_imgs = []
for _n in plt.get_fignums():
    _b = io.BytesIO()
    plt.figure(_n).savefig(_b, format='png', bbox_inches='tight')
    _imgs.append(base64.b64encode(_b.getvalue()).decode())
plt.close('all')
_imgs
`
export { FIG_SNIPPET }
