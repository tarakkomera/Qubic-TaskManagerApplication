import React, { useEffect, useState } from 'react';
import { CheckCircle, MoreVertical, Edit2, Trash2, Calendar, Clock, UserCheck, ArrowRight, Zap } from 'lucide-react';
import axios from 'axios';
import { format, isToday } from 'date-fns';
import TaskModal from './TaskModal';

const API_BASE = 'http://localhost:4000/api/tasks';

const getPriorityColor = (priority) => {
  const colors = {
    low: 'border-green-500/50 bg-green-500/10',
    medium: 'border-purple-500/50 bg-purple-500/10',
    high: 'border-fuchsia-500/50 bg-fuchsia-500/10',
  };
  return colors[priority?.toLowerCase()] || 'border-white/20 bg-white/5';
};

const getPriorityBadgeColor = (priority) => {
  const colors = {
    low: 'bg-green-500/20 text-green-300 border border-green-500/30',
    medium: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    high: 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30',
  };
  return colors[priority?.toLowerCase()] || 'bg-white/10 text-slate-300 border border-white/20';
};

const getStatusBadge = (status) => {
  const map = {
    unclaimed: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    'in-progress': 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
    completed: 'bg-green-500/20 text-green-300 border border-green-500/30',
  };
  return map[status] || 'bg-white/10 text-slate-300 border border-white/20';
};

const getStatusLabel = (status) => {
  const map = {
    unclaimed: 'Unclaimed',
    'in-progress': 'In Progress',
    completed: 'Completed',
  };
  return map[status] || status;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No auth token');
  return { Authorization: `Bearer ${token}` };
};

// ─────────────────────────────────────────────────────────────────────────────
const TaskItem = ({ task, onEdit, onDelete, onRefresh, userRole, showCompleteCheckbox = false, onLogout }) => {
  const isHR = userRole === 'hr';
  const userId = localStorage.getItem('userId');

  const isCompleted = task.status === 'completed' || task.completed === true ||
    (typeof task.completed === 'string' && task.completed.toLowerCase() === 'yes');

  const isUnclaimed = task.status === 'unclaimed';
  const claimedByMe = task.claimedBy?._id === userId || task.claimedBy === userId;

  const [showMenu, setShowMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [updating, setUpdating] = useState(false);

  // ─── HR: toggle completed ──────────────────────────────────────────────────
  const handleComplete = async () => {
    if (!isHR) return;
    const newStatus = isCompleted ? 'in-progress' : 'completed';
    try {
      await axios.put(`${API_BASE}/${task._id}/gp`,
        { status: newStatus, completed: !isCompleted },
        { headers: getAuthHeaders() }
      );
      onRefresh?.();
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  };

  // ─── HR: edit / delete ────────────────────────────────────────────────────
  const handleAction = (action) => {
    setShowMenu(false);
    if (action === 'edit') onEdit?.();
    if (action === 'delete') onDelete?.();
  };

  const handleSave = async (updatedTask) => {
    try {
      await axios.put(`${API_BASE}/${task._id}/gp`, updatedTask, { headers: getAuthHeaders() });
      setShowEditModal(false);
      onRefresh?.();
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    }
  };

  // ─── Staff: claim task ────────────────────────────────────────────────────
  const handleClaim = async () => {
    setClaiming(true);
    try {
      await axios.patch(`${API_BASE}/${task._id}/claim`, {}, { headers: getAuthHeaders() });
      onRefresh?.();
    } catch (err) {
      console.error('Claim error:', err);
    } finally {
      setClaiming(false);
    }
  };

  // ─── Staff: update status of their own task ───────────────────────────────
  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await axios.put(`${API_BASE}/${task._id}/gp`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      onRefresh?.();
    } catch (err) {
      if (err.response?.status === 401) onLogout?.();
    } finally {
      setUpdating(false);
    }
  };

  const borderColor = isCompleted
    ? 'border-green-500'
    : (getPriorityColor(task.priority).split(' ')[0]);

  return (
    <>
      <div className={`group p-4 sm:p-5 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] bg-white/5 backdrop-blur-md border-l-4 border-y border-r hover:shadow-[0_8px_30px_rgba(34,211,238,0.2)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 ease-out border-white/10 ${borderColor}`}>
        <div className="flex items-start gap-3">

          {/* HR checkbox */}
          {isHR && showCompleteCheckbox && (
            <button
              onClick={handleComplete}
              className={`mt-0.5 p-1.5 rounded-full hover:bg-white/10 transition-colors ${isCompleted ? 'text-green-400' : 'text-slate-500'}`}
            >
              <CheckCircle className={`w-5 h-5 ${isCompleted ? 'fill-green-500 text-green-500' : ''}`} />
            </button>
          )}

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`text-base font-medium truncate transition-all duration-300 ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-200 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-teal-400 group-hover:via-cyan-500 group-hover:to-blue-400 group-hover:animate-text-shimmer group-hover:bg-[length:200%_auto] group-hover:tracking-wide'}`}>
                {task.title}
              </h3>
              {task.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${getPriorityBadgeColor(task.priority)}`}>
                  {task.priority}
                </span>
              )}
              {/* Status badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium ${getStatusBadge(task.status)}`}>
                {getStatusLabel(task.status)}
              </span>
              {/* Reward points badge */}
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1 font-semibold">
                <Zap className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                {task.rewardPoints || 100} pts
              </span>
            </div>

            {task.description && (
              <p className="text-sm text-slate-400 truncate">{task.description}</p>
            )}


            {/* Staff actions — only on unclaimed or their own task */}
            {!isHR && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {isUnclaimed && (
                  <button
                    onClick={handleClaim}
                    disabled={claiming}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {claiming ? 'Claiming…' : <><UserCheck className="w-3.5 h-3.5" /> Claim Task</>}
                  </button>
                )}

                {claimedByMe && !isCompleted && (
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={updating}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-green-500 to-teal-600 text-white text-xs font-semibold rounded-lg hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {updating ? 'Saving…' : <><CheckCircle className="w-3.5 h-3.5" /> Mark Complete</>}
                  </button>
                )}

                {claimedByMe && isCompleted && (
                  <button
                    onClick={() => handleStatusUpdate('in-progress')}
                    disabled={updating}
                    className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-700 border border-yellow-300 text-xs font-semibold rounded-lg hover:bg-yellow-200 transition-all disabled:opacity-60"
                  >
                    {updating ? 'Saving…' : <><ArrowRight className="w-3.5 h-3.5" /> Undo Complete</>}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* HR: edit/delete menu */}
            {isHR && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-cyan-300 transition-colors">
                  <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-slate-800 border border-slate-700 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-20 overflow-hidden">
                    <button onClick={() => handleAction('edit')} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 transition-colors text-slate-200">
                      <Edit2 size={14} className="text-cyan-400" /> Edit Task
                    </button>
                    <button onClick={() => handleAction('delete')} className="w-full px-4 py-2 text-left text-sm hover:bg-red-500/10 flex items-center gap-2 transition-colors text-slate-200">
                      <Trash2 size={14} className="text-red-400" /> Delete Task
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Claimed by - right corner */}
            {(isHR || userRole === 'admin') && task.claimedBy && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5 whitespace-nowrap">
                <UserCheck className="w-3 h-3" />
                {task.claimedBy.name || task.claimedBy.email || 'Someone'}
              </span>
            )}

            {/* Date info */}
            <div className="flex flex-col items-end gap-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${task.dueDate && isToday(new Date(task.dueDate)) ? 'text-blue-400' : 'text-cyan-400'
                }`}>
                <Calendar className="w-3.5 h-3.5" />
                {task.dueDate
                  ? (isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM dd'))
                  : '-'}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                <Clock className="w-3 h-3" />
                {task.createdAt ? `Created ${format(new Date(task.createdAt), 'MMM dd')}` : 'No date'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal — HR only */}
      {isHR && (
        <TaskModal
          isOpen={showEditModal}
          taskToEdit={task}
          onSave={handleSave}
          onClose={() => setShowEditModal(false)}
          userRole={userRole}
        />
      )}
    </>
  );
};

export default TaskItem;