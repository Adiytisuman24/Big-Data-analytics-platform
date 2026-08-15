import { Suspense } from 'react';
import { fetchTraffic, fetchErrors, fetchLatency } from '@/lib/api';
import StatCard from '@/components/StatCard';
import { TrafficChart, LatencyChart, ErrorPieChart } from '@/components/Charts';

export const revalidate = 15;

function Zap({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function AlertTriangle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function Clock({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function Activity({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export default async function DashboardPage() {
  const [trafficData, errorData, latencyData] = await Promise.all([
    fetchTraffic(),
    fetchErrors(),
    fetchLatency(),
  ]);

  const totalRequests = trafficData.reduce((acc: number, d: { requests: number }) => acc + d.requests, 0);
  const totalErrors = errorData.reduce((acc: number, d: { error_count: number }) => acc + d.error_count, 0);
  const errorRate = totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(1) : '0';
  const avgLatency = latencyData.length > 0
    ? Math.round(latencyData.reduce((acc: number, d: { avg_latency_ms: number }) => acc + d.avg_latency_ms, 0) / latencyData.length)
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0f1e' }}>
      {/* Header */}
      <header
        className="border-b sticky top-0 z-50 backdrop-blur-md"
        style={{ borderColor: '#1f2937', background: 'rgba(10,15,30,0.85)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">AI Agent Analytics</h1>
              <p className="text-xs" style={{ color: '#6b7280' }}>Real-time · Kafka · Druid · Iceberg</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
              style={{ background: '#10b98120', color: '#10b981' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Events (1h)"
            value={totalRequests.toLocaleString()}
            icon={<Zap size={20} />}
            color="#6366f1"
            trend="up"
          />
          <StatCard
            title="Error Rate"
            value={`${errorRate}%`}
            subtitle="Last 24 hours"
            icon={<AlertTriangle size={20} />}
            color="#ef4444"
            trend={Number(errorRate) > 5 ? 'up' : 'down'}
          />
          <StatCard
            title="Avg Latency"
            value={`${avgLatency} ms`}
            subtitle="All models"
            icon={<Clock size={20} />}
            color="#f59e0b"
          />
          <StatCard
            title="Models Tracked"
            value={latencyData.length}
            icon={<Activity size={20} />}
            color="#10b981"
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<div className="rounded-2xl h-72 animate-pulse" style={{ background: '#111827' }} />}>
            <TrafficChart data={trafficData} />
          </Suspense>
          <Suspense fallback={<div className="rounded-2xl h-72 animate-pulse" style={{ background: '#111827' }} />}>
            <LatencyChart data={latencyData} />
          </Suspense>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Suspense fallback={<div className="rounded-2xl h-72 animate-pulse" style={{ background: '#111827' }} />}>
            <ErrorPieChart data={errorData} />
          </Suspense>

          {/* Top models table */}
          <div
            className="lg:col-span-2 rounded-2xl p-6 border"
            style={{ background: '#111827', borderColor: '#1f2937' }}
          >
            <h3 className="text-base font-semibold text-white mb-4">Model Latency Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: '#6b7280' }}>
                    <th className="text-left py-2 pr-4 font-medium">Model</th>
                    <th className="text-right py-2 pr-4 font-medium">Avg Latency</th>
                    <th className="text-right py-2 font-medium">Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {latencyData.map((row: { model: string; avg_latency_ms: number; requests: number }, i: number) => (
                    <tr
                      key={i}
                      className="border-t"
                      style={{ borderColor: '#1f2937' }}
                    >
                      <td className="py-3 pr-4 font-medium text-white">{row.model}</td>
                      <td className="py-3 pr-4 text-right" style={{ color: '#f59e0b' }}>
                        {Math.round(row.avg_latency_ms).toLocaleString()} ms
                      </td>
                      <td className="py-3 text-right" style={{ color: '#9ca3af' }}>
                        {(row.requests ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {latencyData.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center" style={{ color: '#4b5563' }}>
                        No data yet — start the producer to generate events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Stack info */}
        <section
          className="rounded-2xl p-6 border"
          style={{ background: 'linear-gradient(135deg, #111827 0%, #1a1040 100%)', borderColor: '#312e81' }}
        >
          <h3 className="text-sm font-semibold text-white mb-4">Technology Stack</h3>
          <div className="flex flex-wrap gap-2">
            {['Apache Kafka', 'Confluent Schema Registry', 'Apache Avro', 'Apache Druid', 'Apache Iceberg', 'Apache Spark', 'MinIO (S3)', 'Python Producer', 'Go API', 'Java Spring Boot API', 'Next.js Dashboard', 'Prometheus', 'Grafana', 'Kubernetes'].map(tech => (
              <span
                key={tech}
                className="text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ background: '#6366f120', color: '#a5b4fc', border: '1px solid #6366f130' }}
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
