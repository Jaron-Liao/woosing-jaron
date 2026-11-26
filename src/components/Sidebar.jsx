import { useState } from 'react'
import { useStore } from '../store.js'
import { Link, NavLink } from 'react-router-dom'
import workbuddyLogo from '../assets/workbuddy-logo.svg'
import { cloud } from '../cloud.js'

const icons = {
  home: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9 21v-6h6v6" /></svg>),
  folder: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>),
  play: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" fill="currentColor" stroke="none" /></svg>),
  pen: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>),
  algo: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 4H6l6 8-6 8h12" /></svg>),
  grid: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>),
  char: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>),
  gallery: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>),
  menu: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>),
  collapse: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m14 6-6 6 6 6" /><path d="M20 4v16" /></svg>),
  expand: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m10 6 6 6-6 6" /><path d="M4 4v16" /></svg>),
  chat: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-8 8H7l-4 3V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z" /></svg>),
  user: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>),
}

const NAV = [
  { to: '/', label: '工作台', icon: icons.home, end: true },
  { to: '/code', label: '代码库', icon: icons.folder },
  { to: '/playground', label: '编程实验', icon: icons.play },
  { to: '/notes', label: '灵感笔记', icon: icons.pen },
  { to: '/algorithms', label: '算法乐园', icon: icons.algo },
  { to: '/datasets', label: '数据集', icon: icons.grid },
]

export default function Sidebar() {
  const scheme = useStore((s) => s.scheme)
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useStore((s) => s.toggleSidebar)
  const setAgentOpen = useStore((s) => s.setAgentOpen)
  const agentOpen = useStore((s) => s.agentOpen)
  const session = useStore((s) => s.session)
  const setSession = useStore((s) => s.setSession)
  // 手机端：侧栏变为抽屉，底部 Tab 提供常用入口
  const [mobileOpen, setMobileOpen] = useState(false)
  const closeMobile = () => setMobileOpen(false)

  return (
    <>
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '') + (mobileOpen ? ' mobile-open' : '')}>
      <div className="side-top">
        <Link className="logo" to="/" title={collapsed ? 'WorkBuddy 数学工作台' : undefined}>
          <span className="logo-mark workbuddy-mark"><img src={workbuddyLogo} alt="" /></span>
          {(!collapsed || mobileOpen) && (
            <span className="logo-copy">
              <span className="logo-text">WorkBuddy</span>
              <span className="logo-caption">数学工作台</span>
            </span>
          )}
        </Link>
        <button className="side-toggle" onClick={toggleSidebar} title={collapsed ? '展开侧栏' : '收起侧栏'} aria-label={collapsed ? '展开侧栏' : '收起侧栏'}>
          {collapsed ? icons.expand : icons.collapse}
        </button>
      </div>

      <nav aria-label="工作台导航">
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} title={collapsed ? item.label : undefined}
            onClick={closeMobile}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
            <span className="nav-icon">{item.icon}</span>
            {(!collapsed || mobileOpen) && <span className="nav-label">{item.label}</span>}
          </NavLink>
        ))}
        {/* 学习伙伴：独立页面入口 */}
        <NavLink to="/characters" title={collapsed ? '学习伙伴' : undefined} onClick={closeMobile}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <span className="nav-icon">{icons.char}</span>
          {(!collapsed || mobileOpen) && <span className="nav-label">学习伙伴</span>}
        </NavLink>
        <NavLink to="/gallery" title={collapsed ? '角色三视图' : undefined} onClick={closeMobile}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <span className="nav-icon">{icons.gallery}</span>
          {(!collapsed || mobileOpen) && <span className="nav-label">角色三视图</span>}
        </NavLink>
        <NavLink to="/account" title={collapsed ? '个人账号' : undefined} onClick={closeMobile}
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}>
          <span className="nav-icon">{icons.user}</span>
          {(!collapsed || mobileOpen) && <span className="nav-label">个人账号</span>}
        </NavLink>
      </nav>

      <div className="side-footer">
        <button className="side-buddy" onClick={() => { setAgentOpen(!agentOpen); closeMobile() }} title="点击召唤伙伴 / 打开 Agent 对话">
          <span className="side-buddy-face" style={{ background: scheme.color }} aria-hidden="true">
            {scheme.avatar ? <img src={scheme.avatar} alt="" /> : <><i /><i /></>}
          </span>
          {(!collapsed || mobileOpen) && (
            <span className="side-buddy-copy">
              <small>当前伙伴 · 点击对话</small>
              <strong>{scheme.name}</strong>
            </span>
          )}
          {(!collapsed || mobileOpen) && <span className="side-chat-icon">{icons.chat}</span>}
        </button>
        {(!collapsed || mobileOpen) && (
          <div className="side-account">
            <span className="side-note"><span /> {session?.user?.name || session?.user?.phone || '云端账号'}</span>
            <button className="side-logout" onClick={async () => {
              await cloud.auth.signOut()
              setSession(null)
            }}>退出</button>
          </div>
        )}
      </div>
    </aside>

    {mobileOpen && <div className="mobile-drawer-mask" onClick={closeMobile} aria-hidden="true" />}
    <nav className="mobile-tabbar" aria-label="手机端导航">
      {NAV.slice(0, 4).map((item) => (
        <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobile}
          className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </NavLink>
      ))}
      <button type="button" className={'mobile-tab' + (mobileOpen ? ' active' : '')}
        onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen} aria-label="更多功能">
        <span className="nav-icon">{icons.menu}</span>
        <span className="nav-label">更多</span>
      </button>
    </nav>
    </>
  )
}
