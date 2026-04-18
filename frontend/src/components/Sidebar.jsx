import React from 'react';
import { Shield, LayoutDashboard, Activity, AlertTriangle, Network, Settings, Zap, Radio } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { icon: LayoutDashboard, label: 'Security Command', path: '/' },
  { icon: Activity, label: 'Transaction Feed', path: '/feed' },
  { icon: Network, label: 'Risk Analytics', path: '/graph' },
  { icon: AlertTriangle, label: 'Threat Alerts', path: '/alerts' },
];

export default function Sidebar({ collapsed, onSimulateFraud, onSimulateNormal, simulating }) {
  return (
    <aside className={`${collapsed ? 'hidden' : 'flex'} lg:flex w-56 min-h-[calc(100vh-3.5rem)] flex-col justify-between py-5 px-3 shrink-0 z-20`}
      style={{ background: 'var(--surface-low)' }}
    >
      {/* Branding */}
      <div>
        <div className="flex items-center gap-2.5 px-3 mb-6">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'var(--primary-container)', color: 'var(--primary)', boxShadow: 'var(--glow-primary)' }}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-tight" style={{ color: 'var(--on-background)' }}>FraudSafe</h1>
            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'var(--on-surface-muted)' }}>AI Fraud Detection</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path} className="group">
                {({ isActive }) => (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-smooth relative"
                    style={isActive
                      ? { background: 'var(--surface-bright)', color: 'var(--on-background)' }
                      : { color: 'var(--on-surface-dim)' }
                    }
                  >
                    {isActive && (
                      <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full" style={{ background: 'var(--primary)', boxShadow: 'var(--glow-primary)' }} />
                    )}
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                    <span className="text-xs font-medium">{item.label}</span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom section */}
      <div className="space-y-2 px-1">
        {/* Inject Safe */}
        <button onClick={onSimulateNormal} disabled={simulating}
          className="btn-primary w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold disabled:opacity-50"
        >
          <Activity className="w-3.5 h-3.5" /> Inject Safe
        </button>

        {/* Simulate Attack */}
        <button onClick={onSimulateFraud} disabled={simulating}
          className="btn-danger w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold disabled:opacity-50"
        >
          <Zap className="w-3.5 h-3.5" /> Simulate Attack
        </button>

        {/* Model status */}
        <div className="rounded-xl px-3 py-3" style={{ background: 'var(--surface-container)' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-2 h-2 rounded-full animate-glow-pulse" style={{ background: 'var(--success)', boxShadow: 'var(--glow-success)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--success)' }}>Model: Online</span>
          </div>
          <p className="text-[9px] font-mono" style={{ color: 'var(--on-surface-muted)' }}>
            XGB-v2.4.1 · Inference 12ms
          </p>
        </div>


      </div>
    </aside>
  );
}
