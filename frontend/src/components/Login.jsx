import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { Eye, EyeOff, Lock, Mail, LogIn, User, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://localhost:4000';
const INITIAL_FORM = { email: '', password: '' };

export const INPUTWRAPPER =
  "flex items-center border border-white/10 bg-white/5 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 transition-all duration-200 text-slate-200";

export const BUTTON_CLASSES =
  "w-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 bg-[length:200%_auto] text-white text-sm font-semibold py-2 rounded-lg hover:shadow-lg hover:shadow-cyan-500/40 hover:-translate-y-1 hover:scale-[1.02] hover:animate-text-shimmer transition-all duration-300 flex items-center justify-center gap-2";

const Login = ({ onSubmit, onSwitchMode }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (token) {
      (async () => {
        try {
          const { data } = await axios.get(`${API_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (data.success) {
            onSubmit?.({ token, userId, ...data.user });
            toast.success("Session restored. Redirecting...");
            navigate('/');
          } else {
            localStorage.clear();
          }
        } catch {
          localStorage.clear();
        }
      })();
    }
  }, [navigate, onSubmit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rememberMe) {
      toast.warning('Please check "Remember me" to proceed');
      return;
    }
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_URL}/api/users/login`, formData);
      if (!data.token) throw new Error(data.message || "Login failed");

      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      setFormData(INITIAL_FORM);
      onSubmit?.({ token: data.token, userId: data.user.id, ...data.user });
      toast.success("Login successful! Redirecting...");
      setTimeout(() => navigate("/"), 1000);
    } catch (err) {
      if (err.response?.data?.unverified) {
        toast.error(err.response.data.message);
        setTimeout(() => navigate('/verify', { state: { email: err.response.data.email } }), 1500);
        return;
      }
      if (err.response?.data?.notApproved) {
        toast.error(err.response.data.message, {
          icon: <ShieldCheck className="text-yellow-400" />,
          autoClose: 5000
        });
        return;
      }
      const msg = err.response?.data?.message || err.message;
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: 'email', type: 'email', placeholder: 'Email Address', icon: Mail },
    {
      name: 'password',
      type: showPassword ? 'text' : 'password',
      placeholder: 'Password',
      icon: Lock,
      isPassword: true,
    },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-transparent text-slate-200">
      <ToastContainer position='top-center' autoClose={3000} hideProgressBar />

      <div className="flex-1 flex px-4 py-4 md:py-8">
        <div className='m-auto w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]'>
          <div className='mb-6 text-center'>
            <div className='w-12 h-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full mx-auto flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(34,211,238,0.4)]'>
              <LogIn className='w-6 h-6 text-white' />
            </div>
            <h2 className='text-xl font-bold mb-0.5 text-white text-center'>Welcome Back!</h2>
            <p className='text-slate-400 text-xs text-center'>Login to manage your Qubic tasks</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {fields.map(({ name, type, placeholder, icon: Icon, isPassword }) => (
              <div key={name} className={INPUTWRAPPER}>
                <Icon className="text-cyan-400 w-5 h-5 mr-2 shrink-0" />
                <input
                  type={type}
                  placeholder={placeholder}
                  value={formData[name]}
                  onChange={(e) => setFormData({ ...formData, [name]: e.target.value })}
                  className="w-full focus:outline-none text-sm bg-transparent placeholder-slate-500 text-slate-100"
                  required
                />
                {isPassword && (
                  <button
                    type='button'
                    onClick={() => setShowPassword((prev) => !prev)}
                    className='ml-2 text-slate-500 hover:text-cyan-400 transition-colors'
                  >
                    {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                  </button>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="h-4 w-4 rounded border-white/10 bg-white/5 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <label htmlFor="rememberMe" className="cursor-pointer ml-2 text-xs text-slate-400">
                  Remember me
                </label>
              </div>
              <button type="button" className="text-xs text-cyan-400 hover:underline">
                Forgot password?
              </button>
            </div>

            <button type="submit" className={BUTTON_CLASSES} disabled={loading}>
              {loading ? 'Logging in...' : (
                <>
                  <LogIn className='w-4 h-4' />
                  Login
                </>
              )}
            </button>

            <p className='text-xs text-slate-400 text-center mt-5'>
              Don't have an account?{' '}
              <button
                type='button'
                className='text-cyan-400 font-bold hover:text-teal-300 transition-colors ml-1'
                onClick={onSwitchMode}
              >
                Sign up
              </button>
            </p>
          </form>
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

export default Login;