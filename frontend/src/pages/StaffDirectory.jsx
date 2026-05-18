import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useOutletContext, Navigate } from 'react-router-dom';
import { Users, KeyRound, Mail, Loader2, Search, ShieldAlert, CheckCircle2, XCircle, ShieldCheck, UserCheck, Plus, Briefcase } from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { toast } from 'react-toastify';

const StaffDirectory = () => {
  const context = useOutletContext();
  const { userRole, currentUser, tasks, users: allUsers } = context;

  // Debug log to ensure context is received
  console.log('StaffDirectory Context:', { userRole, hasUser: !!currentUser });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'my-team'

  // Password Reset Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Only HR and Admin can access this page
  if (userRole !== 'hr' && userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setUsers(data.users);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch staff directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleApproval = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.post(
        `${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/users/approve`,
        { userId, approve: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(data.message);
        setUsers(users.map(u => u._id === userId ? { ...u, isApproved: !currentStatus } : u));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update approval status');
    }
  };

  const handleAssignHR = async (staffId, hrId) => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(
        `${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/users/${staffId}/assign-hr`,
        { userId: staffId, hrId: hrId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        toast.success(hrId ? "Staff assigned successfully" : "Staff unallocated successfully");
        // Update local state to reflect change
        setUsers(prev => prev.map(u => {
          if (u._id === staffId) {
            const hrObj = users.find(h => h._id === hrId);
            return { ...u, assignedHR: hrId ? { _id: hrId, name: hrObj?.name } : null };
          }
          return u;
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update assignment');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setResetMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    try {
      setIsResetting(true);
      setResetMessage({ type: '', text: '' });
      const token = localStorage.getItem('token');

      const { data } = await axios.put(
        `${import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:4000/api'}/users/${selectedUser._id}/reset-password`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        setResetMessage({ type: 'success', text: data.message });
        setNewPassword('');
        setTimeout(() => {
          setSelectedUser(null);
          setResetMessage({ type: '', text: '' });
        }, 3000);
      }
    } catch (err) {
      setResetMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reset password' });
    } finally {
      setIsResetting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (!u) return false;

      const name = u.name || '';
      const email = u.email || '';
      const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filter === 'pending') return !u.isApproved;
      if (filter === 'approved') return !!u.isApproved;

      if (filter === 'my-team') {
        const myId = currentUser?.id || currentUser?._id;
        if (!myId) return false;

        const assignedHrId = u.assignedHR?._id || u.assignedHR;
        if (!assignedHrId) return false;

        return u.role === 'staff' && assignedHrId.toString() === myId.toString();
      }

      return true; // 'all'
    });
  }, [users, searchQuery, filter, currentUser]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-slate-200 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="text-cyan-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="truncate text-xl">{userRole === 'admin' ? 'System Directory' : 'Staff Directory'}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${userRole === 'admin' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
              userRole === 'hr' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
              {userRole === 'admin' ? 'Admin' : userRole === 'hr' ? 'HR' : 'Staff'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7">
            {userRole === 'admin' ? 'Approve HR/Staff and manage all accounts.' : 'Approve Staff and manage staff accounts.'}
          </p>
        </div>

        {/* Create Task Button - HR only */}
        {userRole === 'hr' && (
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 w-full md:w-auto justify-center text-sm font-semibold group border border-white/20"
          >
            <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
            Create Task
          </button>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 flex flex-col gap-6">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-80 pl-10 pr-4 py-2 bg-slate-900/50 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-t border-white/5 pt-4">
          {['all', 'pending', 'approved', 'my-team'].map((f) => {
            if (f === 'my-team' && userRole !== 'hr') return null;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all ${filter === f
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1).replace('-', ' ')} {f === 'pending' && users.filter(u => !u.isApproved).length > 0 && (
                  <span className="ml-1.5 bg-red-500 text-white px-1.5 py-0.5 rounded-full text-[10px]">
                    {users.filter(u => !u.isApproved).length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Directory List */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-cyan-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm font-medium">Loading directory...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-red-400">
            <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-semibold">Access Denied or Error</p>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned HR / Team</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                      No users found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => {
                    const canApprove = userRole === 'admin' || (userRole === 'hr' && u.role === 'staff');
                    const teamSize = u.role === 'hr' ? users.filter(s => s.assignedHR?._id === u._id || s.assignedHR === u._id).length : 0;
                    return (
                      <tr key={u._id} className={`group hover:bg-white/5 transition-all duration-300 animate-fade-in delay-${(idx % 8) + 1}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${u.role === 'admin' ? 'bg-gradient-to-br from-red-500 to-orange-600' :
                              u.role === 'hr' ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600' :
                                'bg-gradient-to-br from-cyan-500 to-blue-600'
                              }`}>
                              {u.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-100">{u.name}</p>
                              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3" /> {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${u.role === 'admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                            u.role === 'hr' ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30' :
                              'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            }`}>
                            {u.role === 'admin' ? <ShieldCheck className="w-3 h-3" /> : u.role === 'hr' ? <ShieldCheck className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                            {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {u.isApproved ? (
                              <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 className="w-4 h-4" /> Approved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                                <XCircle className="w-4 h-4" /> Pending
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {u.role === 'staff' ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Assigned HR / Team</span>
                              {userRole === 'admin' ? (
                                <select
                                  value={u.assignedHR?._id || ''}
                                  onChange={(e) => handleAssignHR(u._id, e.target.value)}
                                  className="text-xs bg-slate-900/50 border border-white/10 rounded px-2 py-1 text-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer"
                                >
                                  <option value="">Unallocated</option>
                                  {users.filter(hr => hr.role === 'hr' && hr.isApproved).map(hr => (
                                    <option key={hr._id} value={hr._id}>{hr.name}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="text-sm font-medium text-cyan-400">
                                  {u.assignedHR?.name || 'Unallocated'}
                                </span>
                              )}
                            </div>
                          ) : u.role === 'hr' ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Team Size</span>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 w-16 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${teamSize >= 10 ? 'bg-red-500' : 'bg-cyan-500'}`}
                                    style={{ width: `${(teamSize / 10) * 100}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-bold ${teamSize >= 10 ? 'text-red-400' : 'text-slate-400'}`}>
                                  {teamSize}/10
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canApprove && (
                              <button
                                onClick={() => handleToggleApproval(u._id, u.isApproved)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${u.isApproved
                                  ? 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                                  : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                  }`}
                              >
                                {u.isApproved ? <XCircle className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                {u.isApproved ? 'Revoke' : 'Approve'}
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedUser(u)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 rounded-lg transition-all border border-cyan-500/20 hover:border-cyan-500/40"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              Reset
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-1">
                <KeyRound className="w-5 h-5 text-cyan-400" />
                Reset Password
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                You are forcing a password reset for <span className="font-semibold text-slate-200">{selectedUser.name}</span>.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    New Temporary Password
                  </label>
                  <input
                    type="text"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 8 characters..."
                    className="w-full px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-slate-800 transition-all"
                  />
                </div>

                {resetMessage.text && (
                  <div className={`p-3 rounded-lg text-sm font-medium ${resetMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {resetMessage.text}
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => { setSelectedUser(null); setResetMessage({ type: '', text: '' }); setNewPassword(''); }}
                    className="flex-1 px-4 py-2 bg-white/5 text-slate-300 rounded-lg hover:bg-white/10 font-semibold transition-all border border-white/5"
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting || !newPassword}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white rounded-lg hover:shadow-[0_8px_30px_rgba(34,211,238,0.3)] hover:-translate-y-0.5 hover:animate-text-shimmer font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 border border-white/10"
                  >
                    {isResetting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Reset'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <TaskModal
        isOpen={showTaskModal || !!selectedTask}
        onClose={() => { setShowTaskModal(false); setSelectedTask(null); }}
        taskToEdit={selectedTask}
        onSave={() => { context.refreshTasks && context.refreshTasks(); }}
        userRole={userRole}
      />
    </div>
  );
};

export default StaffDirectory;
