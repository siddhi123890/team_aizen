import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { formatCurrency, formatTime } from '../utils/helpers';
import { Network, Activity } from 'lucide-react';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className={`p-4 rounded-xl bg-[#111111] border shadow-2xl ${data.isFraud ? 'border-[#ff3333]' : 'border-[#333333]'}`}>
        <p className="text-gray-400 text-xs mb-1 font-mono">{label}</p>
        <p className={`text-2xl font-bold ${data.isFraud ? 'text-[#ff3333]' : 'text-white'} mb-2 tracking-tight`}>
          {formatCurrency(data.amount)}
        </p>
        <div className="space-y-1">
          <p className="text-[11px] text-gray-300 font-bold uppercase tracking-widest"><span className="text-gray-500">Route:</span> {data.userId} → {data.receiverId || 'Ext'}</p>
          <p className="text-[11px] text-gray-300 font-bold uppercase tracking-widest"><span className="text-gray-500">Risk Matrix:</span> {data.fraudScore.toFixed(3)}</p>
        </div>
      </div>
    );
  }
  return null;
};

export default function GraphAnalysis() {
  const [data, setData] = useState([]);
  const { lastTransaction } = useSocket();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/transactions?limit=100');
        if (res.data.transactions) setData(res.data.transactions);
      } catch (e) {}
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (lastTransaction) setData(prev => [lastTransaction, ...prev].slice(0, 100));
  }, [lastTransaction]);

  const chartData = data.map(tx => ({
    time: formatTime(tx.timestamp),
    amount: tx.amount,
    fraudScore: tx.fraudScore,
    isFraud: tx.isFraud,
    userId: tx.userId,
    receiverId: tx.receiverId
  })).reverse();

  // Separate data into safe vs anomaly stacks mathematically
  const stackedData = chartData.map(c => ({
    time: c.time,
    SafeVolume: c.isFraud ? 0 : c.amount,
    FraudVolume: c.isFraud ? c.amount : 0,
    ...c
  }));

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <Network className="w-8 h-8 text-blue-600" />
          Volume Analytics
        </h2>
        <p className="text-gray-500 font-medium text-sm mt-1">Mathematical mapping of secure transactions against volumetric threats.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
         <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative">
            <h3 className="text-sm font-bold text-gray-900 mb-6 absolute z-10 bg-white/80 px-2 py-0.5 rounded backdrop-blur">Global Node Overlay</h3>
            <div className="h-[400px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSafe" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gDanger" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff3333" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#ff3333" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickMargin={10} minTickGap={30} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#gSafe)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
         </div>

         <div className="xl:col-span-1 bg-[#111111] rounded-2xl border border-[#222222] shadow-xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#ff3333]/10 rounded-full blur-3xl mix-blend-screen" />
            <h3 className="text-sm font-bold text-white mb-6 tracking-widest uppercase">Anomaly Distribution</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="time" stroke="#555" fontSize={10} tickMargin={10} minTickGap={30} />
                  <YAxis stroke="#555" fontSize={10} tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
                  <Tooltip content={<CustomTooltip />} cursor={{fill: '#222'}} />
                  <Bar dataKey="SafeVolume" stackId="a" fill="#00d084" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="FraudVolume" stackId="a" fill="#ff3333" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6 border-t border-[#222] pt-4 flex items-center justify-between">
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#00d084]"/><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Safe</span></div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-[#ff3333] shadow-[0_0_10px_#ff3333]"/><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Threat</span></div>
            </div>
         </div>
      </div>
    </div>
  );
}
