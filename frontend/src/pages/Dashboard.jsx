import React, { useState, useEffect } from 'react';
import { Activity, ShieldAlert, Zap, ServerCrash, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, FileText } from 'lucide-react';
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
          api.get('/transactions?limit=20'), api.get('/stats'), api.get('/alerts?status=new&limit=5')
        ]);
        const txData = txRes.data?.transactions || txRes.transactions || [];
        const statsData = statsRes.data || statsRes;
        const alertsData = alertsRes.data?.alerts || alertsRes.alerts || [];
        setTransactions(txData);
        if (statsData?.transactions) setStats(statsData);
        setAlerts(alertsData);
      } catch (err) { setError("Failed to connect to backend APIs."); }
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (lastTransaction) {
      setTransactions(prev => {
        const n = { ...lastTransaction, isNew: true };
        const arr = [n, ...prev].slice(0, 50);
        setTimeout(() => setTransactions(c => c.map(tx => tx._id === n._id ? { ...tx, isNew: false } : tx)), 3000);
        return arr;
      });
      refreshStats();
    }
  }, [lastTransaction]);

  useEffect(() => { if (lastFraudAlert) setAlerts(prev => [lastFraudAlert, ...prev].slice(0, 10)); }, [lastFraudAlert]);

  const refreshStats = async () => { try { const r = await api.get('/stats'); const d = r.data || r; if (d?.transactions) setStats(d); } catch(e) {} };

  const handleSimulateNormal = async () => { try { setSimulating(true); await api.post('/transactions/simulate', { count: 3 }); } catch(e){} finally { setSimulating(false); } };
  const handleSimulateFraud = async () => { try { setSimulating(true); await api.post('/transactions/simulate-fraud', { count: 4 }); } catch(e){} finally { setSimulating(false); } };

  const activeFraudScore = transactions.length > 0 ? transactions[0].fraudScore : 0;

  const statCards = [
    { label: 'Total Scanned', value: stats?.transactions?.totalTransactions?.toLocaleString() || '--', icon: Activity, trend: '+12.4%', up: true, color: 'var(--primary)' },
    { label: 'Blocked Threats', value: stats?.transactions?.fraudulentTransactions?.toLocaleString() || '--', icon: ShieldAlert, trend: '-2.1%', up: false, color: 'var(--tertiary)' },
    { label: 'Fraud Rate', value: stats?.transactions?.fraudRate || '0.00%', icon: TrendingUp, trend: 'STABLE', up: null, color: 'var(--success)' },
  ];

  return (
    <div className="p-5 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight" style={{ color: 'var(--on-background)' }}>Security Command</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-dim)' }}>Real-time inference · Active telemetry</p>
        </div>
        <div className="flex gap-2.5">
          <button onClick={handleSimulateNormal} disabled={simulating}
            className="btn-ghost flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-50"
          ><FileText className="w-3.5 h-3.5" /> Export Logs</button>
          <button onClick={handleSimulateNormal} disabled={simulating}
            className="btn-primary flex items-center gap-2 px-5 py-2 text-xs disabled:opacity-50"
          ><Activity className="w-3.5 h-3.5" /> Inject Safe</button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs font-medium animate-slide-in"
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
        ><ServerCrash className="w-4 h-4" />{error}</div>
      )}

      {/* KPI Cards — Tonal Layering, No Borders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="rounded-2xl p-5 transition-smooth relative overflow-hidden"
              style={{ background: 'var(--surface-low)' }}
            >
              {/* Subtle gradient surface texture */}
              <div className="absolute inset-0 opacity-30" style={{ background: 'var(--gradient-surface)' }} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--on-surface-muted)' }}>{card.label}</p>
                  <Icon className="w-4 h-4" style={{ color: 'var(--primary-fixed-dim)' }} />
                </div>
                <div className="flex items-end justify-between">
                  <p className="font-display text-3xl lg:text-4xl font-bold tracking-tight" style={{ color: 'var(--on-background)' }}>{card.value}</p>
                  {card.up !== null ? (
                    <div className="flex items-center gap-1 text-[11px] font-semibold font-mono"
                      style={{ color: card.up ? 'var(--success)' : 'var(--tertiary)' }}
                    >
                      {card.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {card.trend}
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold font-mono" style={{ color: 'var(--success)' }}>~ {card.trend}</span>
                  )}
                </div>
                {/* Color accent bar */}
                <div className="mt-4 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${card.color}, transparent)`, opacity: 0.5 }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid — Asymmetric: 65% chart / 35% feed */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Velocity Chart — 65% */}
        <div className="xl:col-span-8 rounded-2xl p-5 relative overflow-hidden"
          style={{ background: 'var(--surface-low)' }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: 'var(--gradient-surface)' }} />
          <div className="relative">
            <div className="flex justify-between items-start mb-1">
              <div>
                <h3 className="font-display text-base font-bold" style={{ color: 'var(--on-background)' }}>Velocity Overlay</h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--on-surface-muted)' }}>Transaction throughput vs. Detection latency</p>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                  <span style={{ color: 'var(--on-surface-dim)' }}>Ingestion</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'var(--error)' }} />
                  <span style={{ color: 'var(--on-surface-dim)' }}>Threats</span>
                </div>
              </div>
            </div>
            <TimeSeriesGraph data={transactions} />
          </div>
        </div>

        {/* Live Feed — 35% */}
        <div className="xl:col-span-4 rounded-2xl p-4 flex flex-col overflow-hidden"
          style={{ background: 'var(--surface-low)', maxHeight: '500px' }}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--on-background)' }}>Live Feed</h3>
            <span className="text-[9px] font-semibold uppercase tracking-wider animate-glow-pulse" style={{ color: 'var(--error)' }}>Streaming</span>
          </div>
          <div className="overflow-y-auto space-y-1.5 flex-grow">
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--on-surface-muted)' }}>
                <Activity className="w-5 h-5 opacity-30" />
                <p className="text-[10px]">Awaiting telemetry...</p>
              </div>
            ) : transactions.slice(0, 15).map((tx) => <TransactionCard key={tx._id} tx={tx} isNew={tx.isNew} />)}
          </div>
        </div>
      </div>

      {/* Bottom: Threats + Risk Gauge */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Risk Gauge */}
        <div className="xl:col-span-3 rounded-2xl p-5 flex flex-col items-center justify-center"
          style={{ background: 'var(--surface-low)' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--on-surface-muted)' }}>Active Risk Level</p>
          <FraudGauge score={activeFraudScore} />
          <div className="mt-4 rounded-xl px-4 py-2 w-full text-center" style={{ background: 'var(--surface-container)' }}>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full animate-glow-pulse" style={{ background: 'var(--success)', boxShadow: 'var(--glow-success)' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--success)' }}>Model: Online</span>
            </div>
          </div>
        </div>

        {/* Actionable Threats */}
        <div className="xl:col-span-9 rounded-2xl p-5 overflow-hidden flex flex-col"
          style={{ background: 'var(--surface-low)' }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-display text-base font-bold" style={{ color: 'var(--on-background)' }}>Actionable Threats</h3>
            <button className="text-[10px] font-semibold cursor-pointer transition-smooth" style={{ color: 'var(--primary)' }}>Resolve All Alerts</button>
          </div>
          <div className="overflow-y-auto flex-grow" style={{ maxHeight: '280px' }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.length === 0 ? (
                <div className="col-span-full py-10 flex flex-col items-center" style={{ color: 'var(--on-surface-muted)' }}>
                  <ShieldAlert className="w-6 h-6 mb-2 opacity-20" />
                  <p className="text-xs font-medium">No active threats.</p>
                </div>
              ) : alerts.map((a) => <FraudAlertCard key={a._id || Math.random()} alert={a} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
