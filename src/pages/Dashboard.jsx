import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db.js'
import { useStore } from '../store.js'
import WorkbenchScene from '../components/WorkbenchScene.jsx'

function fmtTime(ts) {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const MODULES = [
  { to: '/algorithms', title: '算法乐园', desc: '把经典算法变成看得见的动画和实验。', mark: '∑', tone: 'coral', featured: true },
  { to: '/playground', title: '编程实验', desc: '随时写一段 Python，在浏览器里直接运行。', mark: '{ }', tone: 'mint' },
  { to: '/notes', title: '灵感笔记', desc: '记录推导、踩坑和突然冒出来的好想法。', mark: '✎', tone: 'yellow' },
  { to: '/code', title: '代码库', desc: '整理文件与版本快照，随时找回旧思路。', mark: '</>', tone: 'blue' },
  { to: '/datasets', title: '数据集', desc: '打开 Iris、房价等经典数据集做分析。', mark: '▦', tone: 'lavender' },
  { to: '/characters', title: '学习伙伴', desc: '挑一个陪你学习的小搭档和角色方案。', mark: '◉', tone: 'peach' },
]

const CLASSIC_SNIPPETS = [
  {
    key: 'quick_sort',
    name: '快速排序',
    tag: '分治 · 排序',
    desc: '选枢轴，分左右，再递归归位。',
    code: 'def quick_sort(nums):',
  },
  {
    key: 'binary_search',
    name: '二分查找',
    tag: '查找 · O(log n)',
    desc: '每次排除一半搜索空间。',
    code: 'while left <= right:',
  },
  {
    key: 'fib_dp',
    name: '动态规划 · 爬楼梯',
    tag: 'DP · 状态转移',
    desc: '把大问题拆成可复用的小状态。',
    code: 'dp[i] = dp[i - 1] + dp[i - 2]',
  },
]

const STORY_DATASETS = [
  { name: 'Iris 鸢尾花', mark: '花', meta: '150 行 · 3 分类', desc: '入门分类与可视化' },
  { name: 'California Housing', mark: '房', meta: '约 20,640 行 · 回归', desc: '特征工程与线性回归' },
  { name: 'SMS Spam', mark: '信', meta: '5,574 条 · 文本分类', desc: '文本清洗与分类入门' },
]

const SNIPPET_SOURCE = {
  quick_sort: `import random

def quick_sort(nums):
    if len(nums) <= 1:
        return nums
    pivot = nums[len(nums) // 2]
    left = [x for x in nums if x < pivot]
    mid = [x for x in nums if x == pivot]
    right = [x for x in nums if x > pivot]
    return quick_sort(left) + mid + quick_sort(right)

data = random.sample(range(1, 21), 10)
print('输入:', data)
print('结果:', quick_sort(data))
`,
  binary_search: `def binary_search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

print(binary_search([1, 3, 5, 7, 9, 11], 7))
`,
  fib_dp: `def climb_stairs(n):
    if n <= 2:
        return n
    dp = [0] * (n + 1)
    dp[1], dp[2] = 1, 2
    for i in range(3, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]
    return dp[n]

print(climb_stairs(8))
`,
}

function formatToday() {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
}

function dateKey(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Dashboard() {
  const navigate = useNavigate()
  const scheme = useStore((s) => s.scheme)
  const fileCount = useLiveQuery(() => db.files.count(), [], 0)
  const snapTotal = useLiveQuery(() => db.snapshots.count(), [], 0)
  const noteCount = useLiveQuery(() => db.notes.count(), [], 0)
  const runCount = Number(localStorage.getItem('cv:runs') || 0)
  const recentFiles = useLiveQuery(() => db.files.orderBy('updatedAt').reverse().limit(5).toArray(), [], [])
  const recentNotes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().limit(4).toArray(), [], [])
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [timerRunning, setTimerRunning] = useState(false)
  const [answerOpen, setAnswerOpen] = useState(false)
  const [streak, setStreak] = useState(1)
  const [copiedSnippet, setCopiedSnippet] = useState('')

  const stats = [
    { label: '代码文件', value: fileCount, hint: '都在本机抽屉里', mark: '</>', tone: 'coral' },
    { label: '运行次数', value: runCount, hint: '每次试跑都算数', mark: '▶', tone: 'mint' },
    { label: '学习笔记', value: noteCount, hint: '把思考留下来', mark: '✎', tone: 'yellow' },
    { label: '代码快照', value: snapTotal, hint: '随时回到上一版', mark: '◇', tone: 'blue' },
  ]

  useEffect(() => {
    const today = dateKey(new Date())
    const lastOpen = localStorage.getItem('qv:last-open')
    const savedStreak = Number(localStorage.getItem('qv:streak') || 0)
    let next = savedStreak
    if (lastOpen !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      next = lastOpen === dateKey(yesterday) ? savedStreak + 1 : 1
      localStorage.setItem('qv:last-open', today)
      localStorage.setItem('qv:streak', String(next))
    }
    setStreak(Math.max(next, 1))
  }, [])

  useEffect(() => {
    if (!timerRunning) return undefined
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => Math.max(0, value - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [timerRunning])

  useEffect(() => {
    if (secondsLeft === 0 && timerRunning) setTimerRunning(false)
  }, [secondsLeft, timerRunning])

  const timerMinutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const timerSeconds = String(secondsLeft % 60).padStart(2, '0')
  const timerProgress = 100 - (secondsLeft / (25 * 60)) * 100

  function resetTimer() {
    setTimerRunning(false)
    setSecondsLeft(25 * 60)
  }

  function toggleTimer() {
    if (secondsLeft === 0) {
      setSecondsLeft(25 * 60)
      setTimerRunning(true)
      return
    }
    setTimerRunning((value) => !value)
  }

  async function copySnippet(snippet) {
    const text = SNIPPET_SOURCE[snippet.key]
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const area = document.createElement('textarea')
      area.value = text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    setCopiedSnippet(snippet.key)
    window.setTimeout(() => setCopiedSnippet(''), 1600)
  }

  async function openSnippet(snippet) {
    const name = snippet.key + '.py'
    let file = await db.files.where('name').equals(name).first()
    if (!file) {
      const id = await db.files.add({
        name,
        content: SNIPPET_SOURCE[snippet.key],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      file = { id }
    }
    navigate('/playground?id=' + file.id)
  }

  return (
    <div className="page dashboard-page">
      <div className="dashboard-topline">
        <span>WorkBuddy · {formatToday()}</span>
        <span className="topline-status"><i /> 智能工作台已就绪</span>
      </div>

      <section className="q-hero">
        <div className="q-hero-copy">
          <div className="hero-kicker"><span>WB</span> 从想法，到代码，再到答案</div>
          <h1>跑程序，<em>玩明白。</em></h1>
          <p>WorkBuddy 把代码实验、算法推演和灵感记录放进同一张 Q 版工作台；这里还收好经典代码与学习数据集，数据只留在本地。</p>
          <div className="hero-actions">
            <Link className="q-btn q-btn-primary" to="/algorithms">
              开始探索
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5" /></svg>
            </Link>
            <Link className="q-btn q-btn-soft" to="/playground">打开编码区</Link>
          </div>
          <div className="hero-foot">
            <span className="streak-pill"><b>{streak}</b> 天连续学习</span>
            <span className="hero-note">今天先完成一个小实验</span>
          </div>
        </div>
        <div className="q-hero-art">
          <WorkbenchScene />
        </div>
      </section>

      <section className="q-stat-grid" aria-label="学习数据">
        {stats.map((item) => (
          <div key={item.label} className={`q-stat stat-${item.tone}`}>
            <span className="stat-mark" aria-hidden="true">{item.mark}</span>
            <div>
              <div className="stat-value">{item.value}</div>
              <div className="stat-label">{item.label}</div>
              <div className="stat-hint">{item.hint}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="q-dashboard-grid">
        <section className="q-workbench-panel">
          <div className="q-section-head">
            <div>
              <span className="section-kicker">WORKSPACE</span>
              <h2>打开一个工作区</h2>
            </div>
            <span className="section-count">6 个入口</span>
          </div>
          <div className="q-module-grid">
            {MODULES.map((item) => (
              <Link key={item.to} to={item.to} className={`q-module tone-${item.tone}${item.featured ? ' featured' : ''}`}>
                <span className="module-mark" aria-hidden="true">{item.mark}</span>
                <span className="module-copy">
                  <strong>{item.title}</strong>
                  <small>{item.desc}</small>
                </span>
                <span className="module-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="q-side-stack">
          <section className="focus-card">
            <div className="focus-head">
              <div>
                <span className="section-kicker">FOCUS</span>
                <h3>专注一小会</h3>
              </div>
              <span className="focus-sun" aria-hidden="true" />
            </div>
            <div className="timer-display" aria-live="polite">{timerMinutes}<span>:</span>{timerSeconds}</div>
            <div className="timer-track"><span style={{ width: `${timerProgress}%` }} /></div>
            <div className="timer-actions">
              <button className="q-btn q-btn-primary compact" onClick={toggleTimer}>
                {timerRunning ? '暂停' : secondsLeft === 0 ? '再来一轮' : '开始专注'}
              </button>
              <button className="icon-btn" onClick={resetTimer} aria-label="重置计时器">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 7a7 7 0 1 1-1 7M4 3v4h4" /></svg>
              </button>
            </div>
          </section>

          <section className="daily-card">
            <div className="daily-head">
              <span className="daily-badge">今日小题</span>
              <span className="daily-level">热身</span>
            </div>
            <p>如果 <b>f(x)=2x+1</b>，那么 <b>f(3)</b> 是多少？</p>
            {answerOpen ? (
              <div className="answer-reveal">
                <span>答案</span>
                <strong>7</strong>
                <button onClick={() => setAnswerOpen(false)}>收起</button>
              </div>
            ) : (
              <button className="answer-btn" onClick={() => setAnswerOpen(true)}>想一想，再看答案 <span>→</span></button>
            )}
          </section>

          <section className="buddy-note">
            <span className="buddy-avatar" aria-hidden="true">
              <i />
              <i />
            </span>
            <div>
              <small>来自 {scheme.name}</small>
              <p>别急着追求完美，先让代码跑起来。</p>
            </div>
          </section>
        </aside>
      </div>

      <section className="library-strip" aria-label="经典代码与学习数据集">
        <section className="library-column classic-library">
          <div className="library-head">
            <div>
              <span className="section-kicker">CODE LIBRARY</span>
              <h2>经典代码速取</h2>
            </div>
            <Link to="/algorithms">全部算法 →</Link>
          </div>
          <div className="classic-list">
            {CLASSIC_SNIPPETS.map((snippet) => (
              <article className="classic-item" key={snippet.key}>
                <div className="classic-copy">
                  <div className="classic-title-row">
                    <h3>{snippet.name}</h3>
                    <span>{snippet.tag}</span>
                  </div>
                  <p>{snippet.desc}</p>
                  <code>{snippet.code}</code>
                </div>
                <div className="classic-actions">
                  <button className="mini-action" onClick={() => copySnippet(snippet)}>
                    {copiedSnippet === snippet.key ? '已复制' : '复制'}
                  </button>
                  <button className="mini-action run" onClick={() => openSnippet(snippet)}>运行</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="library-column dataset-library">
          <div className="library-head">
            <div>
              <span className="section-kicker">DATA LIBRARY</span>
              <h2>学习数据集</h2>
            </div>
            <Link to="/datasets">数据集仓库 →</Link>
          </div>
          <div className="story-dataset-list">
            {STORY_DATASETS.map((dataset) => (
              <Link className="story-dataset" to="/datasets" key={dataset.name}>
                <span className="story-dataset-mark">{dataset.mark}</span>
                <span>
                  <strong>{dataset.name}</strong>
                  <small>{dataset.meta}</small>
                  <em>{dataset.desc}</em>
                </span>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
          <p className="dataset-footnote">导入后自动生成分析模板，可在浏览器内运行 Python。</p>
        </section>
      </section>

      <div className="q-recent-grid">
        <section className="q-recent-panel">
          <div className="recent-heading">
            <h3>最近代码</h3>
            <Link to="/code">全部查看</Link>
          </div>
          {recentFiles.length === 0 && (
            <Link className="recent-empty-action" to="/code">
              <span>+</span>
              从新建第一个代码文件开始
            </Link>
          )}
          {recentFiles.map((file) => (
            <Link key={file.id} className="q-recent-row mono" to={'/playground?id=' + file.id}>
              <span className="file-dot" />
              <span>{file.name}</span>
              <time>{fmtTime(file.updatedAt)}</time>
            </Link>
          ))}
        </section>
        <section className="q-recent-panel note-panel">
          <div className="recent-heading">
            <h3>最近便签</h3>
            <Link to="/notes">全部查看</Link>
          </div>
          {recentNotes.length === 0 && (
            <Link className="recent-empty-action" to="/notes">
              <span>+</span>
              记下今天的第一个想法
            </Link>
          )}
          {recentNotes.map((note) => (
            <Link key={note.id} className="q-recent-row" to={'/notes?id=' + note.id}>
              <span className="note-dot" />
              <span>{note.title || '未命名便签'}</span>
              <time>{fmtTime(note.updatedAt)}</time>
            </Link>
          ))}
        </section>
      </div>
      <div className="q-page-footer">
        <span>WorkBuddy · Q版数学工作台</span>
        <span>数据保存在你的浏览器里</span>
      </div>
    </div>
  )
}
