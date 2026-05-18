import React, { useEffect, useMemo, useState, useCallback } from 'react'
import Navbar from './Navbar'
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import { toast, ToastContainer } from 'react-toastify';
import {
  Circle,
  Clock,
  TrendingUp,
  CheckCircle,
  Percent,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from 'lucide-react';

const Layout = ({ onLogout, user, refreshUser }) => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);
  const [isStatsCollapsed, setIsStatsCollapsed] = useState(true);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const location = useLocation();

  useEffect(() => {
    sessionStorage.setItem('isStatsCollapsed', JSON.stringify(isStatsCollapsed));
  }, [isStatsCollapsed]);

  useEffect(() => {
    if (location.pathname === '/kanban') {
      setIsStatsCollapsed(true);
    }
  }, [location.pathname]);

  const fetchTasks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/tasks/gp`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/users`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
      ]);

      const arr = Array.isArray(tasksRes.data) ? tasksRes.data
        : Array.isArray(tasksRes.data?.tasks) ? tasksRes.data.tasks
          : Array.isArray(tasksRes.data?.data) ? tasksRes.data.data : [];

      const usersArr = Array.isArray(usersRes.data) ? usersRes.data
        : Array.isArray(usersRes.data?.users) ? usersRes.data.users : [];

      setTasks(arr);
      setUsers(usersArr);
      if (refreshUser) refreshUser();
    } catch (err) {
      console.error(err);
      if (!silent) setError(err.message || 'Something went wrong');
      if (err.response?.status === 401) onLogout();
    } finally {
      if (!silent) setLoading(false);
    }
  }, [onLogout, refreshUser]);

  useEffect(() => {
    fetchTasks();
    // Real-time polling: Refresh data every 15 seconds
    const intervalId = setInterval(() => {
      fetchTasks(true); // Silent refresh
    }, 15000);

    return () => clearInterval(intervalId);
  }, [fetchTasks]);

  const executeDelete = useCallback(async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/tasks/${taskId}/gp`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(prev => prev.filter(t => t._id !== taskId && t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task permanently:', err);
      if (err.response?.status === 401) onLogout();
    }
  }, [onLogout]);

  const softDeleteTask = useCallback((taskId) => {
    setDeletedIds(prev => new Set([...prev, taskId]));

    const timerId = setTimeout(() => {
      executeDelete(taskId);
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }, 10000);

    const toastId = toast.info(
      <div className="flex items-center justify-between min-w-[200px]">
        <span>Task deleted.</span>
        <button
          onClick={() => {
            clearTimeout(timerId);
            setDeletedIds(prev => {
              const next = new Set(prev);
              next.delete(taskId);
              return next;
            });
            toast.dismiss(toastId);
          }}
          className="ml-4 font-bold text-indigo-600 hover:text-indigo-800 uppercase text-xs tracking-wider"
        >
          Undo
        </button>
      </div>,
      { position: 'bottom-left', autoClose: 10000, closeOnClick: false, draggable: false }
    );
  }, [executeDelete]);

  const visibleTasks = useMemo(() => tasks.filter(t => !deletedIds.has(t._id) && !deletedIds.has(t.id)), [tasks, deletedIds]);

  const stats = useMemo(() => {
    const completeTasks = (visibleTasks || []).filter(
      (t) =>
        t?.completed === true ||
        t?.completed === 1 ||
        (typeof t?.completed === 'string' && t.completed.toLowerCase() === 'yes') ||
        t?.status?.toLowerCase() === 'completed'
    ).length;

    const totalCount = visibleTasks?.length || 0;
    const pendingCount = totalCount - completeTasks;
    const completionPercentage = totalCount
      ? Math.round((completeTasks / totalCount) * 100)
      : 0;

    return {
      totalCount,
      completeTasks,
      pendingCount,
      completionPercentage,
    };
  }, [visibleTasks]);

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className={`bg-${color}-500/10 p-4 rounded-lg border-l-4 border-${color}-500`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 bg-${color}-500/20 text-${color}-400 rounded-lg`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="text-xl font-bold text-slate-100">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loader mb-4" />
      </div>
    );

  if (err)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error Loading tasks</p>
          <p className="text-grey-600 mb-4">{err}</p>
          <button
            onClick={fetchTasks}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-[#0f172a] via-slate-800 to-zinc-900 bg-[length:400%_400%] animate-gradient-xy flex flex-col text-slate-200">
      <ToastContainer />
      <Navbar user={user} onLogout={onLogout} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      {/* Mobile overlay */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <Sidebar
        user={user}
        tasks={visibleTasks}
        isOpen={isSidebarOpen}
        closeSidebar={() => window.innerWidth < 1024 && setIsSidebarOpen(false)}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div
        className={`pt-0 transition-all duration-300 flex-1 flex h-[calc(100vh-64px)] overflow-hidden ${isSidebarOpen ? 'ml-0 md:ml-0 lg:ml-64 xl:ml-64' : 'ml-12'
          }`}
      >
        <div
          className={`transition-all duration-300 h-full flex flex-col overflow-y-auto no-scrollbar ${isStatsCollapsed ? 'w-full' : 'w-full xl:w-8/12 lg:w-8/12'
            }`}
        >
          <div className="p-3 sm:px-4 sm:py-4 md:p-6 flex-1">
            <Outlet context={{ tasks: visibleTasks, users, refreshTasks: fetchTasks, userRole: user?.role || 'staff', softDeleteTask, refreshUser, currentUser: user }} />
          </div>

          <footer className="py-4 text-center text-sm text-slate-500 border-t border-white/10 bg-slate-900/50 backdrop-blur-md mt-auto">
            <p>&copy; {new Date().getFullYear()} Qubic Task Manager. All rights reserved.</p>
            <p className="mt-1 text-xs text-slate-600">
              Built by <span className="text-slate-400 font-semibold">Tarak</span>
              <span className="mx-1.5">·</span>
              <a href="mailto:taraksivakrishna08@gmail.com" className="hover:text-cyan-400 transition-colors">taraksivakrishna08@gmail.com</a>
              <span className="mx-1.5">·</span>
              <a href="tel:+918179170861" className="hover:text-cyan-400 transition-colors">+91 8179170861</a>
            </p>
          </footer>
        </div>

        <div
          className={`bg-slate-900/40 backdrop-blur-xl border-l border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all duration-300 h-full ${isStatsCollapsed
            ? 'w-0 opacity-0 overflow-hidden'
            : 'w-full xl:w-4/12 lg:w-4/12 opacity-100'
            }`}
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-transparent text-slate-200">
            <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              Task Statistics
            </h3>
            <button
              onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-cyan-300"
              title={isStatsCollapsed ? 'Show Statistics' : 'Hide Statistics'}
            >
              {isStatsCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Scrollable content but scrollbar hidden */}
          <div className="p-4 space-y-4 max-h-full overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-500/10 p-4 rounded-lg text-center border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-400">
                  {stats.totalCount}
                </div>
                <div className="text-sm text-blue-300 mt-1">Total</div>
              </div>
              <div className="bg-green-500/10 p-4 rounded-lg text-center border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">
                  {stats.completeTasks}
                </div>
                <div className="text-sm text-green-300 mt-1">Done</div>
              </div>
              <div className="bg-yellow-500/10 p-4 rounded-lg text-center border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-400">
                  {stats.pendingCount}
                </div>
                <div className="text-sm text-yellow-300 mt-1">Pending</div>
              </div>
              <div className="bg-purple-500/10 p-4 rounded-lg text-center border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">
                  {stats.completionPercentage}%
                </div>
                <div className="text-sm text-purple-300 mt-1">Progress</div>
              </div>
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-slate-300">
                  Completion Progress
                </span>
                <span className="text-sm text-slate-400">
                  {stats.completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3">
                <div
                  className="h-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>{stats.completeTasks} completed</span>
                <span>{stats.pendingCount} remaining</span>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-200 border-b border-white/10 pb-2">
                Detailed Overview
              </h4>

              <StatCard
                title="Total Tasks"
                value={stats.totalCount}
                icon={<Circle className="w-5 h-5" />}
                color="blue"
              />
              <StatCard
                title="Completed Tasks"
                value={stats.completeTasks}
                icon={<CheckCircle className="w-5 h-5" />}
                color="green"
              />
              <StatCard
                title="Pending Tasks"
                value={stats.pendingCount}
                icon={<Clock className="w-5 h-5" />}
                color="yellow"
              />
              <StatCard
                title="Completion Rate"
                value={`${stats.completionPercentage}%`}
                icon={<Percent className="w-5 h-5" />}
                color="purple"
              />
            </div>

            <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5">
              <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Recent Activity
              </h4>
              <div className="space-y-3">
                {visibleTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id || task._id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {task.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {task.createdAt
                          ? new Date(task.createdAt).toLocaleDateString()
                          : 'No date'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs rounded-full font-medium ${task.completed
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}
                    >
                      {task.completed ? 'Done' : 'Pending'}
                    </span>
                  </div>
                ))}
                {visibleTasks.length === 0 && (
                  <div className="text-center text-slate-500 py-4">
                    <Clock className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
                    <p className="text-sm">No recent activity</p>
                    <p className="text-xs">Tasks will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating button removed: now integrated into Sidebar */}
      </div>
    </div>
  );
};

export default Layout;
