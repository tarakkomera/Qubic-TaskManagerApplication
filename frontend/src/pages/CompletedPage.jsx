import { CheckCircle, SortAsc, SortDesc, Award, Filter, Plus } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import TaskItem from '../components/TaskItem';
import { useOutletContext } from 'react-router-dom';
import TaskModal from '../components/TaskModal';

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest', icon: <SortDesc className="w-3 h-3" /> },
  { id: 'oldest', label: 'Oldest', icon: <SortAsc className="w-3 h-3" /> },
  { id: 'priority', label: 'Priority', icon: <Award className="w-3 h-3" /> },
];

const CT_CLASSES = {
  page: 'p-4 md:p-6 min-h-screen overflow-hidden text-slate-200',
  header: 'flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4',
  titleWrapper: 'flex-1 min-w-0',
  title: 'text-lg md:text-xl font-bold text-slate-100 flex items-center gap-2 truncate',
  subtitle: 'text-xs md:text-sm text-slate-400 mt-1 ml-8',
  sortContainer: 'w-full md:w-auto mt-2 md:mt-0',
  sortBox: 'flex items-center justify-between bg-white/5 backdrop-blur-md p-2 md:p-3 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 hover:shadow-md transition-shadow duration-300',
  filterLabel: 'flex items-center gap-2 text-slate-300 font-medium',
  select: 'px-2 py-1 md:px-3 md:py-2 border border-white/10 rounded-lg focus:ring-2 focus:ring-cyan-500 md:hidden text-xs md:text-sm font-medium text-slate-200 bg-slate-800',
  btnGroup: 'hidden md:flex space-x-1 bg-white/5 p-1.5 rounded-xl border border-white/10 ml-2 md:ml-3',
  btnBase: 'relative px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ease-out group overflow-hidden flex items-center gap-1',
  btnActive: 'text-white shadow-md -translate-y-0.5 scale-[1.02] bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] animate-text-shimmer',
  btnInactive: 'text-slate-400 hover:text-cyan-300 hover:shadow-sm hover:-translate-y-0.5 hover:scale-[1.02] hover:bg-white/10',
  list: 'space-y-3 md:space-y-4',
  emptyState: 'p-4 md:p-8 bg-white/5 backdrop-blur-md rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 text-center',
  emptyIconWrapper: 'w-12 h-12 md:w-16 md:h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border border-cyan-500/20',
  emptyTitle: 'text-base md:text-lg font-semibold text-slate-200 mb-2',
  emptyText: 'text-xs md:text-sm text-slate-400',
};

const CompletedPage = () => {
  const { tasks = [], refreshTasks, userRole, softDeleteTask } = useOutletContext();
  const isAdmin = userRole === 'admin';
  const isHR = userRole === 'hr';
  const canManage = isHR || isAdmin;
  const userId = localStorage.getItem('userId');

  const [sortBy, setSortBy] = useState('newest');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const sortedCompletedTasks = useMemo(() => {
    return tasks
      .filter(task => {
        const isComplete = task.status === 'completed' ||
          ['yes', true, 1, 'true'].includes(
            typeof task.completed === 'string' ? task.completed.toLowerCase() : task.completed
          );
        if (!isComplete) return false;
        // Staff sees only their own completed tasks
        if (!canManage) return task.claimedBy?._id === userId || task.claimedBy === userId;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'newest': return new Date(b.createdAt) - new Date(a.createdAt);
          case 'oldest': return new Date(a.createdAt) - new Date(b.createdAt);
          case 'priority': {
            const order = { high: 3, medium: 2, low: 1 };
            return (order[b.priority?.toLowerCase()] || 0) - (order[a.priority?.toLowerCase()] || 0);
          }
          default: return 0;
        }
      });
  }, [tasks, sortBy, isHR, userId]);

  return (
    <div className={CT_CLASSES.page}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            <CheckCircle className="text-emerald-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="truncate text-xl">Completed Tasks</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${isAdmin ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                isHR ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
              {isAdmin ? 'Admin' : isHR ? 'HR' : 'Staff'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7 truncate">
            {canManage ? 'Reviewing all finalized tasks and team milestones' : 'Browse your history of completed tasks and achievements'}
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

      {/* Sort Bar */}
      <div className={CT_CLASSES.sortContainer}>
        <div className={`${CT_CLASSES.sortBox} mb-8`}>
          <div className={CT_CLASSES.filterLabel}>
            <Filter className="w-4 h-4 text-emerald-400" />
            <span className="text-xs md:text-sm">Sort by:</span>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={CT_CLASSES.select}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
          <div className={CT_CLASSES.btnGroup}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortBy(opt.id)}
                className={[CT_CLASSES.btnBase, sortBy === opt.id ? CT_CLASSES.btnActive : CT_CLASSES.btnInactive].join(' ')}
              >
                <span className="relative z-10 flex items-center gap-1">{opt.icon} {opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {sortedCompletedTasks.length === 0 ? (
          <div className={CT_CLASSES.emptyState}>
            <div className={CT_CLASSES.emptyIconWrapper}>
              <CheckCircle className="w-6 h-6 md:w-8 md:h-8 text-emerald-400" />
            </div>
            <h3 className={CT_CLASSES.emptyTitle}>No Completed Tasks Yet!</h3>
            <p className={CT_CLASSES.emptyText}>
              {canManage
                ? 'Completed tasks from your team will appear here.'
                : 'Tasks you complete will show up here. Claim a task and get started!'}
            </p>
          </div>
        ) : (
          sortedCompletedTasks.map(task => (
              <TaskItem
                key={task._id}
                task={task}
                onRefresh={refreshTasks}
                userRole={userRole}
                showCompleteCheckbox={false}
                onDelete={() => softDeleteTask(task._id || task.id)}
              />
          ))
        )}
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

export default CompletedPage;