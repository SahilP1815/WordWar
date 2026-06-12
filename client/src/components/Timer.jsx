import React from 'react';

export default function Timer({ secondsLeft, totalSeconds = 60 }) {
  const percentage = (secondsLeft / totalSeconds) * 100;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let strokeColor = 'stroke-emerald-500';
  let textColor = 'text-emerald-400';
  let glowColor = 'shadow-emerald-500/20';

  if (secondsLeft <= 15) {
    strokeColor = 'stroke-rose-500 animate-pulse';
    textColor = 'text-rose-400 font-bold';
    glowColor = 'shadow-rose-500/30';
  } else if (secondsLeft <= 30) {
    strokeColor = 'stroke-amber-500';
    textColor = 'text-amber-400';
    glowColor = 'shadow-amber-500/20';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative w-28 h-28 flex items-center justify-center rounded-full bg-slate-900/80 border border-slate-800 shadow-lg ${glowColor}`}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="56"
            cy="56"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="56"
            cy="56"
            r={radius}
            className={`transition-all duration-1000 ease-linear ${strokeColor}`}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-3xl font-extrabold tracking-tighter ${textColor}`}>
            {secondsLeft}
          </span>
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">
            seconds
          </span>
        </div>
      </div>
    </div>
  );
}
