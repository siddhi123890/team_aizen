export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatTime = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'text-rose-500';
    case 'medium':
      return 'text-amber-500';
    case 'low':
      return 'text-emerald-400';
    default:
      return 'text-slate-400';
  }
};

export const getRiskBgColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'bg-rose-500/20 border-rose-500/50';
    case 'medium':
      return 'bg-amber-500/20 border-amber-500/50';
    case 'low':
      return 'bg-emerald-400/20 border-emerald-400/50';
    default:
      return 'bg-slate-700/50 border-slate-600/50';
  }
};
