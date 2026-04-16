import React, { useState, useEffect } from 'react';
import api from '../api/axiosInstance';
import { useSocket } from '../hooks/useSocket';
import { Activity, ShieldAlert, CheckCircle, Smartphone, MapPin, MousePointerClick } from 'lucide-react';
import { formatCurrency, formatTime } from '../utils/helpers';
import TransactionCard from '../components/TransactionCard'; // Kept specifically for opening the modal purely headless inside the table if needed, but we will inline a cleaner logic for tables.

export default function LiveFeed() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);
  const { lastTransaction } = useSocket();
  const [selectedTx, setSelectedTx] = useState(null);

  useEffect(() => {
    const fetchTx = async () => {
      try {
        const txRes = await api.get('/transactions?limit=100');
        if (txRes.data.transactions) setTransactions(txRes.data.transactions);
      } catch (err) {
        setError("Failed to fetch full telemetry");
      }
    };
    fetchTx();
  }, []);

  useEffect(() => {
    if (lastTransaction) {
      setTransactions(prev => [lastTransaction, ...prev].slice(0, 100));
    }
  }, [lastTransaction]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Full Telemetry Feed</h2>
        <p className="text-gray-500 font-medium text-sm mt-1">Deep minute-level visual tracking of active node pipelines.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Time Verified</th>
                <th className="px-6 py-4">Sender / Receiver</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Anomaly Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((tx) => {
                const isHighRisk = tx.riskLevel === 'high' || tx.isFraud;
                return (
                  <tr key={tx._id} className="hover:bg-blue-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedTx(tx)}>
                    <td className="px-6 py-4 font-mono text-gray-500">
                      {formatTime(tx.timestamp)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{tx.userId}</span>
                        <span className="text-xs text-gray-500">to {tx.receiverId || 'External'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${isHighRisk ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(tx.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`font-mono ${isHighRisk ? 'text-red-600 bg-red-50' : 'text-gray-500'} px-2 py-0.5 rounded`}>{(tx.fraudScore || 0).toFixed(3)}</span>
                    </td>
                    <td className="px-6 py-4">
                       <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-widest uppercase
                           ${isHighRisk ? 'bg-[#111111] text-[#ff3333]' : tx.riskLevel === 'medium' ? 'bg-[#111111] text-[#f5a623]' : 'bg-[#111111] text-[#00d084]'}`}>
                         <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                         {tx.riskLevel}
                       </div>
                    </td>
                    <td className="px-6 py-4">
                       <MousePointerClick className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {transactions.length === 0 && (
             <div className="p-16 text-center text-gray-400">
               <Activity className="w-8 h-8 mx-auto mb-4 opacity-20" />
               <p className="font-medium text-sm">No transactions broadcasted to telemetry yet.</p>
             </div>
          )}
        </div>
      </div>

      {/* Reused logic manually for inline modal detail overtable */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#F2F2F2]/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedTx(null)} />
          <div className="relative bg-[#111111] border border-[#333333] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Minimal Header */}
            <div className={`px-6 py-5 border-b flex justify-between items-center ${(selectedTx.riskLevel === 'high' || selectedTx.isFraud) ? 'border-[#ff3333]/20 bg-[#ff3333]/5' : 'border-[#222] bg-[#161616]'}`}>
               <h3 className="font-bold text-white text-lg flex items-center gap-2">Data Inspection</h3>
               <button onClick={() => setSelectedTx(null)} className="text-gray-500 hover:text-white p-1 bg-[#222] rounded-md transition-colors"><X className="w-4 h-4" /></button>
            </div>
            {/* Body */}
            <div className="p-6">
              <div className="bg-[#1a1a1a] p-4 rounded-xl border border-[#2a2a2a] mb-5">
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Transfer Amount</p>
                 <p className="text-3xl font-bold text-white">{formatCurrency(selectedTx.amount)}</p>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-gray-400"><MapPin className="w-5 h-5"/></div>
                  <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Geolocation</p><p className="text-sm font-medium text-gray-300">{selectedTx.location}</p></div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#222222] border border-[#333333] flex items-center justify-center text-gray-400"><Smartphone className="w-5 h-5"/></div>
                  <div><p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Device Matrix</p><p className="text-sm font-mono text-gray-300">{selectedTx.deviceId}</p></div>
                </div>
              </div>
              {selectedTx.reason && (
                 <div className="mt-6 p-4 bg-[#ff3333]/5 border border-[#ff3333]/20 rounded-xl">
                   <p className="text-[10px] uppercase font-bold tracking-widest text-[#ff3333] mb-1">AI Reason</p>
                   <p className="text-sm font-medium text-white">{selectedTx.reason.replace(/[⚠️🚨🔥]/g, '')}</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
