import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Plus, Calendar, PlayCircle, CheckCircle2, UserCheck, Inbox, Trash2, Briefcase, Users } from 'lucide-react';
import TaskModal from '../components/TaskModal';

const API_BASE = `${import.meta.env.VITE_API_URL || `${import.meta.env.VITE_API_URL || "http://localhost:4000/api"}`}/tasks`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : {};
};

const KanbanBoard = () => {
  const { tasks, refreshTasks, userRole, softDeleteTask } = useOutletContext();
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const canManage = isHR || isAdmin;
  const userId = localStorage.getItem('userId');

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  // ─── Build columns ────────────────────────────────────────────────────────
  const columns = canManage
    ? [
      {
        id: 'unclaimed',
        title: 'Unclaimed',
        subtitle: 'Open tasks awaiting assignment',
        accent: 'cyan',
        headerBg: 'bg-cyan-500/10 border-b border-cyan-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(34,211,238,0.08)]',
        iconColor: 'text-cyan-400',
        countBg: 'bg-cyan-500/20 text-cyan-300',
        icon: <Inbox className="w-5 h-5 text-cyan-400" />,
        tasks: tasks.filter(t => t.status === 'unclaimed'),
      },
      {
        id: 'in-progress',
        title: 'In Progress',
        subtitle: 'Tasks currently being worked on',
        accent: 'indigo',
        headerBg: 'bg-indigo-500/10 border-b border-indigo-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 shadow-[0_8px_32px_rgba(99,102,241,0.08)]',
        iconColor: 'text-indigo-400',
        countBg: 'bg-indigo-500/20 text-indigo-300',
        icon: <PlayCircle className="w-5 h-5 text-indigo-400" />,
        tasks: tasks.filter(t => t.status === 'in-progress'),
      },
      {
        id: 'completed',
        title: 'Completed',
        subtitle: 'Successfully finished tasks',
        accent: 'emerald',
        headerBg: 'bg-emerald-500/10 border-b border-emerald-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.08)]',
        iconColor: 'text-emerald-400',
        countBg: 'bg-emerald-500/20 text-emerald-300',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        tasks: tasks.filter(t => t.status === 'completed'),
      },
    ]
    : [
      {
        id: 'unclaimed',
        title: 'Available',
        subtitle: 'Drag a task to claim it',
        accent: 'cyan',
        headerBg: 'bg-cyan-500/10 border-b border-cyan-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-cyan-500/20 shadow-[0_8px_32px_rgba(34,211,238,0.08)]',
        iconColor: 'text-cyan-400',
        countBg: 'bg-cyan-500/20 text-cyan-300',
        icon: <Inbox className="w-5 h-5 text-cyan-400" />,
        tasks: tasks.filter(t => t.status === 'unclaimed'),
        canDrop: false,
      },
      {
        id: 'in-progress',
        title: 'My Active Tasks',
        subtitle: 'Tasks you are currently working on',
        accent: 'indigo',
        headerBg: 'bg-indigo-500/10 border-b border-indigo-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-indigo-500/20 shadow-[0_8px_32px_rgba(99,102,241,0.08)]',
        iconColor: 'text-indigo-400',
        countBg: 'bg-indigo-500/20 text-indigo-300',
        icon: <PlayCircle className="w-5 h-5 text-indigo-400" />,
        tasks: tasks.filter(t =>
          t.status === 'in-progress' &&
          (t.claimedBy?._id === userId || t.claimedBy === userId)
        ),
        canDrop: true,
      },
      {
        id: 'completed',
        title: 'My Completed',
        subtitle: 'Tasks you have finished',
        accent: 'emerald',
        headerBg: 'bg-emerald-500/10 border-b border-emerald-500/20',
        colBg: 'bg-slate-900/50 backdrop-blur-xl border border-emerald-500/20 shadow-[0_8px_32px_rgba(16,185,129,0.08)]',
        iconColor: 'text-emerald-400',
        countBg: 'bg-emerald-500/20 text-emerald-300',
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        tasks: tasks.filter(t =>
          t.status === 'completed' &&
          (t.claimedBy?._id === userId || t.claimedBy === userId)
        ),
        canDrop: true,
      },
    ];

  // ─── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { e.target.style.opacity = '0.4'; }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
    setDraggedTask(null);
    setDragOverCol(null);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    setDragOverCol(null);
    if (!draggedTask) return;
    try {
      if (!canManage) {
        if (draggedTask.status === 'unclaimed' && columnId === 'in-progress') {
          await fetch(`${API_BASE}/${draggedTask._id || draggedTask.id}/claim`, {
            method: 'PATCH', headers: getAuthHeaders(),
          });
        } else if (columnId === 'completed' &&
          (draggedTask.claimedBy?._id === userId || draggedTask.claimedBy === userId)) {
          await fetch(`${API_BASE}/${draggedTask._id || draggedTask.id}/gp`, {
            method: 'PUT', headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'completed' }),
          });
        } else if (columnId === 'in-progress' &&
          (draggedTask.claimedBy?._id === userId || draggedTask.claimedBy === userId)) {
          await fetch(`${API_BASE}/${draggedTask._id || draggedTask.id}/gp`, {
            method: 'PUT', headers: getAuthHeaders(),
            body: JSON.stringify({ status: 'in-progress' }),
          });
        }
      } else {
        await fetch(`${API_BASE}/${draggedTask._id || draggedTask.id}/gp`, {
          method: 'PUT', headers: getAuthHeaders(),
          body: JSON.stringify({ status: columnId, completed: columnId === 'completed' }),
        });
      }
      refreshTasks();
    } catch (error) {
      console.error('Drop error:', error);
    } finally {
      setDraggedTask(null);
    }
  };

  const handleDeleteTask = (e, taskId) => {
    e.stopPropagation();
    softDeleteTask(taskId);
  };

  // ─── Priority helpers ──────────────────────────────────────────────────────
  const getPriorityBar = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'high') return 'bg-gradient-to-b from-red-400 to-red-600';
    if (p === 'medium') return 'bg-gradient-to-b from-amber-400 to-amber-600';
    if (p === 'low') return 'bg-gradient-to-b from-emerald-400 to-emerald-600';
    return 'bg-white/20';
  };

  const getPriorityBadge = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'high') return 'bg-red-500/15 text-red-400 border-red-500/30';
    if (p === 'medium') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    if (p === 'low') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    return 'bg-white/10 text-slate-300 border-white/20';
  };

  // ─── Kanban Card (compact) ───────────────────────────────────────────────
  const KanbanTaskCard = ({ task }) => {
    const isCompleted = task.status === 'completed';
    const isMine = task.claimedBy?._id === userId || task.claimedBy === userId;
    const taskId = task._id ? task._id.substring(task._id.length - 4).toUpperCase() : '0000';

    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        onClick={() => {
          setSelectedTask(task);
          if (canManage || isMine || task.status === 'unclaimed') setShowModal(true);
        }}
        className={`group relative bg-white/[0.03] hover:bg-white/[0.07] border border-white/8 hover:border-white/20 rounded-xl p-2.5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${isCompleted ? 'opacity-60' : ''}`}
      >
        {/* Priority side bar */}
        <div className={`absolute top-0 left-0 w-[2px] h-full rounded-l-xl ${getPriorityBar(task.priority)}`} />

        {/* Top row */}
        <div className="flex items-center justify-between mb-1.5 pl-1.5">
          <span className="text-[9px] font-mono font-bold text-slate-600">#{taskId}</span>
          {task.priority && (
            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full border ${getPriorityBadge(task.priority)}`}>
              {task.priority}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className={`text-xs font-semibold leading-snug mb-1 pl-1.5 break-words ${isCompleted ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-cyan-300 transition-colors'}`}>
          {task.title}
        </h3>

        {/* Description - single line */}
        {task.description && (
          <p className="text-[10px] text-slate-500 mb-1.5 pl-1.5 line-clamp-1">{task.description}</p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-1.5 pl-1.5 border-t border-white/5">
          <div className="flex items-center gap-2">
            {canManage && task.claimedBy && (
              <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                <UserCheck className="w-2.5 h-2.5" />
                <span>{task.claimedBy.name || 'Claimed'}</span>
              </div>
            )}
            {task.dueDate && (
              <div className="flex items-center gap-1 text-[9px] text-slate-500">
                <Calendar className="w-2.5 h-2.5" />
                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>
          {canManage && (
            <button
              onClick={(e) => handleDeleteTask(e, task._id || task.id)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-600 hover:bg-red-500/20 hover:text-red-400 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  // ─── Kanban Column (compact) ───────────────────────────────────────────────
  const KanbanColumn = ({ column }) => {
    const isOver = dragOverCol === column.id;
    return (
      <div
        className={`flex-1 rounded-xl transition-all duration-300 ${column.colBg} ${isOver ? 'ring-2 ring-cyan-500/40' : ''}`}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={() => setDragOverCol(null)}
        onDrop={(e) => handleDrop(e, column.id)}
      >
        {/* Column Header */}
        <div className={`px-3 py-2.5 rounded-t-xl ${column.headerBg}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4">{column.icon}</div>
              <h3 className="text-xs font-bold text-slate-100">{column.title}</h3>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${column.countBg}`}>
                {column.tasks.length}
              </span>
              {isHR && column.id === 'unclaimed' && (
                <button
                  onClick={() => { setSelectedTask(null); setShowModal(true); }}
                  className="w-5 h-5 flex items-center justify-center rounded bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Claim hint for staff */}
        {!canManage && column.id === 'unclaimed' && (
          <div className="px-2.5 pt-2">
            <div className="text-[10px] text-cyan-400 bg-cyan-500/10 rounded-lg px-2 py-1.5 text-center border border-cyan-500/20">
              Drag to <strong>My Active Tasks</strong> to claim
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="p-2 space-y-1.5">
          {column.tasks.map(task => (
            <KanbanTaskCard key={task._id || task.id} task={task} />
          ))}
          {column.tasks.length === 0 && (
            <div className={`flex flex-col items-center justify-center py-6 rounded-lg border border-dashed transition-colors ${isOver ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-white/10'}`}>
              <Inbox className={`w-4 h-4 mb-1 ${isOver ? 'text-cyan-400' : 'text-slate-700'}`} />
              <span className={`text-[10px] ${isOver ? 'text-cyan-400' : 'text-slate-600'}`}>
                {isOver ? 'Drop here' : 'Empty'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 md:p-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-2">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            {canManage
              ? <Briefcase className="text-cyan-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
              : <Users className="text-blue-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            }
            <span className="truncate text-xl">
              {canManage ? 'Workflow Board' : 'My Workflow'}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${isAdmin ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              isHR ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
              {isAdmin ? 'Admin' : isHR ? 'HR' : 'Staff'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7 truncate">
            {canManage ? 'Create and assign tasks to your team' : 'Claim and complete your tasks'}
          </p>
        </div>
        {isHR && (
          <button
            onClick={() => { setSelectedTask(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 w-full md:w-auto justify-center text-sm font-semibold group"
          >
            <Plus size={16} className="transition-transform duration-300 group-hover:rotate-90" />
            Create Task
          </button>
        )}
      </div>

      {/* ── 3-column Kanban grid (no scroll) ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {columns.map(col => (
          <KanbanColumn key={col.id} column={col} />
        ))}
      </div>

      <TaskModal
        isOpen={showModal || !!selectedTask}
        onClose={() => { setShowModal(false); setSelectedTask(null); refreshTasks(); }}
        taskToEdit={selectedTask}
        onSave={refreshTasks}
        userRole={userRole}
      />
    </div>
  );
};

export default KanbanBoard;

