import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  Home,
  Briefcase,
  LayoutDashboard,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react'

// ─── Menu items config ────────────────────────────────────────────────────────
export const menuItems = [
  { text: 'Home', path: '/', icon: Home, roles: ['admin', 'hr', 'staff'] },
  { text: 'Task Board', path: '/tasks', icon: Briefcase, roles: ['admin', 'hr', 'staff'] },
  { text: 'Workflow Board', path: '/kanban', icon: LayoutDashboard, roles: ['admin', 'hr', 'staff'] },
  { text: 'Pending', path: '/pending', icon: Clock, roles: ['admin', 'hr', 'staff'] },
  { text: 'Completed', path: '/complete', icon: CheckCircle, roles: ['admin', 'hr', 'staff'] },
  { text: 'Performance', path: '/performance', icon: TrendingUp, roles: ['admin', 'hr', 'staff'] },
  { text: 'Staff Directory', path: '/staff', icon: Users, roles: ['admin', 'hr'] },
  { text: 'Settings', path: '/profile', icon: Settings, roles: ['admin', 'hr', 'staff'] },
]

// ─── Stagger delays ───────────────────────────────────────────────────────────
const STAGGER = ['stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8']

const Sidebar = ({ user, tasks = [], isOpen = true, closeSidebar, toggleSidebar }) => {
  const isAdmin = user?.role === 'admin'
  const isHR = user?.role === 'hr'
  const username = user?.name || 'Guest'
  const initial = username.charAt(0).toUpperCase()
  const roleLabel = user ? (isAdmin ? 'Admin' : isHR ? 'HR Manager' : 'Associate') : 'Unauthenticated'

  const avatarGradient = isAdmin
    ? 'from-indigo-500 to-purple-600'
    : isHR
      ? 'from-cyan-500 to-blue-600'
      : 'from-emerald-500 to-teal-600'

  const visibleItems = useMemo(
    () => menuItems.filter(item => item.roles.includes(user?.role || 'staff')),
    [user?.role]
  )

  const { pct, barColor } = useMemo(() => {
    const total = tasks?.length || 0
    const done = tasks?.filter(t => t?.status === 'completed' || t?.completed === true).length || 0
    const p = total > 0 ? Math.round((done / total) * 100) : 0
    const color = p >= 80 ? 'from-emerald-400 to-teal-500' : p >= 50 ? 'from-amber-400 to-orange-500' : 'from-rose-400 to-red-500'
    return { pct: p, barColor: color }
  }, [tasks])

  const pctTextColor = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400'

  // ─── Collapsed sidebar (thin strip with expand button) ──────────────────────
  if (!isOpen) {
    return (
      <div className="fixed top-0 left-0 h-screen w-12 z-40 pt-[68px] flex flex-col items-center bg-slate-900/80 backdrop-blur-xl border-r border-white/5">
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="mt-3 w-8 h-8 rounded-lg bg-white/5 hover:bg-cyan-500/20 flex items-center justify-center text-slate-500 hover:text-cyan-400 transition-all duration-200"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  // ─── Full open sidebar ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col fixed top-0 left-0 h-screen w-64 glass-morphism transition-all duration-300 z-40 pt-[68px] translate-x-0">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-3xl -z-10" />
      <div className="sidebar-glow" />

      {/* ── Profile card ─────────────────────────────────────────────────────── */}
      <div className="px-3 mb-3 shrink-0">
        <NavLink
          to={user ? "/profile" : "/login"}
          onClick={() => closeSidebar?.()}
          className={({ isActive }) =>
            `relative flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-300 group !no-underline overflow-hidden ${isActive ? 'bg-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]' : 'hover:bg-white/5'
            }`
          }
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <div className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-base shadow-lg bg-gradient-to-br ${avatarGradient} shrink-0 transition-transform duration-700 group-hover:rotate-[360deg]`}>
            {initial}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse-glow" />
          </div>

          <div className="flex-1 min-w-0 z-10">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-sm font-bold text-white truncate group-hover:text-cyan-400 transition-colors">
                {username}
              </span>
              {user && <Settings className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:rotate-90 transition-all duration-500 shrink-0" />}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
              {roleLabel}
            </span>
          </div>
        </NavLink>
      </div>

      {/* ── Efficiency tracker ───────────────────────────────────────────────── */}
      <div className="px-6 pb-4 shrink-0 border-b border-white/5 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Efficiency</span>
          <span className={`text-[10px] font-bold ${pctTextColor} animate-pulse-glow`}>{pct}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="flex-1 px-3 overflow-hidden no-scrollbar">
        <nav>
          <ul className="space-y-1">
            {visibleItems.map(({ text, path, icon: Icon }, idx) => (
              <li key={path} className={`animate-menu-item ${STAGGER[idx] ?? ''}`}>
                <NavLink
                  to={path}
                  onClick={() => closeSidebar?.()}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 border-l-4 overflow-hidden ${isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-transparent text-cyan-400 border-cyan-500 font-bold shadow-[0_0_20px_rgba(6,182,212,0.1)]'
                      : 'text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-100 hover:translate-x-1'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

                      <Icon
                        size={18}
                        className={`shrink-0 transition-all duration-300 ${isActive ? 'scale-110 text-cyan-300 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'group-hover:scale-110 group-hover:rotate-6 group-hover:text-cyan-300'
                          }`}
                      />
                      <span className="text-sm font-medium truncate relative z-10">
                        {text}
                      </span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* ── Footer with collapse button ─────────────────────────────────────── */}
      <div className="p-3 border-t border-white/5 shrink-0 mt-auto">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] hover:text-cyan-500 transition-colors cursor-default">
            QUBIC
          </span>
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-500 hover:text-cyan-400 transition-all duration-200"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
