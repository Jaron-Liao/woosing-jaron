import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db.js'
import irisCsv from '../data/iris.csv?raw'

// embedded=true：CSV 已内嵌，导入时直接在代码存储区建仓，Pyodide 运行时可 read_csv
const SETS = [
  {
    key: 'iris', name: 'Iris 鸢尾花', rows: '150', task: '入门分类', embedded: true, csv: irisCsv, csvName: 'iris.csv',
    cols: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
    desc: 'UCI 经典三分类数据集，150 行全量内嵌。',
    learn: '描述统计、分组均值、散点图与分类入门',
    template: `import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('iris.csv')
print(df.head())
print(df.describe())

# 按品种看均值
print(df.groupby('species').mean())

# 花萼长 vs 花瓣长，按品种着色
codes = df['species'].astype('category').cat.codes
df.plot.scatter(x='sepal_length', y='petal_length', c=codes, colormap='viridis')
plt.show()
`,
  },
  {
    key: 'california', name: '加州房价 California Housing', rows: '~20,640', task: '回归', embedded: false,
    cols: ['longitude', 'latitude', 'housing_median_age', 'total_rooms', 'median_house_value'],
    desc: '完整 CSV 体积大未内嵌，Pyodide 内可联网用 sklearn 直接拉取。',
    learn: '特征工程、标准化、线性回归与误差评估',
    template: `from sklearn.datasets import fetch_california_housing
import pandas as pd

# 需联网；失败则本地下载 CSV 后在代码存储区建 california.csv 再 read_csv
data = fetch_california_housing(as_frame=True)
df = data.frame
print(df.head())
print(df.describe())
`,
  },
  {
    key: 'spam', name: '垃圾邮件分类 SMS Spam', rows: '~5,574', task: '文本分类', embedded: false,
    cols: ['label (ham/spam)', 'message'],
    desc: 'UCI 文本分类数据集，导入后给出读取模板。',
    learn: '文本清洗、词频特征与朴素贝叶斯分类',
    template: `import pandas as pd

# 下载 SMSSpamCollection 后在代码存储区建 spam.csv
# df = pd.read_csv('spam.csv', sep='\\t', names=['label', 'message'])
# print(df['label'].value_counts())
print('把 spam.csv 放入代码存储区后取消注释上面的代码')
`,
  },
  {
    key: 'mnist', name: '手写数字 MNIST 子集', rows: '1,000 张(P3)', task: '图像分类', embedded: false,
    cols: ['28x28 灰度图'],
    desc: '完整版 50MB+ 不内嵌。交互式识别演示在算法区开发（P3）。',
    learn: '像素矩阵、降维、可视化与卷积神经网络',
    template: `# P3 将在算法区上线 MNIST 交互相册
print('MNIST 交互演示开发中，见算法区')
`,
  },
]

const TASK_FILTERS = ['全部', '分类', '回归', '文本', '图像']

export default function Datasets() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [task, setTask] = useState('全部')
  const [copied, setCopied] = useState('')

  async function ensureFile(name, content) {
    const exists = await db.files.where('name').equals(name).first()
    if (!exists) {
      await db.files.add({ name, content, createdAt: Date.now(), updatedAt: Date.now() })
    }
  }

  async function importDataset(s) {
    if (s.embedded) await ensureFile(s.csvName, s.csv)
    await ensureFile(s.key + '_analysis.py', s.template)
    const pyFile = await db.files.where('name').equals(s.key + '_analysis.py').first()
    navigate('/playground?id=' + pyFile.id)
  }

  function download(s) {
    const blob = new Blob([s.csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = s.csvName
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function copyTemplate(s) {
    try {
      await navigator.clipboard.writeText(s.template)
    } catch {
      const area = document.createElement('textarea')
      area.value = s.template
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopied(s.key)
    window.setTimeout(() => setCopied(''), 1600)
  }

  const filteredSets = SETS.filter((set) => {
    const text = [set.name, set.task, set.desc, ...set.cols].join(' ').toLowerCase()
    return text.includes(query.trim().toLowerCase()) && (task === '全部' || set.task.includes(task))
  })

  return (
    <div className="page">
      <header className="page-head">
        <h1>数据集仓库</h1>
        <p className="muted">从经典数据开始练习：搜索、筛选、复制分析模板，或一键导入编程实验，自动生成 CSV 读取与建模代码。</p>
      </header>
      <div className="library-tools">
        <input
          className="text-input library-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索 Iris、房价、文本分类…"
          aria-label="搜索数据集"
        />
        <div className="chip-row" style={{ margin: 0 }}>
          {TASK_FILTERS.map((item) => (
            <button
              key={item}
              className={task === item ? 'chip btn-chip active' : 'chip btn-chip'}
              onClick={() => setTask(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <span className="library-result-count">{filteredSets.length} 个数据集</span>
      </div>

      {filteredSets.length === 0 && (
        <div className="empty-panel"><p>没有找到匹配的数据集，试试别的任务类型。</p></div>
      )}

      <div className="card-grid two">
        {filteredSets.map((s) => (
          <div key={s.key} className="card static dataset-card">
            <div className="ds-head">
              <h3>{s.name}</h3>
              <div className="dataset-badges">
                <span className="chip">{s.task}</span>
                <span className={s.embedded ? 'dataset-state ready' : 'dataset-state'}>{s.embedded ? '可直接运行' : '需联网/导入'}</span>
              </div>
            </div>
            <p className="muted">{s.rows} 行 · {s.cols.join(' / ')}</p>
            <p className="muted">{s.desc}</p>
            <div className="dataset-learning">
              <span>练习重点</span>
              <p>{s.learn}</p>
            </div>
            {s.embedded && (
              <table className="mini-table">
                <thead><tr>{s.cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {s.csv.trim().split('\n').slice(1, 6).map((line, i) => {
                    const cells = line.split(',')
                    return <tr key={i}>{cells.map((c, j) => <td key={j}>{c}</td>)}</tr>
                  })}
                </tbody>
              </table>
            )}
            <div className="ds-actions">
              <button className="btn primary sm" onClick={() => importDataset(s)}>
                {s.embedded ? '导入并运行' : '生成分析模板'}
              </button>
              <button className="btn sm" onClick={() => copyTemplate(s)}>
                {copied === s.key ? '模板已复制' : '复制模板'}
              </button>
              {s.embedded && <button className="btn sm" onClick={() => download(s)}>下载 CSV</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
