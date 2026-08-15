'use client';

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <div
      className="rounded-2xl p-6 border"
      style={{ background: '#111827', borderColor: '#1f2937' }}
    >
      <div className="mb-5">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        {subtitle && <p className="text-xs mt-0.5" style={{ color: '#6b7280' }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function TrafficChart({ data }: { data: { time_bucket: string; requests: number }[] }) {
  const formatted = data.slice(0, 30).reverse().map(d => ({
    time: new Date(d.time_bucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    requests: d.requests,
  }));

  return (
    <ChartCard title="Requests / Minute" subtitle="Last 30 minutes">
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted}>
          <defs>
            <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="time" stroke="#4b5563" tick={{ fontSize: 11 }} />
          <YAxis stroke="#4b5563" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1a2235', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#f9fafb' }}
          />
          <Area type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} fill="url(#trafficGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function LatencyChart({ data }: { data: { model: string; avg_latency_ms: number }[] }) {
  return (
    <ChartCard title="Avg Latency by Model" subtitle="Last 24 hours (ms)">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis type="number" stroke="#4b5563" tick={{ fontSize: 11 }} unit="ms" />
          <YAxis dataKey="model" type="category" stroke="#4b5563" tick={{ fontSize: 11 }} width={110} />
          <Tooltip
            contentStyle={{ background: '#1a2235', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            itemStyle={{ color: '#f9fafb' }}
          />
          <Bar dataKey="avg_latency_ms" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function ErrorPieChart({ data }: { data: { status: string; error_count: number }[] }) {
  return (
    <ChartCard title="Error Distribution" subtitle="By status type">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            dataKey="error_count"
            nameKey="status"
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#1a2235', border: '1px solid #374151', borderRadius: 8 }}
            itemStyle={{ color: '#f9fafb' }}
          />
          <Legend
            formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
