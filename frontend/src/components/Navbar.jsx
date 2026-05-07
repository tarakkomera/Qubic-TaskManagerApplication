import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Zap, Menu, Settings } from 'lucide-react';
import AnimatedText from './AnimatedText';

function Navbar({ user, onLogout, toggleSidebar }) {
  const menuref = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isHR    = user?.role === 'hr';
  const isAdmin = user?.role === 'admin';


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuref.current && !menuref.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleMenuToggle = () => setMenuOpen((prev) => !prev);

  const handleLogout = () => {
    setMenuOpen(false);
    if (onLogout) onLogout();
  };

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuref.current && !menuref.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <header className='z-50 bg-slate-900/40 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] border-b border-white/10 font-sans text-slate-200'>
      <div className='container mx-auto flex items-center justify-between p-1'>
        {/* Logo or Brand Name */}
        <div
          className='flex items-center gap-1.5 cursor-pointer group py-1 ml-1'
          onClick={() => navigate('/')}
        >
            {/* Logo Icon with Spinning Border */}
            <div className='relative flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-800 shadow-[0_4px_15px_-3px_rgba(6,182,212,0.4)] transition-all duration-500 group-hover:shadow-[0_8px_25px_-4px_rgba(59,130,246,0.6)] group-hover:-translate-y-1 overflow-hidden flex-shrink-0 border border-white/10'>
              {/* Spinning Gradient */}
              <div className="absolute w-[250%] h-[250%] bg-[conic-gradient(from_90deg_at_50%_50%,#ffffff_0%,#06b6d4_50%,#3b82f6_100%)] animate-[spin_3s_linear_infinite] opacity-40 group-hover:opacity-100 transition-opacity duration-500"></div>
              {/* Inner White Box to mask the center */}
              <div className="absolute inset-[2px] bg-slate-900/95 backdrop-blur-sm rounded-[14px] flex items-center justify-center z-10 overflow-hidden">
                <Zap className='w-6 h-6 z-10 drop-shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-12' style={{ stroke: 'url(#zap-gradient)', fill: 'url(#zap-gradient)' }} />

                {/* SVG Gradient Definition */}
                <svg width="0" height="0" className="absolute">
                  <linearGradient id="zap-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop stopColor="#2dd4bf" offset="0%" />
                    <stop stopColor="#06b6d4" offset="50%" />
                    <stop stopColor="#3b82f6" offset="100%" />
                  </linearGradient>
                </svg>
              </div>
            </div>

            {/* Brand Name Text */}
            <div className="relative flex flex-col justify-center">
              <AnimatedText text="Qubic" className="group-hover:scale-105" />
              {/* Animated Underline */}
              <div className="absolute -bottom-1 left-1/2 w-0 h-[3px] bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 rounded-full transition-all duration-500 group-hover:w-[120%] group-hover:-translate-x-1/2 opacity-0 group-hover:opacity-100"></div>
            </div>
          </div>

          <div className='flex items-center gap-4'>


          {/* Reward Points Badge - Staff only */}
          {!isHR && !isAdmin && (
            <div className='flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full text-yellow-500 shadow-sm hover:scale-105 transition-all cursor-default'>
              <Zap className='w-4 h-4 fill-yellow-500 text-yellow-500' />
              <span className='text-sm font-bold'>{user?.points || 0}</span>
              <span className='text-[10px] uppercase font-bold tracking-tighter opacity-70'>pts</span>
            </div>
          )}

          <div ref={menuref} className='relative'>
            <button
              onClick={handleMenuToggle}
              className='flex items-center gap-2 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-white/10 transition-all border border-white/5 bg-white/5 backdrop-blur-md shadow-lg group'
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="user-menu"
            >
              {/* Role badge */}
              <span className={`hidden sm:flex text-xs font-semibold px-2 py-0.5 rounded-full ${
                isAdmin ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                : isHR  ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                        : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
              }`}>
                {isAdmin ? 'Admin' : isHR ? 'HR' : 'Staff'}
              </span>
              <div className='relative'>
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt='User Avatar'
                    className='w-7 h-7 rounded-lg shadow-sm object-cover border border-white/10'
                  />
                ) : (
                  <div className='w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-black text-xs shadow-md border border-white/20'>
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse'></div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 ${menuOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {menuOpen && (
              <ul
                id="user-menu"
                className='absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden'
              >

                <li className='px-4 py-2 hover:bg-slate-700 cursor-pointer'>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/profile'); }}
                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-cyan-400 transition-colors'
                  >
                    <Settings className='w-4 h-4' />
                    Profile Settings
                  </button>
                </li>

                <li className='px-4 py-2 hover:bg-slate-700 cursor-pointer border-t border-white/5'>
                  <button
                    onClick={handleLogout}
                    className='flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20'
                  >
                    <LogOut className='w-4 h-4' />
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;