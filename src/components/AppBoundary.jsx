import { Component, useEffect, useState } from 'react'
import { onOffline } from '../api.js'

/** 离线提示条：由 api.js 的 onOffline 驱动，4 秒自动消失 */
function OfflineToast() {
  const [msg, setMsg] = useState('')
  useEffect(() => {
    let timer
    onOffline((text) => {
      setMsg(text)
      clearTimeout(timer)
      timer = setTimeout(() => setMsg(''), 4000)
    })
    return () => clearTimeout(timer)
  }, [])
  if (!msg) return null
  return <div className="offline-toast" role="status">{msg}</div>
}

/** 渲染错误兜底：防止单个组件异常导致整页白屏（历史上被 R3F 坑过） */
export class AppBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) {
    // 结构化输出，便于定位；不打印用户数据
    console.error(JSON.stringify({
      level: 'error', msg: 'render_error',
      message: error?.message, component: info?.componentStack?.split('\n')[1]?.trim(),
    }))
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-crash">
          <div className="app-crash-card">
            <h2>页面出了点问题</h2>
            <p className="muted">已经安全拦下这次错误，不会影响到你本地的代码、笔记和数据。</p>
            <pre>{String(this.state.error?.message || '未知错误')}</pre>
            <button className="btn primary" onClick={() => location.reload()}>重新加载</button>
          </div>
        </div>
      )
    }
    return <>{this.props.children}<OfflineToast /></>
  }
}
