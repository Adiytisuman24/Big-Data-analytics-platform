const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085';

export async function fetchTraffic() {
  const res = await fetch(`${API_BASE}/analytics/traffic`, { next: { revalidate: 10 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchErrors() {
  const res = await fetch(`${API_BASE}/analytics/errors`, { next: { revalidate: 10 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLatency() {
  const res = await fetch(`${API_BASE}/analytics/latency`, { next: { revalidate: 10 } });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchModelStats(model: string) {
  const res = await fetch(`${API_BASE}/analytics/models/${encodeURIComponent(model)}`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function fetchAgentStats(agentId: string) {
  const res = await fetch(`${API_BASE}/analytics/agents/${encodeURIComponent(agentId)}`, {
    next: { revalidate: 10 },
  });
  if (!res.ok) return [];
  return res.json();
}
