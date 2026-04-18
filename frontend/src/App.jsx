import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import LiveFeed from './pages/LiveFeed';
import Alerts from './pages/Alerts';
import GraphAnalysis from './pages/GraphAnalysis';
import AuthPage from './pages/AuthPage';
import { useSocket } from './hooks/useSocket';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

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

function AppLayout() {
  const { isConnected } = useSocket();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const { user, logout } = useAuth();

  const handleSimulateFraud = async () => {
    try { setSimulating(true); await (await import('./api/axiosInstance')).default.post('/transactions/simulate-fraud', { count: 4 }); } catch(e){} finally { setSimulating(false); }
  };
  const handleSimulateNormal = async () => {
    try { setSimulating(true); await (await import('./api/axiosInstance')).default.post('/transactions/simulate', { count: 3 }); } catch(e){} finally { setSimulating(false); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)', color: 'var(--on-background)' }}>
      <Navbar isConnected={isConnected} user={user} onLogout={logout} onToggleSidebar={() => setSidebarCollapsed(p => !p)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar collapsed={sidebarCollapsed} onSimulateFraud={handleSimulateFraud} onSimulateNormal={handleSimulateNormal} simulating={simulating} />

        <main className="flex-1 overflow-y-auto w-full">
          <AnimatedRoutes />
        </main>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />}
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}
