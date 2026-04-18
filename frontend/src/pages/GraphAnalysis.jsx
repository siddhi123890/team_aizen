import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatTime } from '../utils/helpers';
import { Network } from 'lucide-react';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-panel rounded-xl p-3 text-[11px]" style={{ boxShadow: 'var(--shadow-float)' }}>
      <p className="font-mono mb-1" style={{ color: 'var(--on-surface-muted)' }}>{label}</p>
      <p className="font-display text-lg font-bold" style={{ color: d.isFraud ? 'var(--error)' : 'var(--on-surface)' }}>{formatCurrency(d.amount)}</p>
      <p className="mt-1" style={{ color: 'var(--on-surface-dim)' }}>{d.userId} → {d.receiverId || 'Ext'}</p>
    </div>
  );
};

export default function GraphAnalysis() {
  const [data, setData] = useState([]);
  const { lastTransaction } = useSocket();

  useEffect(() => { (async () => { try { const r = await api.get('/transactions?limit=100'); const tx = r.data?.transactions || r.transactions || []; setData(tx); } catch(e){} })(); }, []);
  useEffect(() => { if (lastTransaction) setData(p => [lastTransaction, ...p].slice(0, 100)); }, [lastTransaction]);

  const cd = data.map(tx => ({ time: formatTime(tx.timestamp), amount: tx.amount, fraudScore: tx.fraudScore, isFraud: tx.isFraud, userId: tx.userId, receiverId: tx.receiverId })).reverse();
  const sd = cd.map(c => ({ ...c, Safe: c.isFraud ? 0 : c.amount, Fraud: c.isFraud ? c.amount : 0 }));

  return (
    <div className="p-5 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--on-background)' }}>
          <Network className="w-6 h-6" style={{ color: 'var(--primary)' }} /> Risk Analytics
        </h1>
        <p className="text-xs mt-1" style={{ color: 'var(--on-surface-muted)' }}>Transaction flow vs. threat mapping</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 rounded-2xl p-5" style={{ background: 'var(--surface-low)' }}>
          <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--on-background)' }}>Transaction Flow</h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cd} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs><linearGradient id="ga2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00D4FF" stopOpacity={0.15}/><stop offset="95%" stopColor="#00D4FF" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,196,222,0.06)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--on-surface-muted)" fontSize={9} tickMargin={8} minTickGap={30} />
                <YAxis stroke="var(--on-surface-muted)" fontSize={9} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="amount" stroke="#00D4FF" strokeWidth={2} fillOpacity={1} fill="url(#ga2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="xl:col-span-1 rounded-2xl p-5" style={{ background: 'var(--surface-low)' }}>
          <h3 className="font-display text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--on-background)' }}>Anomaly Split</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sd} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,196,222,0.06)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--on-surface-muted)" fontSize={9} tickMargin={8} minTickGap={30} />
                <YAxis stroke="var(--on-surface-muted)" fontSize={9} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}`} />
                <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,212,255,0.04)' }} />
                <Bar dataKey="Safe" stackId="a" fill="#00D4FF" fillOpacity={0.6} radius={[0,0,3,3]} />
                <Bar dataKey="Fraud" stackId="a" fill="#FF3B5C" fillOpacity={0.7} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-4 text-[10px] font-semibold" style={{ color: 'var(--on-surface-muted)' }}>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--primary)' }}/>Safe</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded" style={{ background: 'var(--error)' }}/>Threat</div>
          </div>
        </div>
      </div>
    </div>
  );
}
