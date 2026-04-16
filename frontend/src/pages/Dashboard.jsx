import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, ServerCrash, TrendingUp, Users, DollarSign } from 'lucide-react';
import api from '../api/axiosInstance';
import TransactionCard from '../components/TransactionCard';
import FraudAlertCard from '../components/FraudAlertCard';
import TimeSeriesGraph from '../components/GraphDashboard';
import FraudGauge from '../components/FraudGauge';
import { useSocket } from '../hooks/useSocket';

export default function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);
  
  const { isConnected, lastTransaction, lastFraudAlert } = useSocket();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [txRes, statsRes, alertsRes] = await Promise.all([
          api.get('/transactions?limit=20'),
          api.get('/stats'),
          api.get('/alerts?status=new&limit=5')
        ]);
        
        if (txRes.data.transactions) setTransactions(txRes.data.transactions);
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        if (alertsRes.data.alerts) setAlerts(alertsRes.data.alerts);
      } catch (err) {
        setError("Failed to connect to backend APIs. Showing fallback/skeleton data.");
      }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (lastTransaction) {
      setTransactions(prev => {
        const newItem = { ...lastTransaction, isNew: true };
        const newArr = [newItem, ...prev].slice(0, 50);
        setTimeout(() => {
          setTransactions(current => 
            current.map(tx => tx._id === newItem._id ? { ...tx, isNew: false } : tx)
          );
        }, 3000);
        return newArr;
      });
      refreshStats(); // Keep stats completely fresh and tied to DB
    }
  }, [lastTransaction]);

  useEffect(() => {
    if (lastFraudAlert) {
      setAlerts(prev => [lastFraudAlert, ...prev].slice(0, 10));
    }
  }, [lastFraudAlert]);

  const refreshStats = async () => {
      try {
          const statsRes = await api.get('/stats');
          if (statsRes.success && statsRes.data) setStats(statsRes.data);
      } catch(e) {}
  };

  const handleSimulateNormal = async () => {
    try {
      setSimulating(true);
      await api.post('/transactions/simulate', { count: 3 });
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateFraud = async () => {
    try {
      setSimulating(true);
      await api.post('/transactions/simulate-fraud', { count: 4 });
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const activeFraudScore = transactions.length > 0 ? transactions[0].fraudScore : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Security Command</h2>
          <p className="text-gray-500 font-medium text-sm mt-0.5">Real-time inference and active telemetry.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          <button 
            onClick={handleSimulateNormal}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            Inject Safe Node
          </button>
          <div className="w-[1px] bg-gray-200 mx-1 my-2" />
          <button 
            onClick={handleSimulateFraud}
            disabled={simulating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50 group cursor-pointer"
          >
            <Zap className="w-4 h-4 group-hover:animate-bounce" />
            Simulate Attack
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
          <ServerCrash className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Global Real Backend Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:border-[#333333] transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Activity className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Scanned</p>
            <p className="text-3xl font-bold text-white tracking-tight">{stats?.transactions ? stats.transactions.totalTransactions.toLocaleString() : '--'}</p>
          </div>
        </div>
        
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:border-[#333333] transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-[#ff3333]/10 border border-[#ff3333]/20 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-[#ff3333]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Blocked Threats</p>
            <p className="text-3xl font-bold text-white tracking-tight">{stats?.transactions ? stats.transactions.fraudulentTransactions.toLocaleString() : '--'}</p>
          </div>
        </div>
        
        <div className="bg-[#111111] border border-[#222222] rounded-2xl p-6 flex items-center gap-5 shadow-sm hover:border-[#333333] transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-[#00d084]/10 border border-[#00d084]/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-[#00d084]" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fraud Rate</p>
            <p className="text-3xl font-bold text-white tracking-tight">
               {stats?.transactions ? stats.transactions.fraudRate : '0.00%'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Live Feed */}
        <div className="xl:col-span-4 flex flex-col gap-4 h-[700px]">
          <div className="clean-panel p-5 flex-grow overflow-hidden flex flex-col">
            <div className="flex justify-between items-end mb-4 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900">Live Feed</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded border border-gray-200">
                LATEST 50
              </span>
            </div>
            
            <div className="overflow-y-auto pr-2 space-y-1 flex-grow">
              {transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-3">
                  <Activity className="w-8 h-8 opacity-20" />
                  <p className="text-sm font-medium">Awaiting connection telemetry...</p>
                </div>
              ) : (
                transactions.map((tx) => (
                  <TransactionCard key={tx._id} tx={tx} isNew={tx.isNew} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Columns */}
        <div className="xl:col-span-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 clean-panel p-5">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-bold text-gray-900">Velocity Overlay</h3>
                <span className="text-xs text-gray-400 font-mono font-medium">REAL-TIME DB SYNC</span>
              </div>
              <TimeSeriesGraph data={transactions} />
            </div>
            
            <div className="lg:col-span-1 clean-panel p-5 flex flex-col items-center justify-center">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center mb-6">
                Active Inference
              </h3>
              <div className="scale-90 lg:scale-100"><FraudGauge score={activeFraudScore} /></div>
              
              <div className="mt-6 text-center">
                <p className="text-xs font-bold text-gray-600">Model Pipeline</p>
                <div className="flex items-center justify-center gap-1.5 mt-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Processing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="clean-panel p-5 flex-grow">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
               <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                 <ShieldAlert className="w-5 h-5 text-gray-400" />
                 Recent Actionable Threats
               </h3>
               {alerts.length > 0 && (
                <span className="text-xs font-bold bg-red-50 text-red-600 px-2.5 py-1 border border-red-100 rounded">
                  {alerts.length} PENDING
                </span>
               )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-gray-400">
                  <ShieldAlert className="w-12 h-12 mb-3 opacity-20 text-gray-300" />
                  <p className="text-sm font-semibold text-gray-500">No active threats detected.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <FraudAlertCard key={alert._id || Math.random().toString()} alert={alert} />
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
