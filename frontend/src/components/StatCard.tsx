'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export default function StatCard({ title, value, subtitle, icon, trend, color = '#6366f1' }: StatCardProps) {
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#6b7280';
  return (
    <div
      className="rounded-2xl p-6 border transition-all duration-300 hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, #111827 0%, #1a2235 100%)',
        borderColor: '#1f2937',
        boxShadow: `0 0 30px ${color}10`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
        {trend && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: `${trendColor}20`, color: trendColor }}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium" style={{ color: '#9ca3af' }}>{title}</p>
      {subtitle && <p className="text-xs mt-1" style={{ color: '#6b7280' }}>{subtitle}</p>}
    </div>
  );
}
