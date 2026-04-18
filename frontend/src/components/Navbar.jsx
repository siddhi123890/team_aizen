import React, { useState, useEffect } from 'react';
import { User, LogOut, Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ isConnected, user, onLogout, onToggleSidebar }) {
  const [time, setTime] = useState(new Date());
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <nav className="h-14 flex items-center justify-between px-5 sticky top-0 z-50"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--outline)' }}
    >
      {/* Left: branding + status */}
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="lg:hidden p-1.5 rounded-lg cursor-pointer transition-smooth"
          style={{ color: 'var(--on-surface-dim)' }}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* System status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full animate-pulse-ring"
            style={{ background: isConnected ? 'var(--success)' : 'var(--error)', boxShadow: isConnected ? 'var(--glow-success)' : 'var(--glow-danger)' }}
          />
          <span className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: isConnected ? 'var(--success)' : 'var(--error)' }}
          >{isConnected ? 'System Connected' : 'Offline'}</span>
        </div>


      </div>

      {/* Right: clock + user */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <span className="font-mono text-xs tracking-wider" style={{ color: 'var(--on-surface-dim)' }}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>

        {/* Theme toggle */}
        <button onClick={toggleTheme} className="p-1.5 rounded-lg cursor-pointer transition-smooth"
          style={{ color: 'var(--on-surface-dim)' }} title="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User chip */}
        <div className="flex items-center gap-2 pl-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: 'var(--primary-container)', color: 'var(--primary)' }}
          >
            <User className="w-3.5 h-3.5" />
          </div>
          <div className="hidden md:block">
            <p className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--on-background)' }}>{user?.name || 'Analyst'}</p>
            <p className="text-[9px] leading-tight" style={{ color: 'var(--on-surface-muted)' }}>Senior Analyst</p>
          </div>
        </div>

        {onLogout && (
          <button onClick={onLogout} className="p-1.5 rounded-lg cursor-pointer transition-smooth"
            style={{ color: 'var(--on-surface-muted)' }} title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </nav>
  );
}
