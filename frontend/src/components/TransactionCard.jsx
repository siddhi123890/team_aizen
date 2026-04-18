import React, { useState } from 'react';
import { formatCurrency, formatTime } from '../utils/helpers';
import { ShoppingCart, ShieldX, ShieldCheck, ArrowRight, MapPin, Smartphone, Clock, X, BrainCircuit } from 'lucide-react';

export default function TransactionCard({ tx, isNew }) {
  const [modal, setModal] = useState(false);
  const isHigh = tx.riskLevel === 'high' || tx.isFraud;
  const isMed = tx.riskLevel === 'medium';
  const chipClass = isHigh ? 'chip-high' : isMed ? 'chip-medium' : 'chip-low';
  const Icon = isHigh ? ShieldX : isMed ? ShoppingCart : ShieldCheck;
  const iconBg = isHigh ? 'rgba(255,59,92,0.12)' : isMed ? 'rgba(255,179,0,0.12)' : 'rgba(0,212,255,0.12)';
  const iconColor = isHigh ? 'var(--error)' : isMed ? 'var(--warning)' : 'var(--primary)';

  return (
    <>
      <div onClick={() => setModal(true)}
        className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-smooth animate-slide-in ${isNew ? 'glow-live' : ''}`}
        style={{ background: isNew ? 'var(--surface-container)' : 'var(--surface-lowest)' }}
      >
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-bold tabular-nums" style={{ color: isHigh ? 'var(--error)' : 'var(--on-surface)' }}>
              {formatCurrency(tx.amount)}
            </span>
          </div>
          <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--on-surface-muted)' }}>
            ID: {tx._id?.slice(-6).toUpperCase()}-TX
          </p>
        </div>

        {/* Risk chip + time */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`${chipClass} text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md`}>
            {tx.riskLevel} Risk
          </span>
          <span className="text-[9px] font-mono" style={{ color: 'var(--on-surface-muted)' }}>
            {formatTime(tx.timestamp).split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(8px)' }} onClick={() => setModal(false)} />
          <div className="relative glass-panel rounded-2xl w-full max-w-md overflow-hidden animate-fade-in" style={{ boxShadow: 'var(--shadow-float)' }}>
            <div className="px-5 py-4 flex justify-between items-center ghost-border-b">
              <h3 className="font-display text-sm font-bold" style={{ color: 'var(--on-background)' }}>Transfer Intelligence</h3>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg cursor-pointer transition-smooth" style={{ color: 'var(--on-surface-dim)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center p-4 rounded-xl" style={{ background: 'var(--surface-lowest)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--on-surface-muted)' }}>Amount</p>
                  <p className="font-display text-2xl font-bold" style={{ color: isHigh ? 'var(--error)' : 'var(--on-surface)' }}>{formatCurrency(tx.amount)}</p>
                </div>
                <div className="text-right">
                  <span className={`${chipClass} text-[10px] font-bold uppercase px-2.5 py-1 rounded-md`}>{tx.riskLevel}</span>
                  <p className="text-[11px] font-mono mt-1.5" style={{ color: 'var(--on-surface-muted)' }}>Score: <b style={{ color: 'var(--on-background)' }}>{(tx.fraudScore || 0).toFixed(3)}</b></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[{ l: 'Sender', v: tx.userId }, { l: 'Receiver', v: tx.receiverId || 'External' }].map((x, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface-lowest)' }}>
                    <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--on-surface-muted)' }}>{x.l}</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{x.v}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5">
                {[
                  { icon: MapPin, l: 'Location', v: tx.location },
                  { icon: Smartphone, l: 'Device', v: tx.deviceId, mono: true },
                  { icon: Clock, l: 'Timestamp', v: formatTime(tx.timestamp), mono: true },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(0,212,255,0.08)', color: 'var(--primary-fixed-dim)' }}>
                      <r.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--on-surface-muted)' }}>{r.l}</p>
                      <p className={`text-xs font-medium truncate ${r.mono ? 'font-mono' : ''}`} style={{ color: 'var(--on-surface)' }}>{r.v}</p>
                    </div>
                  </div>
                ))}
              </div>

              {tx.reason && (
                <div className="p-3 rounded-xl" style={{ background: isHigh ? 'rgba(255,59,92,0.06)' : 'var(--surface-lowest)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 flex items-center gap-1" style={{ color: isHigh ? 'var(--on-error-container)' : 'var(--on-surface-muted)' }}>
                    <BrainCircuit className="w-3 h-3" /> AI Analysis
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: 'var(--on-surface)' }}>{tx.reason.replace(/[⚠️🚨🔥]/g, '')}</p>
                </div>
              )}
            </div>

            {isHigh && (
              <div className="px-5 py-3 ghost-border-b flex justify-end gap-2" style={{ borderTop: '1px solid var(--outline)' }}>
                <button onClick={() => setModal(false)} className="btn-ghost px-4 py-1.5 text-xs">Dismiss</button>
                <button className="btn-danger px-4 py-1.5 text-xs" onClick={() => setModal(false)}>Block User</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
