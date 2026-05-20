import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, AreaChart, Area, ComposedChart, Line,
  PieChart, Pie, Legend
} from 'recharts';
import {
  Activity, Users, CheckCircle, Clock, Rocket,
  Target, Zap, ArrowRight, Shield, Globe, X, TrendingUp
} from 'lucide-react';
import { format, subDays, isSameDay } from 'date-fns';

// ─── Stat Detail Modal ─────────────────────────────────────────────────────────
const StatModal = ({ stat, onClose }) => {
  const Icon = stat.icon;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-${stat.color}-500/10 to-transparent`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 bg-${stat.color}-500/20 rounded-lg`}>
              <Icon className={`w-6 h-6 text-${stat.color}-400`} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{stat.label} Breakdown</h3>
              <p className="text-xs text-slate-400">Detailed organizational metrics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="text-center py-4">
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Current Status</p>
            <p className={`text-5xl font-black text-${stat.color}-400`}>{stat.value}</p>
          </div>
          <div className="space-y-2">
            {stat.details.map((det, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <span className="text-sm text-slate-400">{det.label}</span>
                <span className="text-sm font-bold text-white">{det.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-300 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const Home = () => {
  const { tasks = [], users = [], userRole, currentUser } = useOutletContext();
  const navigate = useNavigate();
  const [selectedStat, setSelectedStat] = useState(null);
  const [showTaskStats, setShowTaskStats] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setShowLoginPrompt(false);
      return;
    }
    const timer = setInterval(() => {
      setShowLoginPrompt(true);
    }, 60000); // 1 minute
    return () => clearInterval(timer);
  }, [currentUser]);

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const globalStats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status?.toLowerCase() === 'completed' || t.completed === true).length;
    const inProgress = tasks.filter(t => t.status?.toLowerCase() === 'in-progress').length;
    const unclaimed = tasks.filter(t => t.status?.toLowerCase() === 'unclaimed').length;
    const totalPts = users.reduce((s, u) => s + (u.points || 0), 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return [
      {
        label: 'Total Tasks', value: total, icon: Rocket, color: 'cyan', delay: 'delay-1',
        details: [
          { label: 'High Priority', value: tasks.filter(t => t.priority?.toLowerCase() === 'high').length },
          { label: 'Medium Priority', value: tasks.filter(t => t.priority?.toLowerCase() === 'medium').length },
          { label: 'Low Priority', value: tasks.filter(t => t.priority?.toLowerCase() === 'low').length },
        ]
      },
      {
        label: 'Staff Members', value: users.length, icon: Users, color: 'indigo', delay: 'delay-2',
        details: [
          { label: 'HR Managers', value: users.filter(u => u.role?.toLowerCase() === 'hr').length },
          { label: 'Associates', value: users.filter(u => u.role?.toLowerCase() === 'staff').length },
          { label: 'Approved Accounts', value: users.filter(u => u.isApproved).length },
        ]
      },
      {
        label: 'Completed', value: completed, icon: CheckCircle, color: 'emerald', delay: 'delay-3',
        details: [
          { label: 'Completion Rate', value: `${pct}%` },
          { label: 'Total Points Awarded', value: totalPts },
          { label: 'Avg Points / User', value: users.length > 0 ? Math.round(totalPts / users.length) : 0 },
        ]
      },
      {
        label: 'Active Workflow', value: inProgress + unclaimed, icon: Activity, color: 'orange', delay: 'delay-4',
        details: [
          { label: 'In Progress', value: inProgress },
          { label: 'Awaiting Claim', value: unclaimed },
          { label: 'Blocked / Other', value: total - completed - inProgress - unclaimed },
        ]
      },
      {
        label: 'Productivity', value: `${pct}%`, icon: TrendingUp, color: 'purple', delay: 'delay-5',
        details: [
          { label: 'Tasks Created', value: total },
          { label: 'Tasks Completed', value: completed },
          { label: 'Performance Rank', value: pct >= 80 ? '🏆 Elite' : pct >= 50 ? '🌟 Rising Star' : '🔥 Building Up' },
        ]
      },
    ];
  }, [tasks, users]);

  // ─── Staff Performance (Bar + Line) ────────────────────────────────────────
  const teamPerformanceData = useMemo(() => {
    return users
      .filter(u => u.role?.toLowerCase() === 'staff')
      .map(u => ({
        name: u.name?.split(' ')[0] ?? 'User',
        completed: tasks.filter(t =>
          (t.status?.toLowerCase() === 'completed' || t.completed === true) &&
          (t.claimedBy?._id === u._id || t.claimedBy === u._id)
        ).length,
        points: u.points || 0,
      }))
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 7);
  }, [tasks, users]);

  // ─── Weekly Trends (real data) ──────────────────────────────────────────────
  const taskTrendsData = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        name: format(date, 'EEE'),
        created: tasks.filter(t => t.createdAt && isSameDay(new Date(t.createdAt), date)).length,
        completed: tasks.filter(t => {
          const compDate = t.completedAt || (t.status === 'completed' ? t.updatedAt : null);
          return compDate && isSameDay(new Date(compDate), date);
        }).length,
      };
    }),
    [tasks]);

  // ─── Task History (all-time cumulative area chart) ────────────────────────
  const taskHistoryData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      return {
        name: format(date, 'MMM d'),
        created: tasks.filter(t => t.createdAt && isSameDay(new Date(t.createdAt), date)).length,
        completed: tasks.filter(t => {
          const compDate = t.completedAt || (t.status === 'completed' ? t.updatedAt : null);
          return compDate && isSameDay(new Date(compDate), date);
        }).length,
        inProgress: tasks.filter(t => t.status?.toLowerCase() === 'in-progress' && t.createdAt && isSameDay(new Date(t.createdAt), date)).length,
      };
    });
  }, [tasks]);

  // ─── Priority / Status breakdown ──────────────────────────────────────────
  const priorityData = useMemo(() => [
    { name: 'High', value: tasks.filter(t => t.priority?.toLowerCase() === 'high').length, fill: '#f43f5e' },
    { name: 'Medium', value: tasks.filter(t => t.priority?.toLowerCase() === 'medium').length, fill: '#fbbf24' },
    { name: 'Low', value: tasks.filter(t => t.priority?.toLowerCase() === 'low').length, fill: '#34d399' },
  ].filter(d => d.value > 0), [tasks]);

  const statusData = useMemo(() => [
    { name: 'Completed', value: tasks.filter(t => t.status?.toLowerCase() === 'completed' || t.completed === true).length, fill: '#22d3ee' },
    { name: 'In Progress', value: tasks.filter(t => t.status?.toLowerCase() === 'in-progress').length, fill: '#818cf8' },
    { name: 'Unclaimed', value: tasks.filter(t => t.status?.toLowerCase() === 'unclaimed').length, fill: '#94a3b8' },
  ].filter(d => d.value > 0), [tasks]);

  const BAR_COLORS = ['#22d3ee', '#34d399', '#f43f5e', '#818cf8', '#fbbf24', '#a78bfa', '#60a5fa'];

  return (
    <div className="p-4 md:p-6 min-h-screen overflow-y-auto custom-scrollbar space-y-10 pb-20 animate-fade-in relative">

      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -left-20 w-[45%] h-[45%] bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute -bottom-20 -right-20 w-[45%] h-[45%] bg-blue-600/10 blur-[120px] rounded-full animate-float delay-4" />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl animate-scale-in">
        <div className="absolute top-1/2 -translate-y-1/2 right-4 md:-right-20 p-4 opacity-70 pointer-events-none z-0">
          <div className="relative w-72 h-72 md:w-[500px] md:h-[500px] flex items-center justify-center animate-logo-3d">

            {/* Background Tech Grid (Simulated with CSS) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[length:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] opacity-30 animate-pulse"></div>

            <div className="animate-float-3d relative flex items-center justify-center scale-75 md:scale-100">
              {/* 3D Scanning Line Animation */}
              <div className="absolute w-[300px] h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-20 animate-bounce opacity-40"></div>

              {/* High-Clarity 3D Globe */}
              <div className="relative">
                <Globe size={280} className="text-cyan-400 drop-shadow-[0_0_35px_rgba(34,211,238,0.7)] animate-pulse-glow" strokeWidth={1} />
                {/* Inner core glow */}
                <div className="absolute inset-0 bg-cyan-500/10 blur-[40px] rounded-full animate-pulse"></div>
              </div>

              {/* Orbital Node 1 */}
              <div className="absolute w-full h-full animate-spin-slow [animation-duration:15s]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_15px_rgba(34,211,238,1)]"></div>
              </div>

              {/* Orbital Node 2 */}
              <div className="absolute w-full h-full animate-spin-slow [animation-duration:20s] [animation-direction:reverse]">
                <div className="absolute bottom-10 right-0 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,1)]"></div>
              </div>

              {/* Sharp Orbiting Rings */}
              <div className="absolute w-[115%] h-[115%] border border-cyan-500/20 rounded-full animate-spin-slow"></div>
              <div className="absolute w-[140%] h-[140%] border border-dashed border-blue-500/10 rounded-full animate-spin-slow [animation-duration:40s] [animation-direction:reverse]"></div>

              {/* Decorative Rays */}
              <div className="absolute w-[200%] h-[200%] bg-gradient-radial from-cyan-500/5 to-transparent blur-3xl -z-20 opacity-30"></div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase tracking-widest mb-6">
            <Zap size={12} /> Version 2.0 Live
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Elevate Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
              Team Productivity
            </span>{' '}
            with Qubic
          </h1>
          <p className="text-slate-400 text-base md:text-lg mb-8 leading-relaxed">
            A comprehensive task management and performance tracking ecosystem for modern HR workflows.
            Monitor progression, reward excellence, and manage your entire team from one unified dashboard.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate(currentUser ? '/kanban' : '/login')}
              className="px-8 py-3 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 transition-all animate-text-shimmer"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate(currentUser ? '/performance' : '/login')}
              className="px-8 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2 group"
            >
              View Analytics <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid (clickable) ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
        {globalStats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              onClick={() => currentUser ? setSelectedStat(stat) : navigate('/login')}
              className={`bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl group hover:-translate-y-2 hover:border-cyan-500/30 hover:shadow-cyan-500/10 transition-all duration-500 animate-slide-up cursor-pointer ${stat.delay}`}
            >
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-500/10 flex items-center justify-center mb-3 border border-${stat.color}-500/20 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 text-${stat.color}-400`} />
              </div>
              <p className="text-xs text-slate-400 font-medium mb-1 truncate">{stat.label}</p>
              <h3 className="text-2xl md:text-3xl font-bold text-white">{stat.value}</h3>
              <p className="text-[10px] text-slate-500 mt-2 group-hover:text-cyan-400 transition-colors">Tap for details →</p>
            </div>
          );
        })}
      </div>

      {/* ── Analytics Charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Staff Progression: Bars = tasks, Line = points */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl animate-scale-in delay-2">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Staff Progression</h3>
              <p className="text-xs text-slate-500 mt-0.5">Completions (bars) · Points (line)</p>
            </div>
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Target className="text-emerald-400 w-4 h-4" />
            </div>
          </div>
          {teamPerformanceData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
              No staff data yet
            </div>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height={280} debounce={50} minWidth={0} minHeight={0}>
                <ComposedChart data={teamPerformanceData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-white/20 p-3 rounded-xl shadow-xl text-xs">
                          <p className="text-cyan-400 font-bold mb-1">{d.name}</p>
                          <p className="text-slate-300 flex justify-between gap-4"><span>Tasks</span><span className="font-bold text-white">{d.completed}</span></p>
                          <p className="text-slate-300 flex justify-between gap-4"><span>Points</span><span className="font-bold text-yellow-400">{d.points}</span></p>
                        </div>
                      );
                    }}
                  />
                  <Bar yAxisId="left" dataKey="completed" radius={[4, 4, 0, 0]} barSize={22} animationDuration={1800}>
                    {teamPerformanceData.map((_, i) => (
                      <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                  <Line yAxisId="right" type="monotone" dataKey="points" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }} animationDuration={1800} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weekly Trends: created vs completed */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl animate-scale-in delay-3">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">Weekly Trends</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tasks created vs completed (last 7 days)</p>
            </div>
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Activity className="text-indigo-400 w-4 h-4" />
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height={280} debounce={50} minWidth={0} minHeight={0}>
              <AreaChart data={taskTrendsData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff15', borderRadius: '12px' }}
                  itemStyle={{ fontSize: 12 }}
                />
                <Area type="monotone" dataKey="created" name="Created" stroke="#818cf8" strokeWidth={2.5} fill="url(#gCreated)" animationDuration={1800} />
                <Area type="monotone" dataKey="completed" name="Completed" stroke="#34d399" strokeWidth={2.5} fill="url(#gCompleted)" animationDuration={1800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Task Statistics Banner ────────────────────────────────────── */}
      <div
        onClick={() => currentUser ? setShowTaskStats(true) : navigate('/login')}
        className="group cursor-pointer relative overflow-hidden bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-3xl p-6 flex items-center justify-between hover:border-cyan-500/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.1)] transition-all duration-500 animate-scale-in delay-4"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-5">
          <div className="p-4 bg-cyan-500/20 rounded-2xl border border-cyan-500/30 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Task Statistics Dashboard</h3>
            <p className="text-sm text-slate-400">Full breakdown of all tasks — priority, status, and 14-day history with graphs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm shrink-0">
          View Stats <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Secure Infrastructure', desc: 'Enterprise-grade role-based access control keeps your organizational data protected.', icon: Shield, color: 'cyan' },
          { title: 'Real-time Tracking', desc: 'Monitor every task\'s lifecycle and staff performance as it unfolds — live.', icon: Clock, color: 'emerald' },
          { title: 'Global Team Reach', desc: 'Manage distributed staff across departments with seamless HR-team allocation.', icon: Globe, color: 'indigo' },
        ].map((feat, idx) => {
          const Icon = feat.icon;
          return (
            <div key={idx} className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/8 hover:-translate-y-1 transition-all group animate-slide-up delay-4">
              <div className={`w-11 h-11 rounded-xl bg-${feat.color}-500/10 flex items-center justify-center mb-5 border border-${feat.color}-500/20 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 text-${feat.color}-400`} />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{feat.title}</h4>
              <p className="text-slate-400 text-sm leading-relaxed">{feat.desc}</p>
            </div>
          );
        })}
      </div>

      {/* ── Stat Detail Modal ─────────────────────────────────────────────── */}
      {selectedStat && <StatModal stat={selectedStat} onClose={() => setSelectedStat(null)} />}

      {/* ── Task Statistics Full Modal ──────────────────────────────────── */}
      {showTaskStats && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in" onClick={() => setShowTaskStats(false)}>
          <div className="bg-slate-900 border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl"><TrendingUp className="w-6 h-6 text-cyan-400" /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Task Statistics Dashboard</h3>
                  <p className="text-xs text-slate-400">Complete analytics across all {tasks.length} tasks</p>
                </div>
              </div>
              <button onClick={() => setShowTaskStats(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto custom-scrollbar p-6 space-y-8">

              {/* Mini stat pills */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total', value: tasks.length, color: 'cyan' },
                  { label: 'Completed', value: tasks.filter(t => t.status === 'completed' || t.completed === true).length, color: 'emerald' },
                  { label: 'In Progress', value: tasks.filter(t => t.status === 'in-progress').length, color: 'indigo' },
                  { label: 'Unclaimed', value: tasks.filter(t => t.status === 'unclaimed').length, color: 'orange' },
                ].map((s, i) => (
                  <div key={i} className={`bg-${s.color}-500/10 border border-${s.color}-500/20 rounded-2xl p-4 text-center`}>
                    <p className={`text-3xl font-black text-${s.color}-400`}>{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 14-Day History Chart */}
              <div>
                <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" /> 
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">14-Day Task Activity</span>
                </h4>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height={220} debounce={50} minWidth={0} minHeight={0}>
                    <AreaChart data={taskHistoryData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="mCreated" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} /><stop offset="95%" stopColor="#818cf8" stopOpacity={0} /></linearGradient>
                        <linearGradient id="mDone" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.3} /><stop offset="95%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff15', borderRadius: '10px' }} itemStyle={{ fontSize: 11 }} />
                      <Area type="monotone" dataKey="created" name="Created" stroke="#818cf8" strokeWidth={2} fill="url(#mCreated)" animationDuration={1500} />
                      <Area type="monotone" dataKey="completed" name="Completed" stroke="#34d399" strokeWidth={2} fill="url(#mDone)" animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Priority & Status Pies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-rose-400" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">Priority Distribution</span>
                  </h4>
                  {priorityData.length > 0 ? (
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height={180} debounce={50} minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie data={priorityData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} animationDuration={1200}>
                            {priorityData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff15', borderRadius: '10px' }} />
                          <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="text-slate-500 text-sm text-center py-10">No priority data</p>}
                </div>
                <div>
                  <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">Status Distribution</span>
                  </h4>
                  {statusData.length > 0 ? (
                    <div className="h-[180px]">
                      <ResponsiveContainer width="100%" height={180} debounce={50} minWidth={0} minHeight={0}>
                        <PieChart>
                          <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} animationDuration={1200}>
                            {statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff15', borderRadius: '10px' }} />
                          <Legend iconType="circle" iconSize={8} formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <p className="text-slate-500 text-sm text-center py-10">No status data</p>}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-white/5 shrink-0">
              <button onClick={() => setShowTaskStats(false)} className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-300 transition-all">Close Dashboard</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Login Prompt Modal (Every 1 minute for unauthenticated) ──────── */}
      {showLoginPrompt && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" onClick={() => setShowLoginPrompt(false)}>
          <div className="bg-slate-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-scale-in flex flex-col p-8 text-center" onClick={e => e.stopPropagation()}>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-cyan-500/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-3">Join Qubic Today</h2>
            <p className="text-slate-400 text-sm mb-8">
              You are viewing as a guest. Log in or sign up to unlock full features, perform tasks, and manage your workflow.
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => navigate('/login')} className="w-full py-3 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-cyan-500/40 transition-all">
                Log In
              </button>
              <button onClick={() => navigate('/signup')} className="w-full py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
                Sign Up
              </button>
              <button onClick={() => setShowLoginPrompt(false)} className="w-full py-2 mt-2 text-slate-500 text-sm font-semibold hover:text-slate-300 transition-colors">
                Maybe Later
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Home;
