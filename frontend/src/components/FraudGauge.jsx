import React from 'react';

export default function FraudGauge({ score }) {
  const n = isNaN(score) ? 0 : Math.min(Math.max(score * 100, 0), 100);
  const c = 2 * Math.PI * 52;
  const offset = c - (n / 100) * c;
  
  const color = n > 70 ? '#FF3B5C' : n > 30 ? '#FFB300' : '#00D4FF';
  const glow = n > 70 ? '0 0 20px rgba(255,59,92,0.3)' : n > 30 ? '0 0 20px rgba(255,179,0,0.3)' : '0 0 20px rgba(0,212,255,0.3)';
  const status = n > 70 ? 'CRITICAL' : n > 30 ? 'ELEVATED' : 'STABLE';

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow ring background */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full" style={{ boxShadow: glow, opacity: 0.5 }} />
      </div>
      
      <svg className="transform -rotate-90 w-36 h-36">
        {/* Track */}
        <circle cx="72" cy="72" r="52" stroke="rgba(176,196,222,0.08)" strokeWidth="6" fill="transparent" />
        {/* Progress */}
        <circle cx="72" cy="72" r="52" stroke={color} strokeWidth="6" fill="transparent"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold" style={{ color }}>{n.toFixed(0)}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--on-surface-muted)' }}>{status}</span>
      </div>
    </div>
  );
}
