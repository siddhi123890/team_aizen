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

/**
 * Returns a human-friendly relative time string
 * e.g. "Just now", "2 min ago", "1 hour ago"
 */
export const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay}d ago`;
};

/**
 * Color classes for risk levels — using new soft palette
 */
export const getRiskColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'text-rose-600';
    case 'medium':
      return 'text-amber-600';
    case 'low':
      return 'text-teal-600';
    default:
      return 'text-slate-500';
  }
};

export const getRiskBgColor = (riskLevel) => {
  switch (riskLevel?.toLowerCase()) {
    case 'high':
      return 'bg-rose-50 border-rose-200';
    case 'medium':
      return 'bg-amber-50 border-amber-200';
    case 'low':
      return 'bg-teal-50 border-teal-200';
    default:
      return 'bg-slate-50 border-slate-200';
  }
};

/**
 * Severity level from fraud score (0-1)
 * Returns { level, label, friendlyText }
 */
export const getSeverity = (fraudScore) => {
  const score = Number(fraudScore) || 0;
  if (score > 0.7) {
    return {
      level: 'high',
      label: 'High Risk',
      friendlyText: 'Suspicious activity detected',
      color: 'rose',
    };
  }
  if (score > 0.3) {
    return {
      level: 'medium',
      label: 'Needs Attention',
      friendlyText: 'Some unusual patterns found',
      color: 'amber',
    };
  }
  return {
    level: 'low',
    label: 'Low Concern',
    friendlyText: "You're looking safe",
    color: 'teal',
  };
};

/**
 * Friendly status badge text
 */
export const getStatusLabel = (riskLevel, isFraud) => {
  if (isFraud || riskLevel === 'high') return 'Flagged';
  if (riskLevel === 'medium') return 'Suspicious';
  return 'Safe';
};
