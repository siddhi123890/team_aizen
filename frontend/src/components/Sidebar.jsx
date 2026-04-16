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
  { icon: AlertTriangle, label: 'Alerts', path: '/alerts' },
  { icon: Network, label: 'Analytics', path: '/graph' },
];

export default function Sidebar() {
  return (
    <aside className="w-24 md:w-28 border-r border-gray-100 bg-white min-h-[calc(100vh-4rem)] flex flex-col justify-between py-6 shrink-0 shadow-[2px_0_10px_rgba(0,0,0,0.01)] z-10">
      <div className="flex flex-col gap-2 w-full">
        {navItems.map((item, idx) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={idx}
              to={item.path}
              className={({ isActive }) => cn(
                "w-full flex flex-col items-center py-4 relative transition-colors duration-200 cursor-pointer group",
                isActive ? "bg-[#f2f9ff]" : "hover:bg-gray-50"
              )}
            >
              {({ isActive }) => (
                <>
                  {/* Left active border indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />
                  )}

                  {/* Icon Container */}
                  <div className={cn(
                    "w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300",
                    isActive
                      ? "bg-[#ffb800] text-white shadow-md shadow-[#ffb800]/30 scale-105"
                      : "bg-[#f3f4f6] text-[#475569] group-hover:bg-[#e2e8f0]"
                  )}>
                    <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  </div>

                  {/* Text Label */}
                  <span className={cn(
                    "mt-2.5 text-[11px] tracking-wide transition-colors duration-200",
                    isActive
                      ? "text-blue-600 font-semibold"
                      : "text-[#475569] font-medium group-hover:text-gray-900"
                  )}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="w-full flex justify-center mt-auto">
        <button className="flex flex-col items-center py-4 w-full hover:bg-gray-50 transition-colors group cursor-pointer">
          <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#475569] group-hover:bg-[#e2e8f0] transition-all">
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="mt-2 text-[11px] tracking-wide text-[#475569] font-medium group-hover:text-gray-900">
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
}
