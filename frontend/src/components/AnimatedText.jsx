import React from 'react';

const AnimatedText = ({ text = "Qubic Task Manager", className = '', colorClass = "from-teal-400 via-cyan-500 to-blue-500" }) => {
  return (
    <div className={`inline-flex items-center justify-center overflow-visible ${className}`}>
      <span 
        className={`
          text-transparent bg-clip-text bg-gradient-to-r ${colorClass}
          animate-text-shimmer bg-[length:200%_auto]
          font-black tracking-tight hover:tracking-wide
          transition-all duration-500 ease-out
          cursor-default select-none
          drop-shadow-sm hover:drop-shadow-md
        `}
        style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', lineHeight: '1.2' }}
      >
        {text}
      </span>
    </div>
  );
};

export default AnimatedText;
