import React, { useState, useEffect } from 'react';
import { Hexagon } from 'lucide-react';
import AnimatedText from './AnimatedText';

const SplashScreen = ({ onComplete }) => {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const closeTimer = setTimeout(() => {
      setIsClosing(true);
    }, 4000); // Trigger slide up at 4 seconds

    const unmountTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 5000); // Unmount entirely at 5 seconds

    return () => {
      clearTimeout(closeTimer);
      clearTimeout(unmountTimer);
    };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 bg-[#020617] flex flex-col items-center justify-center z-[9999] transition-transform duration-[1200ms] cubic-bezier(0.85, 0, 0.15, 1) ${isClosing ? '-translate-y-full shadow-[0_40px_100px_rgba(0,0,0,0.7)]' : 'translate-y-0'}`}>
      
      {/* Dynamic background particles/glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full animate-float delay-2" />
      </div>

      <div className="flex flex-col items-center gap-10 relative z-10">
        {/* 3D Logo Container */}
        <div className="relative group animate-logo-3d">
          <div className="animate-float-3d">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Spinning Ring */}
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-500/30 animate-spin-slow"></div>
              
              {/* Outer Glow Ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 p-[2px] animate-pulse-glow shadow-[0_0_30px_rgba(34,211,238,0.3)]">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center backdrop-blur-xl">
                  {/* Inner Icon with 3D shadow effect */}
                  <div className="relative transform-gpu transition-transform duration-500 group-hover:scale-110">
                    <Hexagon className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.9)]" strokeWidth={1.5} />
                    <Hexagon className="absolute inset-0 w-16 h-16 text-cyan-900/50 blur-[2px] translate-x-1 translate-y-1 -z-10" strokeWidth={1.5} />
                  </div>
                </div>
              </div>

              {/* Ambient rays */}
              <div className="absolute -inset-10 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-full blur-[60px] opacity-10 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Text with scale animation */}
        <div className="text-center transform-gpu animate-scale-in delay-2">
          <AnimatedText 
            text="QUBIC" 
            className="text-6xl font-black tracking-[0.2em] mb-2"
            colorClass="from-teal-400 via-cyan-500 to-blue-500" 
          />
          <div className="h-[2px] w-12 bg-gradient-to-r from-cyan-500 to-transparent mx-auto rounded-full opacity-50"></div>
        </div>
        
        {/* Modern Loading Indicator */}
        <div className="flex flex-col items-center gap-3 mt-4">
          <div className="w-56 h-[3px] bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
            <div className="h-full bg-gradient-to-r from-teal-400 via-cyan-500 to-blue-500 transition-all duration-[5000ms] ease-linear w-full"></div>
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold animate-pulse">Initializing System</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
