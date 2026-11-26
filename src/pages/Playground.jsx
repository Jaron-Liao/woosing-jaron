import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, langOf, loadPyodideRuntime, detectPackages, FIG_SNIPPET } from '../db.js'

function bumpRunCount() {
  const n = Number(localStorage.getItem('cv:runs') || 0) + 1
  localStorage.setItem('cv:runs', String(n))
}

function withoutKnownPandasNotice(message) {
  const text = String(message || '')
  const isPandasArrowMigrationNotice =
    /DeprecationWarning/i.test(text) &&
    /(?:Pyarrow|pyarrow) will become a required dependency/i.test(text) &&
    /pandas 3\.0|pandas-dev\/pandas\/issues\/54466/i.test(text)

  return isPandasArrowMigrationNotice ? '' : text
}

export default function Playground() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const id = Number(params.get('id')) || null
  const files = useLiveQuery(() => db.files.toArray(), [])
  const notes = useLiveQuery(() => db.notes.toArray(), [])
  const file = (files || []).find((f) => f.id === id) || null

  const [content, setContent] = useState('')
  const [saveState, setSaveState] = useState('saved') // saved | saving
  const [runState, setRunState] = useState('idle') // idle | loading-py | running | done
  const [output, setOutput] = useState([])
  const [images, setImages] = useState([])
  const saveTimer = useRef(null)

  useEffect(() => {
    setContent(file ? file.content : '')
    setOutput([])
    setImages([])
    setSaveState('saved')
  }, [id, file?.updatedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  function onEdit(value) {
    setContent(value)
    setSaveState('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (id) {
        await db.files.update(id, { content: value, updatedAt: Date.now() })
        setSaveState('saved')
      }
    }, 2000)
  }

  async function run() {
    const info = langOf(file?.name || '')
    if (info.ext === 'csv') {
      setOutput([{ t: 'err', s: 'CSV 是数据文件，不能直接运行。在 Python 里用 pd.read_csv("' + file.name + '") 读取。' }])
      return
    }
    if (info.ext !== 'py') {
      setOutput([{ t: 'err', s: 'C / C++ 在线运行评估中（方案 8.3），当前请在本地编译运行。Python 文件可直接执行。' }])
      return
    }
    setRunState('loading-py')
    setOutput([])
    setImages([])
    try {
      const py = await loadPyodideRuntime()
      py.setStdout({ batched: (s) => setOutput((o) => [...o, { t: 'out', s }]) })
      py.setStderr({
        batched: (s) => {
          const visibleMessage = withoutKnownPandasNotice(s)
          if (visibleMessage) setOutput((o) => [...o, { t: 'err', s: visibleMessage }])
        },
      })
      // pandas 3.0 的 PyArrow 迁移提示不影响当前运行，也不应该伪装成红色错误。
      py.runPython(`
import warnings
warnings.filterwarnings(
    'ignore',
    category=DeprecationWarning,
    message=r'.*(?:Pyarrow|pyarrow) will become a required dependency.*',
)
`)
      // 把代码存储区里的所有 CSV 写进 Pyodide 虚拟文件系统，pd.read_csv 直接可用
      const csvFiles = (files || []).filter((f) => f.name.endsWith('.csv'))
      for (const cf of csvFiles) {
        py.FS.writeFile('/home/pyodide/' + cf.name, cf.content)
      }
      if (csvFiles.length) {
        setOutput((o) => [...o, { t: 'sys', s: '已挂载 ' + csvFiles.length + ' 个 CSV 到运行环境：' + csvFiles.map((f) => f.name).join(', ') }])
      }
      const pkgs = detectPackages(content)
      if (pkgs.length > 0) {
        setOutput((o) => [...o, { t: 'sys', s: '加载包：' + pkgs.join(', ') + ' ...' }])
        await py.loadPackage(pkgs)
      }
      setRunState('running')
      await py.runPythonAsync(content)
      const figs = py.runPython(FIG_SNIPPET)
      if (figs && figs.length) setImages(figs.toJs ? figs.toJs({ depth: 1 }) : Array.from(figs))
      bumpRunCount()
    } catch (e) {
      setOutput((o) => [...o, { t: 'err', s: String(e.message || e) }])
    }
    setRunState('done')
  }

  function downloadFile() {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // 关联笔记：正文里 [[文件名]] 引用了当前文件
  const relatedNotes = file
    ? (notes || []).filter((n) => n.body.includes('[[' + file.name + ']]'))
    : []

  async function createRelatedNote() {
    const body = '# 关于 ' + file.name + '\n\n[[' + file.name + ']]\n\n'
    const nid = await db.notes.add({
      title: '关于 ' + file.name,
      body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    navigate('/notes?id=' + nid)
  }

  if (!file) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>编程实验</h1>
          <p className="muted">选择一个文件打开，或从经典算法模板开始。Python 会直接在浏览器内运行，数据不会上传。</p>
        </header>
        <div className="card-grid two">
          {(files || []).map((f) => (
            <Link key={f.id} className="card" to={'/playground?id=' + f.id}>
              <h3 className="mono">{f.name}</h3>
              <p className="muted">{langOf(f.name).lang}</p>
              <span className="card-go">打开 →</span>
            </Link>
          ))}
        </div>
        {(files || []).length === 0 && (
          <div className="empty-panel">
            <p>还没有可运行文件。<Link to="/algorithms">从经典算法开始</Link> 或 <Link to="/code">去代码库新建</Link>。</p>
          </div>
        )}
      </div>
    )
  }

  const info = langOf(file.name)

  return (
    <div className="page wide">
      <header className="page-head row">
        <div>
          <h1 className="mono">{file.name}</h1>
          <p className="muted">
            {info.lang} · {saveState === 'saving' ? '保存中…' : '已自动保存'} ·{' '}
            {runState === 'loading-py' ? '正在加载 Python 运行时（首次约 10MB）…' : runState === 'running' ? '运行中…' : ''}
          </p>
        </div>
        <span className="spacer" />
        <button className="btn" onClick={downloadFile}>下载文件</button>
        <button className="btn" onClick={() => { setOutput([]); setImages([]) }}>清空输出</button>
        <button className="btn primary" disabled={runState === 'running' || runState === 'loading-py'} onClick={run}>
          {info.ext === 'py' ? '▶ 运行' : '▶ 运行（仅 Python）'}
        </button>
      </header>

      <div className="editor-wrap">
        <Editor
          height="52vh"
          language={info.monaco}
          value={content}
          theme="vs-dark"
          onChange={onEdit}
          options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false, automaticLayout: true }}
        />
      </div>

      <div className="terminal">
        <div className="term-head">终端输出</div>
        {output.length === 0 && images.length === 0 && <div className="term-line muted">（空）点击「运行」执行代码。</div>}
        {output.map((l, i) => (
          <div key={i} className={'term-line ' + l.t}>{l.s}</div>
        ))}
        {images.map((b64, i) => (
          <img key={i} className="term-img" src={'data:image/png;base64,' + b64} alt={'figure-' + i} />
        ))}
      </div>

      <div className="related-panel">
        <h3>关联笔记（引用 [[{file.name}]] 的）</h3>
        {relatedNotes.length === 0 && <div className="recent-empty">还没有笔记引用这个文件。</div>}
        {relatedNotes.map((n) => (
          <div key={n.id} className="related-row">
            <Link to={'/notes?id=' + n.id}>{n.title || '未命名'}</Link>
          </div>
        ))}
        <div className="related-row">
          <button className="btn sm" onClick={createRelatedNote}>+ 新建关联笔记</button>
        </div>
      </div>
    </div>
  )
}
