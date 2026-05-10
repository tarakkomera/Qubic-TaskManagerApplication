import { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { UserPlus, User, Mail, Lock, Briefcase, Users } from "lucide-react";
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const INITIAL_FORM = { name: '', email: '', password: '', role: 'staff' };

export const Inputwrapper =
  "flex items-center border border-white/10 bg-white/5 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 transition-all duration-200 text-slate-200";

export const BUTTON_CLASSES =
  "w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white text-sm font-semibold py-2 rounded-lg hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-[1.02] hover:animate-text-shimmer transition-all duration-300 flex items-center justify-center gap-2";

export const MESSAGE_SUCCESS = "bg-teal-500/10 text-teal-400 p-3 rounded-lg text-sm mb-4 border border-teal-500/20";
export const MESSAGE_ERROR = "bg-red-500/10 text-red-400 p-3 rounded-lg text-sm mb-4 border border-red-500/20";

const TEXT_FIELDS = [
  { name: "name", type: "text", placeholder: "Full Name", icon: User },
  { name: "email", type: "email", placeholder: "Email", icon: Mail },
  { name: "password", type: "password", placeholder: "Password (8+ chars, Uppercase, Special)", icon: Lock },
];

const Signup = ({ onSwitchMode, onSubmit }) => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: "", type: "" });

    const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setLoading(false);
      setMessage({
        text: "Password must be at least 8 characters long and contain at least one uppercase letter and one special character.",
        type: "error"
      });
      return;
    }

    try {
      const { data } = await axios.post(`${API_URL}/api/users/register`, formData);
      console.log("Signup Success:", data);
      if (data.token) {
        // Fallback just in case backend issues token without verification
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user.id);
        onSubmit?.({ token: data.token, userId: data.user.id, ...data.user });
        toast.success("Account created! Redirecting...");
      } else {
        setMessage({ text: data.message || "Signup successful! Please verify your email.", type: "success" });
        setTimeout(() => navigate('/verify', { state: { email: formData.email } }), 1500);
      }
      setFormData(INITIAL_FORM);
    } catch (error) {
      console.error("Signup Error:", error);
      setMessage({
        text: error?.response?.data?.message || "Signup Failed! Please try again",
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-slate-200">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <div className="flex-1 flex px-4 py-4 md:py-8">
        <div className="m-auto w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="text-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(34,211,238,0.4)]">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <h2 className="mb-0.5 text-xl font-bold text-white">Create Account</h2>
            <p className="text-slate-400 text-xs">Join Qubic to manage your tasks</p>
          </div>

          {message.text && (
            <div className={message.type === "success" ? MESSAGE_SUCCESS : MESSAGE_ERROR}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {TEXT_FIELDS.map(({ name, type, placeholder, icon: Icon }) => (
              <div key={name} className={Inputwrapper}>
                <Icon className="text-cyan-400 mr-2 w-5 h-5 shrink-0" />
                <input
                  type={type}
                  placeholder={placeholder}
                  value={formData[name]}
                  onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                  className="w-full focus:outline-none text-sm bg-transparent placeholder-slate-500 text-slate-100"
                  required
                />
              </div>
            ))}

            {/* Role Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Sign up as:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'admin', label: 'Admin', icon: User },
                  { value: 'hr', label: 'HR', icon: Briefcase },
                  { value: 'staff', label: 'Staff', icon: Users },
                ].map(({ value, label, icon: Icon }) => (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={formData.role === value}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="hidden"
                    />
                    <div className={`flex items-center justify-center gap-1.5 py-1.5 border-2 rounded-lg text-center transition-all ${formData.role === value
                      ? 'border-cyan-400 bg-cyan-900/30 text-cyan-400'
                      : 'border-white/10 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-200 bg-white/5'
                      }`}>
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-semibold">{label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className={BUTTON_CLASSES} disabled={loading}>
              {loading ? 'Creating account...' : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Sign up as {formData.role === 'admin' ? 'Admin' : formData.role === 'hr' ? 'HR Manager' : 'Staff Member'}
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-4">
            Already have an account?{' '}
            <button onClick={onSwitchMode} className="text-cyan-400 font-semibold hover:text-teal-300 hover:underline">
              Login
            </button>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 mt-auto border-t border-white/10 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p className="mb-2 md:mb-0">&copy; {new Date().getFullYear()} Qubic Task Manager.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Signup;
