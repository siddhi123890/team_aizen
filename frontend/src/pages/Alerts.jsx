import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { ShieldAlert, ServerCrash, Activity, RefreshCw } from 'lucide-react';
import FraudAlertCard from '../components/FraudAlertCard';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { lastFraudAlert } = useSocket();

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const r = await api.get('/alerts?status=new&limit=50');
      // axiosInstance returns response.data, so r is already the data object
      const alertsData = r.data?.alerts || r.alerts || [];
      setAlerts(alertsData);
    } catch (e) {
      console.error('Alerts fetch error:', e);
      setError("Failed to fetch alerts. Click retry to try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    if (lastFraudAlert) setAlerts(p => [lastFraudAlert, ...p].slice(0, 50));
  }, [lastFraudAlert]);

  return (
    <div className="p-5 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--on-background)' }}>
            <ShieldAlert className="w-6 h-6" style={{ color: 'var(--tertiary)' }} /> Threat Alerts
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--on-surface-muted)' }}>Anomaly isolation and response queue</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAlerts} className="p-2 rounded-lg cursor-pointer transition-smooth"
            style={{ color: 'var(--on-surface-dim)' }} title="Refresh"
          ><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <div className="rounded-xl px-4 py-2.5 flex items-center gap-3" style={{ background: 'var(--surface-low)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tertiary)' }}>Open</span>
            <span className="font-display text-xl font-bold" style={{ color: 'var(--on-background)' }}>{alerts.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between p-3 rounded-xl text-xs font-medium mb-4"
          style={{ background: 'var(--error-container)', color: 'var(--on-error-container)' }}
        >
          <div className="flex items-center gap-2"><ServerCrash className="w-4 h-4" />{error}</div>
          <button onClick={fetchAlerts} className="px-3 py-1 rounded-lg font-semibold cursor-pointer"
            style={{ background: 'var(--error)', color: 'white' }}
          >Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {alerts.length === 0 && !loading ? (
          <div className="col-span-full py-16 flex flex-col items-center" style={{ color: 'var(--on-surface-muted)' }}>
            <Activity className="w-10 h-10 mb-3 opacity-20" />
            <p className="font-display text-sm font-semibold mb-1" style={{ color: 'var(--on-surface-dim)' }}>No active threats</p>
            <p className="text-xs">Anomalies will appear here</p>
          </div>
        ) : alerts.map((a, i) => (
          <div key={a._id || Math.random()} className="animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
            <FraudAlertCard alert={a} />
          </div>
        ))}
      </div>
    </div>
  );
}
