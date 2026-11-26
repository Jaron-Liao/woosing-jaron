import { create } from 'zustand'
import { SCHEMES } from './data/schemes.js'

const LS_ANIMALS = 'cv:animals'
const LS_SCHEME = 'cv:scheme'
const LS_SIDEBAR = 'cv:sidebar'
const LS_AGENT = 'cv:agent'
const LS_MASCOT = 'cv:mascot'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* storage unavailable */ }
}

// 预置角色池：设计方案 v1.0 已定 20 个
const DEFAULT_ANIMALS = [1, 11, 21, 23, 27, 31, 41, 42, 51, 54, 61, 62, 71, 73, 77, 79, 86, 89, 93, 96]

export const useStore = create((set, get) => ({
  // ---- 账号 ----
  session: null,
  setSession(v) { set({ session: v }) },

  // ---- 角色 ----
  scheme: SCHEMES.find((s) => s.id === loadJSON(LS_SCHEME, 2)) || SCHEMES[1],
  pickedAnimals: loadJSON(LS_ANIMALS, DEFAULT_ANIMALS),
  // 伙伴页当前预览/选中的角色（点击卡片后待应用）
  candidate: null,
  // 已应用的角色 id（scheme.id）
  appliedId: loadJSON(LS_SCHEME, 2),

  pickAnimal(id) {
    const cur = get().pickedAnimals
    if (cur.includes(id)) set({ pickedAnimals: cur.filter((x) => x !== id) })
    else if (cur.length < 20) set({ pickedAnimals: [...cur, id] })
  },
  saveAnimals() {
    save(LS_ANIMALS, get().pickedAnimals)
    return get().pickedAnimals.length
  },
  resetAnimals() { set({ pickedAnimals: [] }) },

  // 点击角色卡片：设为候选，等待应用/取消
  selectCandidate(id) { set({ candidate: id }) },
  clearCandidate() { set({ candidate: null }) },
  // 应用：正式切换伙伴（同时更新侧栏当前伙伴）
  applyCandidate() {
    const id = get().candidate
    if (!id) return false
    const s = SCHEMES.find((x) => x.id === id)
    if (!s) return false
    save(LS_SCHEME, id)
    set({ scheme: s, appliedId: id, candidate: null, agentOpen: false })
    return true
  },
  // 兼容旧接口
  setScheme(id) {
    const s = SCHEMES.find((x) => x.id === id)
    if (s) { save(LS_SCHEME, id); set({ scheme: s, appliedId: id }) }
  },

  // ---- 侧栏 ----
  sidebarCollapsed: loadJSON(LS_SIDEBAR, false),
  toggleSidebar() {
    const v = !get().sidebarCollapsed
    save(LS_SIDEBAR, v)
    set({ sidebarCollapsed: v })
  },

  // ---- Agent 对接栏 ----
  agentOpen: loadJSON(LS_AGENT, false),
  setAgentOpen(v) { save(LS_AGENT, v); set({ agentOpen: v }) },
  lastAiAt: 0,
  touchAi() { set({ lastAiAt: Date.now() }) },

  // ---- 可移动角色位置 ----
  mascotPos: loadJSON(LS_MASCOT, { x: 24, y: 24 }),
  setMascotPos(pos) { save(LS_MASCOT, pos); set({ mascotPos: pos }) },
}))
