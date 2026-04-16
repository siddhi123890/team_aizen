import React from 'react';

export default function FraudGauge({ score }) {
  const normalizedScore = isNaN(score) ? 0 : Math.min(Math.max(score * 100, 0), 100);
  
  const circumference = 2 * Math.PI * 45; 
  const strokeDashoffset = circumference - (normalizedScore / 100) * circumference;
  
  const color = normalizedScore > 70 ? '#ef4444' : normalizedScore > 30 ? '#f59e0b' : '#10b981';
  const bgColor = '#e5e7eb'; // Light gray for background track

  return (
    <div className="relative flex items-center justify-center">
      <svg className="transform -rotate-90 w-32 h-32">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke={bgColor}
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke={color}
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono" style={{ color }}>
          {normalizedScore.toFixed(0)}
        </span>
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
          Score
        </span>
      </div>
    </div>
  );
}
