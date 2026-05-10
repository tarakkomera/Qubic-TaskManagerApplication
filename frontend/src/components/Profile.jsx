import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  ChevronLeft, User, Mail, Save, Shield,
  Lock, LogOut, CheckCircle, Eye, EyeOff, Briefcase, ShieldCheck, Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const InputField = ({ icon: Icon, type, placeholder, value, onChange, required, iconColor = 'text-slate-400' }) => {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus-within:border-cyan-500/50 focus-within:bg-white/8 transition-all duration-200 group">
      <Icon className={`w-4 h-4 shrink-0 ${iconColor} group-focus-within:text-cyan-400 transition-colors`} />
      <input
        type={isPassword && show ? 'text' : type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
      />
      {isPassword && (
        <button type="button" onClick={() => setShow(p => !p)} className="text-slate-500 hover:text-slate-300 transition-colors">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

const Profile = ({ setCurrentUser, onLogout }) => {
  const context = (() => { try { return useOutletContext() } catch { return {} } })();
  const currentUser = context?.currentUser;

  const [profile, setProfile] = useState({ name: "", email: "" });
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    axios.get(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (data.success && data.user) {
          setProfile({ name: data.user.name || "", email: data.user.email || "" });
        }
      })
      .catch(() => toast.error("Unable to load profile."));
  }, [navigate]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.put(
        `${API_URL}/api/users/profile`,
        { name: profile.name, email: profile.email },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setCurrentUser?.(prev => ({ ...prev, name: profile.name }));
        toast.success("Profile updated successfully");
      } else toast.error(data.message || "Failed to update profile");
    } catch (err) {
      toast.error(err.response?.data?.message || "Profile update failed");
    } finally { setSaving(false); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) return toast.error("Passwords do not match");
    
    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(passwords.new)) {
      return toast.error("New password must be at least 8 characters long and contain at least one uppercase letter and one special character.");
    }
    setChangingPw(true);
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.put(
        `${API_URL}/api/users/password`,
        { currentPassword: passwords.current, newPassword: passwords.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("Password changed");
        setPasswords({ current: "", new: "", confirm: "" });
      } else toast.error(data.message || "Password change failed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Password change failed");
    } finally { setChangingPw(false); }
  };

  const role = currentUser?.role || 'staff';
  const initial = profile.name ? profile.name.charAt(0).toUpperCase() : 'U';
  const avatarGradient = role === 'admin' ? 'from-red-500 to-orange-500'
    : role === 'hr' ? 'from-fuchsia-500 to-purple-600'
    : 'from-teal-400 to-cyan-500';
  const RoleIcon = role === 'admin' ? ShieldCheck : role === 'hr' ? Briefcase : Users;
  const roleLabel = role === 'admin' ? 'System Admin' : role === 'hr' ? 'HR Manager' : 'Project Associate';
  const roleColor = role === 'admin' ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : role === 'hr' ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';

  return (
    <div className={`min-h-full p-4 md:p-8 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />

      {/* Animated background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[35%] h-[35%] bg-purple-500/10 blur-[100px] rounded-full animate-float" />
        <div className="absolute -bottom-20 -left-20 w-[35%] h-[35%] bg-cyan-500/8 blur-[100px] rounded-full animate-float delay-4" />
      </div>

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm font-medium mb-8 transition-colors group animate-fade-in"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      {/* Profile Hero */}
      <div className="relative overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 mb-8 shadow-xl animate-slide-up">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Avatar */}
          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white text-3xl font-black shadow-2xl shrink-0 animate-scale-in`}>
            {initial}
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-black text-white">{profile.name || 'Loading…'}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{profile.email}</p>
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full border text-xs font-semibold ${roleColor}`}>
              <RoleIcon className="w-3 h-3" />
              {roleLabel}
            </div>
          </div>
          {/* Points badge (staff only) */}
          {role === 'staff' && (
            <div className="sm:ml-auto flex flex-col items-center gap-1 px-5 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl">
              <span className="text-2xl font-black text-yellow-400">{currentUser?.points || 0}</span>
              <span className="text-[10px] uppercase tracking-widest text-yellow-500/70 font-bold">Points</span>
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* Personal Info */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl animate-slide-up delay-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
              <User className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Personal Information</h2>
              <p className="text-xs text-slate-500">Update your name and email</p>
            </div>
          </div>

          <form onSubmit={saveProfile} className="space-y-3">
            <InputField icon={User}  type="text"  placeholder="Full Name" iconColor="text-cyan-500"
              value={profile.name}  onChange={e => setProfile({ ...profile, name: e.target.value })} required />
            <InputField icon={Mail}  type="email" placeholder="Email Address" iconColor="text-indigo-400"
              value={profile.email} onChange={e => setProfile({ ...profile, email: e.target.value })} required />

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-cyan-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Security */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl animate-slide-up delay-2">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Security</h2>
              <p className="text-xs text-slate-500">Change your password</p>
            </div>
          </div>

          <form onSubmit={changePassword} className="space-y-3">
            <InputField icon={Lock} type="password" placeholder="Current Password"
              value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} required />
            <InputField icon={Lock} type="password" placeholder="New Password (8+ chars, Uppercase, Special)"
              value={passwords.new} onChange={e => setPasswords({ ...passwords, new: e.target.value })} required />
            <InputField icon={Lock} type="password" placeholder="Confirm New Password"
              value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} required />

            <button
              type="submit"
              disabled={changingPw}
              className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPw ? (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              ) : <CheckCircle className="w-4 h-4" />}
              {changingPw ? 'Changing…' : 'Change Password'}
            </button>
          </form>

          {/* Danger Zone */}
          <div className="mt-6 pt-5 border-t border-white/[0.07]">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-400/70 mb-3 flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Danger Zone
            </p>
            <button
              type="button"
              onClick={onLogout}
              className="w-full py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold hover:bg-rose-500/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
