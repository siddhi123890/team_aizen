import React, { useState } from 'react';
import { ShieldAlert, BrainCircuit, Clock, ArrowRight, DollarSign, User, X, MapPin, Smartphone } from 'lucide-react';
import { formatCurrency, formatTime } from '../utils/helpers';

export default function FraudAlertCard({ alert }) {
  const [modal, setModal] = useState(false);
  if (!alert) return null;
  const tx = alert.transaction || alert;
  const reasonText = tx.reason || alert.reason || "Fraudulent pattern detected";
  const reasonTags = reasonText.replace(/[⚠️🚨🔥]/g, '').split(/\s*\|\s*/).filter(t => t.trim().length > 0).slice(0, 4);

  return (
    <>
      <div className="rounded-2xl p-6 transition-smooth cursor-pointer group relative overflow-hidden"
        style={{ background: 'var(--surface-low)', border: '1px solid var(--outline)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08)' }}
        onClick={() => setModal(true)}
      >
        {/* Header — Alert + score */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--tertiary)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--tertiary)' }}>Security Alert</span>
          </div>
          <span className="chip-high text-[9px] font-mono font-bold px-2 py-0.5 rounded-md">{(tx.fraudScore || 0).toFixed(2)}</span>
        </div>

        {/* Amount + Origin */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--on-surface-muted)' }} />
            <div>
              <p className="text-[9px] font-semibold uppercase" style={{ color: 'var(--on-surface-muted)' }}>Amount</p>
              <p className="font-display text-base font-bold tabular-nums" style={{ color: 'var(--on-surface)' }}>{formatCurrency(tx.amount)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--on-surface-muted)' }} />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase" style={{ color: 'var(--on-surface-muted)' }}>Origin</p>
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{tx.userId}</p>
            </div>
          </div>
        </div>

        {/* Reason tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {reasonTags.map((tag, i) => (
            <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={{ background: 'rgba(255,107,53,0.08)', color: 'var(--tertiary)' }}
            >{tag.trim()}</span>
          ))}
        </div>

        {/* Footer — time + investigate */}
        <div className="mt-auto pt-2 flex items-center justify-between" style={{ borderTop: '1px solid var(--outline)' }}>
          <span className="text-[10px] font-mono flex items-center gap-1" style={{ color: 'var(--on-surface-muted)' }}>
            <Clock className="w-3 h-3" />{formatTime(tx.timestamp || new Date())}
          </span>
          <span className="text-[10px] font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all"
            style={{ color: 'var(--tertiary)' }}
          >
            Investigate <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'var(--modal-backdrop)', backdropFilter: 'blur(12px)' }} onClick={() => setModal(false)} />
          <div className="relative glass-panel rounded-2xl w-full max-w-lg overflow-hidden animate-fade-in" style={{ boxShadow: 'var(--shadow-float)' }}>
            <div className="px-5 py-4 flex justify-between items-center ghost-border-b">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" style={{ color: 'var(--tertiary)' }} />
                <h3 className="font-display text-sm font-bold" style={{ color: 'var(--on-background)' }}>Threat Investigation</h3>
              </div>
              <button onClick={() => setModal(false)} className="p-1 rounded-lg cursor-pointer" style={{ color: 'var(--on-surface-dim)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,107,53,0.06)' }}>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--on-surface-muted)' }}>Flagged Amount</p>
                  <p className="font-display text-2xl font-bold" style={{ color: 'var(--on-surface)' }}>{formatCurrency(tx.amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--on-surface-muted)' }}>Risk Score</p>
                  <p className="font-display text-2xl font-bold font-mono" style={{ color: 'var(--tertiary)' }}>{(tx.fraudScore || 0).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Sender', v: tx.userId },
                  { l: 'Receiver', v: tx.receiverId || 'External' },
                  { l: 'Location', v: tx.location || 'Unknown' },
                  { l: 'Device', v: tx.deviceId || 'N/A' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface-lowest)' }}>
                    <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: 'var(--on-surface-muted)' }}>{item.l}</p>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--on-surface)' }}>{item.v}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-lowest)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--tertiary)' }}>
                  <BrainCircuit className="w-3 h-3" /> AI Analysis
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--on-surface)' }}>{reasonText.replace(/[⚠️🚨🔥]/g, '')}</p>
              </div>
            </div>

            <div className="px-5 py-3 flex justify-end gap-2" style={{ borderTop: '1px solid var(--outline)' }}>
              <button onClick={() => setModal(false)} className="btn-ghost px-4 py-1.5 text-xs">Dismiss</button>
              <button onClick={() => setModal(false)} className="btn-primary px-4 py-1.5 text-xs">Mark Reviewed</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
