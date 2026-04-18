import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatTime } from '../utils/helpers';

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="glass-panel rounded-xl p-3 min-w-[160px] text-[11px]" style={{ boxShadow: 'var(--shadow-float)' }}>
      <p className="font-mono mb-1" style={{ color: 'var(--on-surface-muted)' }}>{label}</p>
      <p className="font-display text-base font-bold mb-1" style={{ color: d.isFraud ? 'var(--error)' : 'var(--on-surface)' }}>
        {formatCurrency(d.amount)}
      </p>
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span style={{ color: 'var(--on-surface-muted)' }}>Sender</span>
          <span className="font-medium" style={{ color: 'var(--on-surface)' }}>{d.userId}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--on-surface-muted)' }}>Score</span>
          <span className="font-mono font-bold" style={{ color: d.fraudScore >= 0.7 ? 'var(--error)' : d.fraudScore >= 0.3 ? 'var(--warning)' : 'var(--primary)' }}>
            {d.fraudScore.toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function TimeSeriesGraph({ data }) {
  const cd = data.map(tx => ({
    time: formatTime(tx.timestamp),
    safe: tx.isFraud ? 0 : tx.amount,
    threat: tx.isFraud ? tx.amount : 0,
    amount: tx.amount,
    fraudScore: tx.fraudScore,
    isFraud: tx.isFraud,
    userId: tx.userId,
  })).reverse();

  // Stats
  const total = cd.length;
  const fraud = cd.filter(d => d.isFraud).length;
  const avg = total > 0 ? cd.reduce((s, d) => s + d.amount, 0) / total : 0;
  const peak = total > 0 ? Math.max(...cd.map(d => d.amount)) : 0;

  return (
    <div className="mt-3">
      {/* Mini stats */}
      <div className="flex items-center gap-5 mb-4 text-[10px]">
        {[
          { l: 'Transactions', v: total, c: 'var(--primary)' },
          { l: 'Flagged', v: fraud, c: 'var(--error)' },
          { l: 'Avg', v: formatCurrency(avg), c: 'var(--success)' },
          { l: 'Peak', v: formatCurrency(peak), c: 'var(--warning)' },
        ].map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.c }} />
            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-muted)' }}>{s.l}</span>
            <span className="font-display font-bold" style={{ color: 'var(--on-background)' }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Bar Chart */}
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cd} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="barSafe" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#00D4FF" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="barThreat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF3B5C" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#FF3B5C" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(176,196,222,0.06)" vertical={false} />
            <XAxis dataKey="time" stroke="var(--on-surface-muted)" fontSize={9} tickMargin={8} minTickGap={40} />
            <YAxis stroke="var(--on-surface-muted)" fontSize={9} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,212,255,0.04)' }} />
            <Bar dataKey="safe" stackId="a" fill="url(#barSafe)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="threat" stackId="a" fill="url(#barThreat)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
