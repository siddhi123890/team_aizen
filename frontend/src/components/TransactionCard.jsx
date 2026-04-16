import React, { useState } from 'react';
import { formatCurrency, formatTime } from '../utils/helpers';
import { ArrowRight, MapPin, Smartphone, Clock, X, ShieldAlert, Activity, ArrowUpRight, BrainCircuit } from 'lucide-react';

export default function TransactionCard({ tx, isNew }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isHighRisk = tx.riskLevel === 'high' || tx.isFraud;

  // Premium colors against dark card backgrounds
  const getRiskStyles = () => {
    if (isHighRisk) return { bg: 'bg-[#ff3333]/10', text: 'text-[#ff3333]', border: 'border-[#ff3333]/20', dot: 'bg-[#ff3333]' };
    if (tx.riskLevel === 'medium') return { bg: 'bg-[#f5a623]/10', text: 'text-[#f5a623]', border: 'border-[#f5a623]/20', dot: 'bg-[#f5a623]' };
    return { bg: 'bg-[#00d084]/10', text: 'text-[#00d084]', border: 'border-[#00d084]/20', dot: 'bg-[#00d084]' };
  };

  const risk = getRiskStyles();

  return (
    <>
      <div 
        onClick={() => setIsModalOpen(true)}
        className={`group p-5 mb-4 cursor-pointer transition-all duration-300 rounded-2xl border
          ${isNew ? 'bg-[#1a1a1a] border-[#333333] shadow-[0_0_20px_rgba(0,0,0,0.1)]' : 'bg-[#111111] border-[#222222]'}
          hover:bg-[#1a1a1a] hover:border-[#444444] hover:shadow-xl`}
      >
        {/* Top Header : Status Label & Arrow */}
        <div className="flex justify-between items-center mb-5">
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5 border ${risk.bg} ${risk.text} ${risk.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot} ${isHighRisk ? 'animate-pulse' : ''}`} />
            {tx.riskLevel} Risk
          </div>
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222222] group-hover:bg-[#333333] transition-colors border border-[#333333]">
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-white transform -rotate-45 group-hover:rotate-0 transition-transform duration-300" />
          </div>
        </div>

        {/* Main Content : Amount */}
        <div className="mb-4">
          <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Transfer Amount</p>
          <p className={`text-2xl font-semibold tracking-tight ${isHighRisk ? 'text-[#ff3333]' : 'text-white'}`}>
            {formatCurrency(tx.amount)}
          </p>
        </div>

        {/* Bottom Route Details */}
        <div className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] group-hover:bg-[#222222] transition-colors">
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">From</p>
            <p className="text-sm font-medium text-gray-300 truncate">{tx.userId}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
          <div className="flex-1 overflow-hidden text-right">
            <p className="text-[10px] uppercase text-gray-500 font-bold mb-0.5">To</p>
            <p className="text-sm font-medium text-gray-300 truncate">{tx.receiverId || 'External'}</p>
          </div>
        </div>
      </div>

      {/* Pop-up Modal overlay (Matches dark aesthetic but centered) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#F2F2F2]/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          />
          <div className="relative bg-[#111111] border border-[#333333] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${isHighRisk ? 'border-[#ff3333]/20 bg-[#ff3333]/5' : 'border-[#222] bg-[#161616]'}`}>
              <div className="flex items-center gap-3">
                {isHighRisk ? <ShieldAlert className="w-5 h-5 text-[#ff3333]" /> : <Activity className="w-5 h-5 text-[#00d084]" />}
                <h3 className="font-bold text-white text-lg">Transfer Intelligence</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-white bg-[#222222] p-1.5 rounded-lg hover:bg-[#333333] transition-colors border border-[#333333]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a]">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Amount</p>
                  <p className={`text-3xl font-bold ${isHighRisk ? 'text-[#ff3333]' : 'text-white'}`}>
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-widest ${risk.bg} ${risk.text} ${risk.border}`}>
                    {tx.riskLevel}
                  </span>
                  <p className="text-xs text-gray-500 font-mono mt-2 flex justify-end gap-1.5 font-medium">
                     Score: <span className="text-gray-300">{(tx.fraudScore || 0).toFixed(3)}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a]">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Sender Node</p>
                  <p className="text-sm font-semibold text-gray-200">{tx.userId}</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a]">
                  <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Receiver Node</p>
                  <p className="text-sm font-semibold text-gray-200">{tx.receiverId || 'External Entity'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-gray-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Geolocation</p>
                    <p className="text-sm font-medium text-gray-300">{tx.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-gray-400">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Digital Hash</p>
                    <p className="text-sm font-mono text-gray-300">{tx.deviceId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-gray-400">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time Verified</p>
                    <p className="text-sm font-mono text-gray-300">{formatTime(tx.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* AI Reason */}
              {tx.reason && (
                <div className={`p-4 rounded-xl border ${isHighRisk ? 'bg-[#ff3333]/5 border-[#ff3333]/20' : 'bg-[#1a1a1a] border-[#2a2a2a]'}`}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" /> AI Engine Analysis
                  </p>
                  <p className={`text-sm font-medium leading-relaxed ${isHighRisk ? 'text-[#ff6666]' : 'text-gray-300'}`}>
                    {tx.reason.replace(/[⚠️🚨🔥]/g, '')}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            {isHighRisk && (
              <div className="bg-[#161616] p-5 border-t border-[#222] flex justify-end gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-[#222222] border border-[#333333] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors"
                >
                  Clear Flag
                </button>
                <button className="px-5 py-2.5 bg-[#ff3333] text-white text-sm font-bold rounded-xl hover:bg-[#cc0000] shadow-[0_0_15px_rgba(255,51,51,0.3)] transition-colors">
                  Isolate Node
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
