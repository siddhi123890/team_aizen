import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Alerts from './pages/Alerts';
import GraphAnalysis from './pages/GraphAnalysis';
import { useSocket } from './hooks/useSocket';

export default function App() {
  const { isConnected } = useSocket();

  return (
    <Router>
      <div className="min-h-screen bg-[#F2F2F2] text-[#333333] flex flex-col font-sans">
        <Navbar isConnected={isConnected} />
        
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          
          <main className="flex-1 overflow-y-auto w-full">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/feed" element={<LiveFeed />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/graph" element={<GraphAnalysis />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
