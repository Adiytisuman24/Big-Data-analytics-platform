# Next.js Analytics Dashboard

Real-time analytics dashboard for the AI-Agent Analytics Platform. Built with Next.js 14 (App Router), Tailwind CSS, and Recharts.

## Features

- 📊 **Live KPI Cards** — total events, error rate, avg latency, model count
- 📈 **Traffic Chart** — requests/minute area chart (last 30 min)
- ⚡ **Latency Chart** — average latency per model (bar chart)
- 🥧 **Error Pie Chart** — error distribution by status
- 📋 **Model Latency Table** — detailed per-model breakdown

## Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8085   # Java API (default)
# or
NEXT_PUBLIC_API_URL=http://localhost:8080   # Go API
```

## Running

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve production build
```

## Data Flow

```
Java Spring Boot API (port 8085)
        │ HTTP polling (ISR revalidate=15s)
        ▼
Next.js Server Components
        │
        ▼
React Client Charts (Recharts)
```
