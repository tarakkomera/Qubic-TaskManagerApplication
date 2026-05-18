import React, { useCallback, useMemo, useState } from 'react'
import { HomeIcon, Plus, Flame, Filter, CalendarIcon, Briefcase, Users } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import TaskModal from '../components/TaskModal'
import axios from 'axios'
import TaskItem from '../components/TaskItem'

const API_BASE = `${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/tasks`

const Dashboard = () => {
  const { tasks, refreshTasks, userRole, softDeleteTask } = useOutletContext()
  const isHR = userRole === 'hr'
  const isAdmin = userRole === 'admin'
  const canManageTasks = isHR || isAdmin

  const [showModal, setShowModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [filter, setFilter] = useState('all')

  // ─── Stats ────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (canManageTasks) {
      return {
        total: tasks.length,
        unclaimed: tasks.filter(t => t.status === 'unclaimed').length,
        inProgress: tasks.filter(t => t.status === 'in-progress').length,
        completed: tasks.filter(t => t.status === 'completed' || t.completed === true ||
          (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')).length,
      }
    } else {
      const myTasks = tasks.filter(t => t.claimedBy?._id === localStorage.getItem('userId') ||
        t.claimedBy === localStorage.getItem('userId'))
      return {
        total: tasks.filter(t => t.status === 'unclaimed').length,   // available to claim
        inProgress: myTasks.filter(t => t.status === 'in-progress').length,
        completed: myTasks.filter(t => t.status === 'completed' || t.completed === true ||
          (typeof t.completed === 'string' && t.completed.toLowerCase() === 'yes')).length,
        mine: myTasks.length,
      }
    }
  }, [tasks, canManageTasks])

  // ─── Filter ───────────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => tasks.filter(task => {
    const dueDate = new Date(task.dueDate)
    const today = new Date()
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
    switch (filter) {
      case 'today': return dueDate.toDateString() === today.toDateString()
      case 'week': return dueDate >= today && dueDate <= nextWeek
      case 'high':
      case 'medium':
      case 'low': return task.priority?.toLowerCase() === filter
      case 'unclaimed': return task.status === 'unclaimed'
      default: return true
    }
  }), [tasks, filter])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleTaskSave = useCallback(async (taskData) => {
    try {
      if (taskData.id) await axios.put(`${API_BASE}/${taskData.id}/gp`, taskData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      refreshTasks()
      setShowModal(false)
      setSelectedTask(null)
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }, [refreshTasks])

  // ─── Stats config ─────────────────────────────────────────────────────────
  const STATS = canManageTasks ? [
    { key: 'total', label: 'Total Tasks', icon: HomeIcon, iconColor: 'bg-cyan-500/20 text-cyan-400', textColor: 'text-cyan-400' },
    { key: 'unclaimed', label: 'Unclaimed', icon: CalendarIcon, iconColor: 'bg-blue-500/20 text-blue-400', textColor: 'text-blue-400' },
    { key: 'inProgress', label: 'In Progress', icon: Flame, iconColor: 'bg-yellow-500/20 text-yellow-400', textColor: 'text-yellow-400' },
    { key: 'completed', label: 'Completed', icon: Flame, iconColor: 'bg-green-500/20 text-green-400', textColor: 'text-green-400' },
  ] : [
    { key: 'total', label: 'Available', icon: CalendarIcon, iconColor: 'bg-blue-500/20 text-blue-400', textColor: 'text-blue-400' },
    { key: 'mine', label: 'My Tasks', icon: Users, iconColor: 'bg-cyan-500/20 text-cyan-400', textColor: 'text-cyan-400' },
    { key: 'inProgress', label: 'In Progress', icon: Flame, iconColor: 'bg-yellow-500/20 text-yellow-400', textColor: 'text-yellow-400' },
    { key: 'completed', label: 'Completed', icon: Flame, iconColor: 'bg-green-500/20 text-green-400', textColor: 'text-green-400' },
  ]

  const FILTER_OPTIONS = canManageTasks
    ? ['all', 'unclaimed', 'today', 'week', 'high', 'medium', 'low']
    : ['all', 'today', 'week', 'high', 'medium', 'low']

  const FILTER_LABELS = {
    all: canManageTasks ? 'All Tasks' : 'Available Tasks',
    unclaimed: 'Unclaimed',
    today: "Today's Tasks",
    week: 'This Week',
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  }

  return (
    <div className="p-4 md:p-6 min-h-screen overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            {canManageTasks
              ? <Briefcase className="text-cyan-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
              : <Users className="text-blue-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            }
            <span className="truncate text-xl">
              {canManageTasks ? 'Task Management' : 'Task Board'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${isAdmin ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              isHR ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
              {isAdmin ? 'Admin' : isHR ? 'HR' : 'Staff'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7 truncate">
            {canManageTasks ? 'Create and assign tasks to your team' : 'Claim and complete your tasks'}
          </p>
        </div>

        {/* Only HR can create tasks */}
        {isHR && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 w-full md:w-auto justify-center text-sm font-semibold group"
          >
            <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
            Create Task
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6 animate-slide-up delay-1">
        {STATS.map(({ key, label, icon: Icon, iconColor, textColor }, idx) => (
          <div key={key} className={`group p-3 md:p-4 rounded-xl bg-white/5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 hover:shadow-[0_8px_30px_rgba(34,211,238,0.2)] hover:-translate-y-2 hover:scale-[1.02] hover:border-cyan-500/50 transition-all duration-300 ease-out min-w-0 cursor-default overflow-hidden relative delay-${idx + 1}`}>
            {/* Background Hover Shine */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`p-1.5 md:p-2 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${iconColor}`}>
                <Icon className="w-4 h-4 md:h-5 md:w-5" />
              </div>
              <div className="truncate">
                <p className="text-xs text-slate-400 truncate transition-colors duration-300 group-hover:text-cyan-300">{label}</p>
                <p className={`text-lg font-semibold transition-all duration-300 ${textColor || ''} group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-400 group-hover:via-cyan-500 group-hover:to-blue-400 group-hover:animate-text-shimmer group-hover:bg-[length:200%_auto]`}>
                  {stats[key] ?? 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter + Task List */}
      <div className="space-y-2 md:space-y-4">
        <div className="flex items-center justify-between bg-white/5 backdrop-blur-md p-2 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 hover:shadow-md transition-shadow duration-300 mb-8">
          <div className="flex items-center gap-2 min-w-0 ml-1">
            <Filter className="w-4 h-5 text-cyan-400" />
            <h6 className="text-sm md:text-base font-bold text-slate-200 truncate">{FILTER_LABELS[filter]}</h6>
          </div>
          {/* Mobile select */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 md:hidden text-sm font-medium text-slate-200 bg-slate-800"
          >
            {FILTER_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
            ))}
          </select>
          {/* Desktop tabs */}
          <div className="hidden md:flex space-x-1 bg-white/5 p-1.5 rounded-xl border border-white/10">
            {FILTER_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out group overflow-hidden ${filter === opt
                  ? 'text-white shadow-md -translate-y-0.5 scale-[1.02] bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] animate-text-shimmer'
                  : 'text-slate-400 hover:text-cyan-300 hover:shadow-sm hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/10'
                  }`}
              >
                <span className="relative z-10">{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {filteredTasks.length === 0 ? (
            <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 text-center animate-scale-in">
              <CalendarIcon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-slate-200 mb-2">No tasks found</h3>
              <p className="text-sm text-slate-400 mb-3">
                {canManageTasks
                  ? (filter === 'all' ? 'Create your first task to get started' : 'No tasks match this filter')
                  : 'No available tasks to claim right now'
                }
              </p>
              {canManageTasks && (
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300">
                  Add New Task
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task, idx) => (
              <div key={task._id || task.id} className={`animate-fade-in delay-${(idx % 8) + 1}`}>
                <TaskItem
                  task={task}
                  onRefresh={refreshTasks}
                  userRole={userRole}
                  showCompleteCheckbox={canManageTasks}
                  onDelete={() => softDeleteTask(task._id || task.id)}
                  onEdit={canManageTasks ? () => { setSelectedTask(task); setShowModal(true) } : undefined}
                />
              </div>
            ))
          )}
        </div>

        {/* HR/Admin: Add task quick action */}
        {canManageTasks && (
          <div
            onClick={() => setShowModal(true)}
            className="hidden md:flex items-center justify-center p-2 border-2 border-dashed border-white/20 rounded-xl hover:border-cyan-400 hover:bg-white/5 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] cursor-pointer transition-all duration-300 group"
          >
            <Plus className="w-5 h-5 text-teal-400 mr-2 transition-transform duration-300 group-hover:rotate-90 group-hover:text-cyan-400" />
            <span className="text-slate-400 font-medium transition-colors duration-300 group-hover:text-cyan-300">Add New Task</span>
          </div>
        )}
      </div>

      {/* Task Modal — HR/Admin only */}
      {canManageTasks && (
        <TaskModal
          isOpen={showModal || !!selectedTask}
          onClose={() => { setShowModal(false); setSelectedTask(null) }}
          taskToEdit={selectedTask}
          onSave={handleTaskSave}
          userRole={userRole}
        />
      )}
    </div>
  )
}

export default Dashboard