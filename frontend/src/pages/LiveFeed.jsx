import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { Activity, MapPin, Smartphone, Eye, X } from 'lucide-react';
import { formatCurrency, formatTime } from '../utils/helpers';

export default function LiveFeed() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const { lastTransaction } = useSocket();
  const [sel, setSel] = useState(null);

  useEffect(() => {
    (async () => { try { const r = await api.get('/transactions?limit=100'); const tx = r.data?.transactions || r.transactions || []; setTransactions(tx); } catch(e) { setError("Failed to fetch telemetry"); } })();
  }, []);
  useEffect(() => { if (lastTransaction) setTransactions(p => [lastTransaction, ...p].slice(0, 100)); }, [lastTransaction]);

  return (
    <div className="p-5 lg:p-8 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--on-background)' }}>Transaction Feed</h1>
        <p className="text-xs mt-1" style={{ color: 'var(--on-surface-muted)' }}>Full telemetry · Minute-level tracking</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--surface-low)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--on-surface-muted)', background: 'var(--surface-container)' }}>
                <th className="px-5 py-3">Time</th><th className="px-5 py-3">Sender / Receiver</th><th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Score</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-center">View</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const hi = tx.riskLevel === 'high' || tx.isFraud;
                const chipCls = hi ? 'chip-high' : tx.riskLevel === 'medium' ? 'chip-medium' : 'chip-low';
                return (
                  <tr key={tx._id} className="transition-smooth"
                    style={{ background: idx % 2 === 0 ? 'var(--surface-lowest)' : 'var(--surface-low)' }}
                  >
                    <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--on-surface-muted)' }}>{formatTime(tx.timestamp)}</td>
                    <td className="px-5 py-3">
                      <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>{tx.userId}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--on-surface-muted)' }}>→ {tx.receiverId || 'Ext'}</span>
                    </td>
                    <td className="px-5 py-3 font-display font-bold" style={{ color: hi ? 'var(--error)' : 'var(--on-surface)' }}>{formatCurrency(tx.amount)}</td>
                    <td className="px-5 py-3">
                      <span className={`${chipCls} font-mono text-xs font-semibold px-2 py-0.5 rounded-md`}>{(tx.fraudScore || 0).toFixed(3)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`${chipCls} text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md`}>{tx.riskLevel}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => setSel(tx)} className="p-1.5 rounded-lg cursor-pointer transition-smooth"
                        style={{ color: 'var(--on-surface-muted)' }}
                      ><Eye className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <div className="p-12 text-center" style={{ color: 'var(--on-surface-muted)' }}>
              <Activity className="w-6 h-6 mx-auto mb-3 opacity-25" />
              <p className="text-xs">No transactions yet.</p>
            </div>
          )}
        </div>
      </div>

      {sel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(12px)' }} onClick={() => setSel(null)} />
          <div className="relative glass-panel rounded-2xl w-full max-w-sm overflow-hidden animate-fade-in" style={{ boxShadow: 'var(--shadow-float)' }}>
            <div className="px-4 py-3 flex justify-between items-center ghost-border-b">
              <h3 className="font-display text-sm font-bold" style={{ color: 'var(--on-background)' }}>Details</h3>
              <button onClick={() => setSel(null)} className="p-1 rounded-md cursor-pointer" style={{ color: 'var(--on-surface-dim)' }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-lowest)' }}>
                <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--on-surface-muted)' }}>Amount</p>
                <p className="font-display text-2xl font-bold" style={{ color: 'var(--on-background)' }}>{formatCurrency(sel.amount)}</p>
              </div>
              {[{ i: MapPin, l: 'Location', v: sel.location }, { i: Smartphone, l: 'Device', v: sel.deviceId }].map((r, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--primary-fixed-dim)' }}><r.i className="w-3.5 h-3.5" /></div>
                  <div><p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-surface-muted)' }}>{r.l}</p><p className="text-xs font-medium" style={{ color: 'var(--on-surface)' }}>{r.v}</p></div>
                </div>
              ))}
              {sel.reason && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,107,53,0.06)' }}>
                  <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--tertiary)' }}>AI Reason</p>
                  <p className="text-xs" style={{ color: 'var(--on-surface)' }}>{sel.reason.replace(/[⚠️🚨🔥]/g, '')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
