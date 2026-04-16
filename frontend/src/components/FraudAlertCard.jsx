import React from 'react';
import { ShieldAlert, BrainCircuit, Clock, ArrowRight } from 'lucide-react';
import { formatCurrency, formatTime } from '../utils/helpers';

export default function FraudAlertCard({ alert }) {
  if (!alert) return null;
  
  const tx = alert.transaction || alert; 

  return (
    <div className="bg-[#111111] border border-[#ff3333]/30 rounded-2xl overflow-hidden shadow-lg hover:border-[#ff3333]/60 transition-colors relative group cursor-pointer">
      {/* Side Red Accent */}
      <div className="absolute top-0 left-0 w-2 h-full bg-[#ff3333]" />
      
      <div className="p-6 pl-8">
        {/* Header Ribbon */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#ff3333] animate-pulse" />
            <h3 className="font-bold tracking-widest text-[#ff3333] text-xs uppercase">Security Alert</h3>
          </div>
          <span className="bg-[#ff3333]/10 text-[#ff6666] text-[10px] font-bold px-2.5 py-1 rounded-md border border-[#ff3333]/20 tracking-wider">
            SCORE {(tx.fraudScore || 0).toFixed(2)}
          </span>
        </div>

        {/* Data Row */}
        <div className="flex items-center justify-between mb-5">
           <div>
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Flagged Amount</p>
              <p className="font-bold text-white text-2xl tracking-tight">{formatCurrency(tx.amount)}</p>
           </div>
           <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Origin Node</p>
              <p className="text-sm font-semibold text-gray-300 max-w-[120px] truncate">{tx.userId}</p>
           </div>
        </div>

        {/* AI Explainability block */}
        <div className="mb-4 p-4 bg-[#1a1a1a] border border-[#333333] rounded-xl flex items-start gap-3 group-hover:bg-[#222222] transition-colors">
          <BrainCircuit className="w-5 h-5 text-[#ff3333] flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-gray-300 leading-snug">
            {(tx.reason || alert.reason || "Fraudulent pattern detected natively by AI Engine").replace(/[⚠️🚨🔥]/g, '')}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center border-t border-[#222222] pt-4">
          <span className="text-xs text-gray-500 font-mono font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
               {formatTime(tx.timestamp || new Date())}
          </span>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#ff3333] group-hover:text-[#ff6666] transition-colors">
            ACTION REQUIRED <ArrowRight className="w-3 h-3 transform -rotate-45 group-hover:rotate-0 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
