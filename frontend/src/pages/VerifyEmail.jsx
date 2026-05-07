import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import { MailCheck, KeyRound, Loader2, ArrowLeft } from 'lucide-react';

export const INPUTWRAPPER =
  "flex items-center border border-purple-100 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 transition-all duration-200";
export const BUTTON_CLASSES =
  "w-full bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2";

const VerifyEmail = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Extract email from navigation state, or fallback if user navigated directly
  const email = location.state?.email || '';

  useEffect(() => {
    if (!email) {
      toast.error('No email provided for verification. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Verification code must be exactly 6 digits');
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post('http://localhost:4000/api/users/verify', {
        email,
        code
      });

      if (data.success) {
        toast.success(data.message);
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('No email provided for resend.');
      return;
    }

    setResendLoading(true);
    try {
      const { data } = await axios.post('http://localhost:4000/api/users/resend-otp', { email });
      if (data.success) {
        toast.success(data.message);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />

      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100 relative">
        <button
          onClick={() => navigate('/login')}
          className="absolute top-4 left-4 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Back to Login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <MailCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
          <p className="text-gray-500 text-sm mt-2">
            We've sent a 6-digit verification code to <br />
            <span className="font-semibold text-indigo-600">{email}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
              Verification Code
            </label>
            <div className={INPUTWRAPPER}>
              <KeyRound className="text-purple-400 mr-2 w-5 h-5 shrink-0" />
              <input
                type="text"
                placeholder="Enter 6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full focus:outline-none text-center text-lg tracking-[0.5em] font-semibold text-gray-800"
                required
                maxLength={6}
              />
            </div>
          </div>

          <button type="submit" className={BUTTON_CLASSES} disabled={loading || code.length !== 6 || !email}>
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Verify Account'
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-sm text-gray-500">Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={resendLoading || !email}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            Resend Verification Code
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Please check your backend terminal window for the mock email code to test this flow.
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
