import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Alerts from './pages/Alerts';
import GraphAnalysis from './pages/GraphAnalysis';
import { useSocket } from './hooks/useSocket';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="flex-1 overflow-y-auto"
      >
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/feed" element={<LiveFeed />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/graph" element={<GraphAnalysis />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  const { isConnected } = useSocket();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] flex flex-col font-sans">
        <Navbar isConnected={isConnected} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(prev => !prev)}
          />

          <main className="flex-1 overflow-y-auto w-full">
            <AnimatedRoutes />
          </main>
        </div>
      </div>
    </Router>
  );
}
