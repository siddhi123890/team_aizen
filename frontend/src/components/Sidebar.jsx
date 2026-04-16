import React from 'react';
import { LayoutDashboard, Activity, AlertTriangle, Network, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Live Feed', path: '/feed' },
  { icon: AlertTriangle, label: 'Fraud Alerts', path: '/alerts' },
  { icon: Network, label: 'Graph Analysis', path: '/graph' },
];

export default function Sidebar() {
  return (
    <aside className="w-20 lg:w-64 border-r border-[#222222] bg-[#111111] min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6">
      <div className="px-3 lg:px-4 space-y-2">
        <p className="hidden lg:block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-3">
          Overview
        </p>
        
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => cn(
                "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative font-medium",
                isActive 
                  ? "bg-white text-[#111111]" 
                  : "text-gray-400 hover:bg-[#1a1a1a] hover:text-white border border-transparent cursor-pointer"
              )}
            >
              {({ isActive }) => (
                <>
                   <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-[#111111]" : "text-gray-500 group-hover:text-white")} />
                   <span className="hidden lg:block">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="px-3 lg:px-4">
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors font-medium text-gray-500 hover:bg-[#1a1a1a] hover:text-white cursor-pointer group border border-transparent hover:border-[#333]">
          <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          <span className="hidden lg:block">Settings</span>
        </button>
      </div>
    </aside>
  );
}
