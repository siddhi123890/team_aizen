import React, { useState, useEffect } from 'react';
import { ShieldAlert, Bell, User, Clock } from 'lucide-react';

export default function Navbar({ isConnected }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="h-16 bg-[#111111] border-b border-[#222222] flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm text-[#111111]">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white">
          FraudShield <span className="text-gray-400 font-light">AI</span>
        </h1>
        
        {/* System Status Pill */}
        <div className="ml-6 px-3 py-1 rounded-full bg-[#1a1a1a] border border-[#333333] flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00d084]' : 'bg-[#ff3333]'}`} />
          <span className="text-xs font-semibold text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-gray-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-mono tracking-wider font-medium">
            {time.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
        
        <div className="flex items-center gap-4 border-l border-[#222222] pl-6">
          <button className="relative p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-gray-400 hover:text-white cursor-pointer">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#ff3333] rounded-full border border-[#111111]" />
          </button>
          
          <div className="flex items-center gap-3 pl-2 cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center border border-[#333333] group-hover:border-white transition-colors">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-sm">
              <p className="font-semibold text-white">Security Analyst</p>
              <p className="text-xs text-gray-500 font-medium">Admin Access</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
