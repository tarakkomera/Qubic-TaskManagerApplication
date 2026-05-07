import { Clock, ListChecks, SortDesc, SortAsc, Award, Filter, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom';
import TaskItem from '../components/TaskItem';
import TaskModal from '../components/TaskModal';

const API_BASE = 'http://localhost:4000/api/tasks';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest', icon: <SortDesc className="w-3 h-3" /> },
  { id: 'oldest', label: 'Oldest', icon: <SortAsc className="w-3 h-3" /> },
  { id: 'priority', label: 'Priority', icon: <Award className="w-3 h-3" /> },
];

const layoutClasses = {
  container: 'p-4 md:p-6 min-h-screen overflow-hidden text-slate-200',
  header: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4',
  sortBox: 'flex items-center justify-between bg-white/5 backdrop-blur-md p-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 w-full md:w-auto hover:shadow-md transition-shadow duration-300',
  select: 'px-3 py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 md:hidden text-sm font-medium text-slate-200 bg-slate-800',
  tabWrapper: 'hidden md:flex space-x-1 bg-white/5 p-1.5 rounded-xl border border-white/10 ml-3',
  tabButton: (active) =>
    `relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out group overflow-hidden flex items-center gap-1.5 ${active
      ? 'text-white shadow-md -translate-y-0.5 scale-[1.02] bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] animate-text-shimmer'
      : 'text-slate-400 hover:text-cyan-300 hover:shadow-sm hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/10'
    }`,
  addBox: 'hidden md:block p-5 border-2 border-dashed border-white/20 rounded-xl hover:border-cyan-400 hover:bg-white/5 hover:shadow-[0_8px_30px_rgba(34,211,238,0.2)] hover:-translate-y-1 hover:scale-[1.01] cursor-pointer transition-all duration-300 mb-4 group',
  emptyState: 'p-8 bg-white/5 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 text-center',
  emptyIconBg: 'w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-cyan-500/20',
  emptyBtn: 'mt-4 px-4 py-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white rounded-lg text-sm font-semibold hover:shadow-[0_8px_30px_rgba(34,211,238,0.5)] hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 group border border-white/20',
};

const PendingPage = () => {
  const { tasks = [], refreshTasks, userRole, softDeleteTask } = useOutletContext();
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const canManage = isHR || isAdmin;
  const userId = localStorage.getItem('userId');

  const [sortBy, setSortBy] = useState('newest');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filter: HR sees all in-progress tasks; Staff sees only their own
  const sortedPendingTasks = useMemo(() => {
    const inProgress = tasks.filter(t => {
      if (t.status === 'in-progress') {
        if (canManage) return true;
        return t.claimedBy?._id === userId || t.claimedBy === userId;
      }
      return false;
    });

    return inProgress.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      const order = { high: 3, medium: 2, low: 1 };
      return (order[b.priority?.toLowerCase()] || 0) - (order[a.priority?.toLowerCase()] || 0);
    });
  }, [tasks, sortBy, isHR, userId]);

  return (
    <div className={layoutClasses.container}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            <ListChecks className="text-cyan-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="truncate text-xl">Pending Tasks</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${isAdmin ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                isHR ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
              {isAdmin ? 'Admin' : isHR ? 'HR' : 'Staff'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7 truncate">
            {canManage ? 'Monitoring all tasks currently in progress across the team' : 'View and manage tasks you are currently working on'}
          </p>
        </div>

        {isHR && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 w-full md:w-auto justify-center text-sm font-semibold group border border-white/20"
          >
            <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
            Create Task
          </button>
        )}
      </div>

      <div className={`${layoutClasses.sortBox} mb-8`}>
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <Filter className="w-4 h-4 text-blue-400" />
          <span className="text-sm">Sort by:</span>
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={layoutClasses.select}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="priority">By Priority</option>
        </select>
        <div className={layoutClasses.tabWrapper}>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setSortBy(opt.id)} className={layoutClasses.tabButton(sortBy === opt.id)}>
              <span className="relative z-10 flex items-center gap-1.5">{opt.icon} {opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid Content */}

      {/* HR: quick add button */}
      {isHR && (
        <div className={`${layoutClasses.addBox} mb-6`} onClick={() => setShowModal(true)}>
          <div className="flex items-center justify-center gap-3 text-slate-400 group-hover:text-cyan-300 transition-colors">
            <Plus className="text-cyan-400" size={18} />
            <span className="font-medium">Add New Task</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedPendingTasks.length === 0 ? (
          <div className={layoutClasses.emptyState}>
            <div className={layoutClasses.emptyIconBg}>
              <Clock className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">
              {canManage ? 'No tasks in progress' : 'All Caught Up!'}
            </h3>
            <p className="text-sm text-slate-400">
              {canManage
                ? 'No tasks are currently in progress.'
                : 'You have no in-progress tasks.'}
            </p>
          </div>
        ) : (
          sortedPendingTasks.map(task => (
            <TaskItem
              key={task._id || task.id}
              task={task}
              userRole={userRole}
              showCompleteCheckbox={canManage}
              onDelete={() => softDeleteTask(task._id || task.id)}
              onEdit={canManage ? () => { setSelectedTask(task); setShowModal(true); } : undefined}
              onRefresh={refreshTasks}
            />
          ))
        )}
      </div>

      <TaskModal
        isOpen={!!selectedTask || showModal}
        onClose={() => { setShowModal(false); setSelectedTask(null); refreshTasks(); }}
        taskToEdit={selectedTask}
        onSave={refreshTasks}
        userRole={userRole}
      />
    </div>
  );
};

export default PendingPage;
