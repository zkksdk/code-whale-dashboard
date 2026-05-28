import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red';
  onClick?: () => void;
  trend?: { value: number; positive: boolean };
}

const colorMap = {
  blue: {
    bg: 'bg-blue-900/30',
    border: 'border-blue-800',
    icon: 'text-blue-400',
    hover: 'hover:border-blue-700',
  },
  green: {
    bg: 'bg-green-900/30',
    border: 'border-green-800',
    icon: 'text-green-400',
    hover: 'hover:border-green-700',
  },
  amber: {
    bg: 'bg-amber-900/30',
    border: 'border-amber-800',
    icon: 'text-amber-400',
    hover: 'hover:border-amber-700',
  },
  purple: {
    bg: 'bg-purple-900/30',
    border: 'border-purple-800',
    icon: 'text-purple-400',
    hover: 'hover:border-purple-700',
  },
  red: {
    bg: 'bg-red-900/30',
    border: 'border-red-800',
    icon: 'text-red-400',
    hover: 'hover:border-red-700',
  },
};

export default function StatCard({ title, value, subtitle, icon, color, onClick, trend }: StatCardProps) {
  const palette = colorMap[color];

  return (
    <div
      onClick={onClick}
      className={`stat-card border ${palette.border} ${palette.bg} ${onClick ? palette.hover + ' cursor-pointer' : ''} rounded-xl p-4 transition-all`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          {title}
        </span>
        <div className={palette.icon}>{icon}</div>
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-100">{value}</span>
        {trend && (
          <span className={`text-xs ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
            {trend.positive ? '+' : '-'}{Math.abs(trend.value)}%
          </span>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}