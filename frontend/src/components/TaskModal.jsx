import { AlignLeft, Calendar, Flag, PlusCircle, Save, X, PlayCircle, Zap } from 'lucide-react'
import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const API_BASE = 'http://localhost:4000/api/tasks'

const DEFAULT_TASK = {
  title: '',
  description: '',
  priority: 'Low',
  dueDate: '',
  rewardPoints: 100,
  status: 'unclaimed',
  id: null,
}

const baseControlClasses =
  'w-full px-4 py-2.5 border border-white/10 bg-slate-900/50 text-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm placeholder-slate-500';

const priorityStyles = {
  Low: 'bg-green-500/10 text-green-400 border-green-500/20',
  Medium: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  High: 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20',
};

// ─── Staff-only: Status Update Modal ─────────────────────────────────────────
const StatusUpdateModal = ({ isOpen, onClose, task, onSave }) => {
  const [status, setStatus] = useState(task?.status || 'in-progress');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) setStatus(task?.status || 'in-progress');
  }, [isOpen, task]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/${task._id}/gp`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (resp.ok) {
        const data = await resp.json();
        onSave?.(data.task);
        onClose();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl max-w-sm w-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
              Update Task Status
            </span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-slate-400 mb-4 truncate font-medium">{task?.title}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-1">
              <PlayCircle className="w-4 h-4 text-cyan-400" /> Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
                { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
              ].map(({ value, label, color }) => (
                <label key={value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    value={value}
                    checked={status === value}
                    onChange={(e) => setStatus(e.target.value)}
                    className="hidden"
                  />
                  <span className={`flex items-center justify-center w-full border-2 rounded-lg py-2 text-sm font-semibold transition-all ${status === value ? color + ' border-current' : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800'
                    }`}>
                    {label}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-[0_8px_30px_rgba(34,211,238,0.3)] hover:-translate-y-0.5 hover:scale-[1.02] hover:animate-text-shimmer transition-all"
          >
            {loading ? 'Saving…' : <><Save className="w-4 h-4" /> Save Status</>}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ─── HR: Full Task Create/Edit Modal ──────────────────────────────────────────
const TaskModal = ({ isOpen, onClose, taskToEdit, onSave, onLogout, userRole }) => {
  const isHR = userRole === 'hr';

  // Staff uses the simpler StatusUpdateModal
  if (!isHR && taskToEdit) {
    return <StatusUpdateModal isOpen={isOpen} onClose={onClose} task={taskToEdit} onSave={onSave} />;
  }

  // If not HR and no task (shouldn't happen), render nothing
  if (!isHR) return null;

  return <HRTaskModal isOpen={isOpen} onClose={onClose} taskToEdit={taskToEdit} onSave={onSave} onLogout={onLogout} />;
};

// ─── HR Create/Edit Modal ─────────────────────────────────────────────────────
const HRTaskModal = ({ isOpen, onClose, taskToEdit, onSave, onLogout }) => {
  const [taskData, setTaskData] = useState(DEFAULT_TASK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isOpen) return;
    if (taskToEdit) {
      setTaskData({
        ...DEFAULT_TASK,
        title: taskToEdit.title || '',
        description: taskToEdit.description || '',
        priority: taskToEdit.priority || 'Low',
        dueDate: taskToEdit.dueDate?.split('T')[0] || '',
        rewardPoints: taskToEdit.rewardPoints || 100,
        status: taskToEdit.status || 'unclaimed',
        id: taskToEdit._id,
      });
    } else {
      setTaskData(DEFAULT_TASK);
    }
    setError(null);
  }, [isOpen, taskToEdit]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({ ...prev, [name]: value }));
  }, []);

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No auth token');
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (taskData.dueDate < today) {
      setError('Due date cannot be in the past.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const isEdit = Boolean(taskData.id);
      const url = isEdit ? `${API_BASE}/${taskData.id}/gp` : `${API_BASE}/gp`;
      const resp = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: getHeaders(),
        body: JSON.stringify(taskData),
      });
      if (!resp.ok) {
        if (resp.status === 401) return onLogout?.();
        const err = await resp.json();
        throw new Error(err.message || 'Failed to save task');
      }
      const saved = await resp.json();
      onSave?.(saved);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [taskData, today, getHeaders, onLogout, onSave, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl max-w-md w-full shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative p-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {taskData.id ? <Save className="text-cyan-400 w-6 h-6" /> : <PlusCircle className="text-cyan-400 w-6 h-6" />}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500">
              {taskData.id ? 'Edit Task' : 'Create New Task'}
            </span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Task Title *</label>
            <input
              type="text"
              name="title"
              value={taskData.title}
              onChange={handleChange}
              className={baseControlClasses}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-slate-300 mb-1">
              <AlignLeft className="w-4 h-4 text-cyan-400" /> Description
            </label>
            <textarea
              name="description"
              rows="3"
              onChange={handleChange}
              value={taskData.description}
              className={baseControlClasses}
              placeholder="Add details about this task"
            />
          </div>

          {/* Priority + Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-slate-300 mb-1">
                <Flag className="w-4 h-4 text-cyan-400" /> Priority
              </label>
              <select
                name="priority"
                value={taskData.priority}
                onChange={handleChange}
                className={`${baseControlClasses} ${priorityStyles[taskData.priority]}`}
              >
                <option value="Low" className="bg-slate-800 text-slate-200">Low</option>
                <option value="Medium" className="bg-slate-800 text-slate-200">Medium</option>
                <option value="High" className="bg-slate-800 text-slate-200">High</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-300 mb-1">
                <Calendar className="w-4 h-4 text-cyan-400" /> Due Date *
              </label>
              <input
                type="date"
                name="dueDate"
                required
                min={today}
                value={taskData.dueDate}
                onChange={handleChange}
                className={baseControlClasses}
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Reward Points */}
          <div>
            <label className="flex items-center gap-1 text-sm font-medium text-slate-300 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" /> Reward Points
            </label>
            <input
              type="number"
              name="rewardPoints"
              value={taskData.rewardPoints}
              onChange={handleChange}
              className={baseControlClasses}
              placeholder="e.g. 100"
              min="0"
              required
            />
          </div>

          {/* HR: Status (only when editing) */}
          {taskData.id && (
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-slate-300 mb-2">
                <PlayCircle className="w-4 h-4 text-cyan-400" /> Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'unclaimed', label: 'Unclaimed', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                  { value: 'in-progress', label: 'In Progress', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
                  { value: 'completed', label: 'Completed', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
                ].map(({ value, label, color }) => (
                  <label key={value} className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value={value}
                      checked={taskData.status === value}
                      onChange={handleChange}
                      className="hidden"
                    />
                    <span className={`w-full text-center px-2 py-2 border rounded-lg text-xs font-semibold cursor-pointer transition-all ${taskData.status === value
                        ? color + ' border-current'
                        : 'bg-slate-800/50 text-slate-400 border-white/10 hover:bg-slate-800'
                      }`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-[1.02] hover:animate-text-shimmer transition-all duration-300"
          >
            {loading ? 'Saving…' : (
              taskData.id
                ? <><Save className="w-4 h-4" /> Update Task</>
                : <><PlusCircle className="w-4 h-4" /> Create Task</>
            )}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default TaskModal;