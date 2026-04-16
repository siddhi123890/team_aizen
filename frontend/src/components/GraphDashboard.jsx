import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatTime } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const isFraud = payload[0].payload.isFraud;
    return (
      <div className={`p-3 rounded-lg bg-white border shadow-lg ${isFraud ? 'border-red-200' : 'border-gray-200'}`}>
        <p className="text-gray-500 text-xs mb-1 font-mono">{label}</p>
        <p className={`text-lg font-bold ${isFraud ? 'text-red-600' : 'text-gray-900'} mb-1`}>
          {formatCurrency(payload[0].value)}
        </p>
        <div className="space-y-0.5">
          <p className="text-xs text-gray-600 font-medium"><span className="text-gray-400">User:</span> {payload[0].payload.userId}</p>
          <p className="text-xs text-gray-600 font-medium"><span className="text-gray-400">Algorithmic Score:</span> {payload[0].payload.fraudScore.toFixed(3)}</p>
        </div>
        {isFraud && (
          <div className="mt-2 pt-2 border-t border-red-100">
            <p className="text-[10px] font-bold text-red-600 px-2 py-0.5 bg-red-50 rounded inline-block">FRAUD METRICS DETECTED</p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function TimeSeriesGraph({ data }) {
  const chartData = data.map(tx => ({
    time: formatTime(tx.timestamp),
    amount: tx.amount,
    fraudScore: tx.fraudScore,
    isFraud: tx.isFraud,
    userId: tx.userId
  })).reverse();

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorAmountSafe" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAmountDanger" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af" 
            fontSize={10} 
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            stroke="#9ca3af" 
            fontSize={10} 
            tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="amount" 
            stroke="#2563eb" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorAmountSafe)" 
            activeDot={{ r: 5, strokeWidth: 0, fill: '#2563eb' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
