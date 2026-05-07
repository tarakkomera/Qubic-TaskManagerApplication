import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import {
  Trophy, Target, Zap, TrendingUp, Calendar,
  Award, Star, Activity, CheckCircle, ChevronDown, User as UserIcon, Users, X, Plus
} from 'lucide-react';
import TaskModal from '../components/TaskModal';
import { format, subDays, isSameDay } from 'date-fns';

const Performance = () => {
  const { tasks, currentUser, userRole, refreshTasks } = useOutletContext();
  const isAdminOrHR = userRole === 'admin' || userRole === 'hr';

  const [allUsers, setAllUsers] = useState([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(isAdminOrHR ? 'all' : (currentUser?.id || currentUser?._id));
  const [selectedUser, setSelectedUser] = useState(isAdminOrHR ? null : currentUser);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    if (isAdminOrHR) {
      const fetchAll = async () => {
        try {
          const { data } = await axios.get('http://localhost:4000/api/users', {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          });
          if (data.success) {
            // Leaderboard should show everyone (approved)
            setLeaderboardUsers(data.users.filter(u => u.isApproved));

            // Selection dropdown should only show staff assigned to this HR (or all staff for admin)
            const filtered = data.users.filter(u => {
              if (userRole === 'admin') return u.role?.toLowerCase() === 'staff';
              return u.role?.toLowerCase() === 'staff' &&
                (u.assignedHR?._id === (currentUser?.id || currentUser?._id) || u.assignedHR === (currentUser?.id || currentUser?._id));
            });
            setAllUsers(filtered);
          }
        } catch (err) {
          console.error("Failed to fetch users", err);
        }
      };
      fetchAll();
    }
  }, [isAdminOrHR, currentUser?.id, currentUser?._id, userRole]);

  useEffect(() => {
    if (selectedUserId === 'all') {
      setSelectedUser(null);
    } else if (selectedUserId === currentUser?.id || selectedUserId === currentUser?._id) {
      setSelectedUser(currentUser);
    } else {
      const found = leaderboardUsers.find(u => (u._id || u.id) === selectedUserId);
      if (found) setSelectedUser(found);
    }
  }, [selectedUserId, allUsers, leaderboardUsers, currentUser]);

  // Filter tasks based on selection
  const targetCompletedTasks = useMemo(() => {
    const completed = tasks.filter(t => t.status?.toLowerCase() === 'completed' || t.completed === true);
    if (selectedUserId === 'all') {
      // Aggregated view: only tasks claimed by staff
      const staffIds = new Set(allUsers.map(u => u._id || u.id));
      return completed.filter(t => staffIds.has(t.claimedBy?._id || t.claimedBy));
    }
    // Individual view
    return completed.filter(t => (t.claimedBy?._id === selectedUserId || t.claimedBy === selectedUserId));
  }, [tasks, selectedUserId, allUsers]);

  // Points breakdown
  const stats = useMemo(() => {
    let totalPoints = 0;
    if (selectedUserId === 'all') {
      totalPoints = allUsers.reduce((sum, u) => sum + (u.points || 0), 0);
    } else {
      totalPoints = selectedUser?.points || 0;
    }

    const completedCount = targetCompletedTasks.length;
    const avgPoints = completedCount > 0 ? Math.round(totalPoints / completedCount) : 0;

    return {
      totalPoints,
      completedCount,
      avgPoints,
      rank: selectedUserId === 'all' ? 'Team' : (totalPoints > 1000 ? 'Gold' : totalPoints > 500 ? 'Silver' : 'Bronze')
    };
  }, [targetCompletedTasks, selectedUser, selectedUserId, allUsers]);

  // Prepare data for "Tasks Completed over last 7 days"
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const count = targetCompletedTasks.filter(t => {
        const compDate = t.completedAt || (t.status?.toLowerCase() === 'completed' ? t.updatedAt : null);
        return compDate && isSameDay(new Date(compDate), date);
      }).length;
      data.push({
        name: format(date, 'MMM dd'),
        tasks: count
      });
    }
    return data;
  }, [targetCompletedTasks]);

  // Priority breakdown
  const priorityData = useMemo(() => {
    const high = targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'high').length;
    const medium = targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'medium').length;
    const low = targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'low').length;
    return [
      { name: 'High', value: high, color: '#f43f5e' },
      { name: 'Medium', value: medium, color: '#fbbf24' },
      { name: 'Low', value: low, color: '#34d399' },
    ].filter(d => d.value > 0);
  }, [targetCompletedTasks]);

  return (
    <div className="p-4 md:p-6 min-h-screen overflow-y-auto custom-scrollbar animate-fade-in space-y-10 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 animate-slide-up">
        <div className="min-w-0">
          <h1 className="text-xl md:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Trophy className="text-yellow-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            <span className="truncate text-xl">Performance Insights</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-1 border ${isAdminOrHR ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              }`}>
              {isAdminOrHR ? 'Management' : 'Personal'}
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-7 truncate">
            {isAdminOrHR
              ? (selectedUserId === 'all' ? 'Monitoring overall team productivity and aggregate metrics' : `Viewing detailed performance insights for ${selectedUser?.name}`)
              : 'Track your growth, earn points, and climb the ranks'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          {/* User Selector for Admin/HR */}
          {isAdminOrHR && (
            <div className="relative group min-w-[200px]">
              <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-cyan-400 transition-colors" />
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-900/50 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all hover:bg-slate-800"
              >
                <option value="all">📊 All Team Members</option>
                <optgroup label="Personal">
                  <option value={currentUser?.id || currentUser?._id}>👤 Me ({currentUser?.name})</option>
                </optgroup>
                <optgroup label="Staff Team">
                  {allUsers.map(u => (
                    <option key={u._id || u.id} value={u._id || u.id}>{u.name}</option>
                  ))}
                </optgroup>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-cyan-400 transition-colors" />
            </div>
          )}

          {/* Create Task Button - HR only */}
          {userRole === 'hr' && (
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1 bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-105 hover:animate-text-shimmer transition-all duration-300 justify-center text-sm font-semibold group border border-white/20"
            >
              <Plus size={18} className="transition-transform duration-300 group-hover:rotate-90" />
              Create Task
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 animate-slide-up delay-1">
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <Award className={`w-5 h-5 ${stats.rank === 'Gold' ? 'text-yellow-400' : stats.rank === 'Silver' ? 'text-slate-300' : 'text-orange-500'}`} />
          <span className="text-sm font-bold uppercase tracking-wider">{stats.rank} Level</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-slide-up delay-1">
        <StatCard icon={<Trophy className="text-yellow-400" />} label="Total Points" value={stats.totalPoints} color="yellow" />
        <StatCard icon={<CheckCircle className="text-emerald-400" />} label="Completed" value={stats.completedCount} color="emerald" />
        <StatCard icon={<Zap className="text-cyan-400" />} label="Avg Points" value={stats.avgPoints} color="cyan" />
        <StatCard icon={<Activity className="text-purple-400" />} label="Daily Goal" value="85%" color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl animate-scale-in delay-2">
          <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Completion Progression (Last 7 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                  itemStyle={{ color: '#22d3ee' }}
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="#22d3ee"
                  strokeWidth={3}
                  dot={{ fill: '#22d3ee', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Pie */}
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl animate-scale-in delay-3">
          <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-rose-400" />
            Task Focus
          </h3>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1500}
                >
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-white">{stats.completedCount}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest">Tasks</span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {priorityData.map((d) => (
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-sm text-slate-400">{d.name} Priority</span>
                </div>
                <span className="text-sm font-bold text-slate-200">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Comparison / Breakdown Chart */}
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl animate-scale-in delay-4">
        <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
          {selectedUserId === 'all' ? (
            <><Users className="w-5 h-5 text-indigo-400" /> Team Progression Overview</>
          ) : (
            <><Activity className="w-5 h-5 text-cyan-400" /> {selectedUser?.name}'s Priority Breakdown</>
          )}
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {selectedUserId === 'all' ? (
              <BarChart data={allUsers
                .map(u => ({
                  name: u.name?.split(' ')[0] || 'User',
                  completed: tasks.filter(t => (t.status?.toLowerCase() === 'completed' || t.completed === true) && (t.claimedBy?._id === (u._id || u.id) || t.claimedBy === (u._id || u.id))).length,
                  points: u.points || 0
                }))
                .sort((a, b) => b.completed - a.completed)
                .slice(0, 10)
              }>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-[#0f172a] border border-white/20 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                          <p className="text-cyan-400 font-bold mb-1">{data.name}</p>
                          <div className="space-y-1">
                            <p className="text-[10px] text-slate-400 flex justify-between gap-4">
                              <span>Completed:</span>
                              <span className="text-white font-bold">{data.completed}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 flex justify-between gap-4">
                              <span>Points:</span>
                              <span className="text-yellow-400 font-bold">{data.points}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="completed" radius={[6, 6, 0, 0]} barSize={35}>
                  {allUsers.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={['#22d3ee', '#818cf8', '#34d399', '#f43f5e', '#fbbf24'][idx % 5]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <BarChart data={[
                { name: 'High', completed: targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'high').length, color: '#f43f5e' },
                { name: 'Medium', completed: targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'medium').length, color: '#fbbf24' },
                { name: 'Low', completed: targetCompletedTasks.filter(t => t.priority?.toLowerCase() === 'low').length, color: '#34d399' },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                />
                <Bar dataKey="completed" radius={[6, 6, 0, 0]} barSize={60}>
                  <Cell fill="#f43f5e" />
                  <Cell fill="#fbbf24" />
                  <Cell fill="#34d399" />
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-slate-500 mt-4 text-center italic">
          {selectedUserId === 'all' ? 'Comparing top performers in your allocated team.' : `Volume of tasks completed by ${selectedUser?.name} per priority level.`}
        </p>
      </div>

      {/* Recent Achievements */}
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl animate-slide-up delay-5">
        <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          Recent Milestones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AchievementCard
            title="Task Master"
            desc="Completed 5 tasks in a single day"
            date="Today"
            active={stats.completedCount >= 5}
            onClick={() => setSelectedMilestone({
              title: "Task Master",
              desc: "Completed 5+ tasks in a single day",
              tasks: targetCompletedTasks.filter(t => isSameDay(new Date(t.completedAt), new Date()))
            })}
          />
          <AchievementCard
            title="Points Legend"
            desc="Reached 1000 total reward points"
            date="In Progress"
            active={stats.totalPoints >= 1000}
            onClick={() => setSelectedMilestone({
              title: "Points Legend",
              desc: "You have reached 1000+ total reward points across all tasks.",
              data: { label: "Total Points", value: stats.totalPoints }
            })}
          />
          <AchievementCard
            title="Efficiency King"
            desc="Average task completion < 24h"
            date="Unlocked"
            active={true}
            onClick={() => setSelectedMilestone({
              title: "Efficiency King",
              desc: "Your average task completion time is consistently under 24 hours.",
              data: { label: "Performance Score", value: "A+" }
            })}
          />
        </div>
      </div>

      {/* Milestone Detail Modal */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-cyan-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <Award className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selectedMilestone.title}</h3>
                  <p className="text-xs text-slate-400">{selectedMilestone.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {selectedMilestone.tasks && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Contributing Tasks</h4>
                  {selectedMilestone.tasks.length > 0 ? selectedMilestone.tasks.map(t => (
                    <div key={t._id} className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-200 truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-500">Completed at: {format(new Date(t.completedAt), 'HH:mm')}</p>
                      </div>
                      <div className="text-xs font-bold text-cyan-400">+{t.rewardPoints}pts</div>
                    </div>
                  )) : (
                    <p className="text-center py-8 text-sm text-slate-500 italic">No task data available for this milestone.</p>
                  )}
                </div>
              )}

              {selectedMilestone.data && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/20 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
                    <TrendingUp className="w-10 h-10 text-cyan-400" />
                  </div>
                  <p className="text-sm text-slate-400 mb-1">{selectedMilestone.data.label}</p>
                  <p className="text-4xl font-black text-white bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent">
                    {selectedMilestone.data.value}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-white/5 border-t border-white/5 text-center">
              <button
                onClick={() => setSelectedMilestone(null)}
                className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-slate-200 transition-all"
              >
                Close Insights
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Leaderboard - Admin/HR Only */}
      {isAdminOrHR && (
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl overflow-hidden animate-slide-up delay-6">
          <h3 className="text-lg font-bold text-slate-100 mb-6 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Global Performance Leaderboard
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {leaderboardUsers
                  .filter(u => u.role === 'staff')
                  .sort((a, b) => (b.points || 0) - (a.points || 0))
                  .slice(0, 10)
                  .map((u, idx) => (
                    <tr
                      key={u._id || u.id}
                      className={`hover:bg-white/5 transition-colors cursor-pointer group animate-fade-in delay-${(idx % 8) + 1} ${selectedUserId === (u._id || u.id) ? 'bg-cyan-500/10' : ''}`}
                      onClick={() => setSelectedUserId(u._id || u.id)}
                    >
                      <td className="px-4 py-4">
                        <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-bold transition-transform group-hover:scale-110 ${idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                          idx === 1 ? 'bg-slate-300/20 text-slate-300' :
                            idx === 2 ? 'bg-orange-500/20 text-orange-500' :
                              'bg-white/5 text-slate-500'
                          }`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[10px] font-bold">
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-slate-200">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 uppercase text-[10px] font-bold text-slate-500 tracking-widest">{u.role}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-sm font-bold text-cyan-400">{u.points || 0}</span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TaskModal
        isOpen={showTaskModal || !!selectedTask}
        onClose={() => { setShowTaskModal(false); setSelectedTask(null); }}
        taskToEdit={selectedTask}
        onSave={() => { if (typeof refreshTasks === 'function') refreshTasks(); }}
        userRole={userRole}
      />
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg group hover:shadow-[0_0_30px_rgba(34,211,238,0.2)] hover:-translate-y-2 hover:scale-[1.02] transition-all duration-500 overflow-hidden relative">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-${color}-500/5 blur-3xl -mr-8 -mt-8 group-hover:bg-${color}-500/20 transition-all duration-500`}></div>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center border border-${color}-500/20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500 animate-glow`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1 group-hover:text-cyan-300 transition-colors">{label}</p>
        <p className="text-2xl font-bold text-white group-hover:scale-105 transition-transform duration-500 origin-left">{value}</p>
      </div>
    </div>
  </div>
);

const AchievementCard = ({ title, desc, date, active, onClick }) => (
  <div
    onClick={active ? onClick : undefined}
    className={`p-4 rounded-xl border transition-all duration-500 group hover:-translate-y-2 hover:scale-[1.02] cursor-pointer ${active
      ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)] hover:shadow-[0_0_25px_rgba(34,211,238,0.2)]'
      : 'bg-white/5 border-white/10 opacity-60 grayscale cursor-not-allowed'
      }`}>
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 ${active ? 'bg-cyan-500/20 animate-float' : 'bg-white/10'}`}>
        <Award className={`w-6 h-6 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">{title}</h4>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between">
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${active ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-slate-500'}`}>
        {active ? 'Unlocked' : 'Locked'}
      </span>
      <span className="text-[10px] text-slate-500 font-medium">{date}</span>
    </div>
  </div>
);

export default Performance;
