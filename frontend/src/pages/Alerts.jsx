import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { ShieldAlert, ServerCrash, Activity } from 'lucide-react';
import FraudAlertCard from '../components/FraudAlertCard';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState(null);
  const { lastFraudAlert } = useSocket();

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const alertsRes = await api.get('/alerts?status=new&limit=50');
        if (alertsRes.data.alerts) setAlerts(alertsRes.data.alerts);
      } catch (err) {
        setError("Failed to fetch alerts telemetry");
      }
    };
    fetchAlerts();
  }, []);

  useEffect(() => {
    if (lastFraudAlert) {
      setAlerts(prev => [lastFraudAlert, ...prev].slice(0, 50));
    }
  }, [lastFraudAlert]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
      <div className="mb-8 flex justify-between items-end border-b border-gray-200 pb-5">
        <div>
           <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
             <ShieldAlert className="w-8 h-8 text-[#ff3333]" />
             Active Threat Grid
           </h2>
           <p className="text-gray-500 font-medium text-sm mt-2">Isolated environment for deeply analyzing algorithmic triggers and anomaly responses.</p>
        </div>
        <div className="hidden md:flex bg-[#111111] px-5 py-3 rounded-xl shadow-lg items-center gap-4">
           <span className="text-[10px] font-bold uppercase tracking-widest text-[#ff3333]">Total Open Alerts</span>
           <span className="text-2xl font-bold text-white tracking-tight">{alerts.length}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 mb-6">
          <ServerCrash className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {alerts.length === 0 ? (
          <div className="col-span-full py-24 flex flex-col items-center justify-center text-gray-400">
            <Activity className="w-16 h-16 mb-6 opacity-20 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-500 mb-2">No Active Threats Detected</h3>
            <p className="text-sm font-medium text-center max-w-sm">The platform is actively scanning transactions. Any anomalies intercepted by the Isolation Forest will appear here.</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert._id || Math.random().toString()} className="h-full">
              <FraudAlertCard alert={alert} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
