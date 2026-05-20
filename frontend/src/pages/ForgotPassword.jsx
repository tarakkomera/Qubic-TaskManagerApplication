import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import axios from 'axios';
import { Mail, Lock, KeyRound, ChevronLeft, Send, CheckCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { INPUTWRAPPER, BUTTON_CLASSES } from '../components/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localDevCode, setLocalDevCode] = useState('');
  const navigate = useNavigate();

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
      toast.success(data.message);
      if (data.devCode) {
        setLocalDevCode(data.devCode);
      } else {
        setLocalDevCode('');
      }
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/api/users/reset-password`, {
        email,
        code,
        newPassword
      });
      toast.success(data.message);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0f172a] overflow-y-auto custom-scrollbar flex flex-col text-slate-200">
      <ToastContainer position='top-center' autoClose={3000} hideProgressBar />

      <div className="flex-1 flex px-4 py-8">
        <div className='m-auto w-full max-w-md bg-slate-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-slide-up'>
          
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 text-sm font-medium mb-6 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Back to Login
          </button>

          <div className='mb-8 text-center'>
            <div className='w-14 h-14 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(244,63,94,0.3)]'>
              <ShieldCheck className='w-7 h-7 text-white' />
            </div>
            <h2 className='text-2xl font-black mb-1 text-white'>Password Recovery</h2>
            <p className='text-slate-400 text-sm'>
              {step === 1 ? "Enter your email to receive a reset code." : "Enter the code sent to your email to set a new password."}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className={INPUTWRAPPER}>
                <Mail className="text-orange-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full focus:outline-none text-sm bg-transparent placeholder-slate-500 text-slate-100 py-1"
                  required
                />
              </div>

              <button type="submit" className={BUTTON_CLASSES.replace('from-teal-400 via-cyan-500 to-blue-500', 'from-orange-400 to-rose-500')} disabled={loading}>
                {loading ? 'Sending...' : (
                  <>
                    <Send className='w-4 h-4' />
                    Send Reset Code
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
              {localDevCode && (
                <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs rounded-xl text-center font-medium shadow-sm animate-pulse">
                  ⚠️ Sandbox Mode: Since email failed to deliver, use reset code: <strong className="text-sm font-black text-amber-400 font-mono tracking-widest block mt-1">{localDevCode}</strong>
                </div>
              )}

              <div className={INPUTWRAPPER}>
                <KeyRound className="text-orange-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  type="text"
                  placeholder="6-Digit Reset Code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full focus:outline-none text-sm bg-transparent placeholder-slate-500 text-slate-100 py-1 tracking-widest font-mono"
                  required
                  maxLength={6}
                />
              </div>

              <div className={INPUTWRAPPER}>
                <Lock className="text-orange-400 w-5 h-5 mr-3 shrink-0" />
                <input
                  type="password"
                  placeholder="New Password (8+ chars, 1 uppercase, 1 special)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full focus:outline-none text-sm bg-transparent placeholder-slate-500 text-slate-100 py-1"
                  required
                />
              </div>

              <button type="submit" className={BUTTON_CLASSES.replace('from-teal-400 via-cyan-500 to-blue-500', 'from-orange-400 to-rose-500')} disabled={loading}>
                {loading ? 'Resetting...' : (
                  <>
                    <CheckCircle className='w-4 h-4' />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
