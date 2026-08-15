# 🚀 AI-Agent Big Data Analytics Platform

> A production-style end-to-end Big Data pipeline that ingests AI-agent execution events in real-time, persists historical data in a lakehouse, and serves low-latency analytics through a modern React dashboard.

## Architecture Overview

```
AI Agent Services
        │
        ▼
Python Producer  ──── Avro + Schema Registry
        │
        ▼
    KAFKA (KRaft, 6 partitions, DLQ topic)
     ┌───┴───────────────┐
     ▼                   ▼
  DRUID              Spark Streaming
  (real-time)             │
     │                   ▼
     │          S3 / MinIO (Parquet)
     │                   │
     │              ICEBERG REST Catalog
     │              (partitioned, time-travel)
     │                   │
     └─────── Analytics API ─────────┘
               │           │
            Go API     Java Spring Boot API
                           │
                       Next.js Dashboard
```

## Technology Stack

| Layer | Technology |
|---|---|
| **Event Streaming** | Apache Kafka 7.5 (KRaft mode) |
| **Schema Management** | Confluent Schema Registry + Apache Avro |
| **Real-time Analytics** | Apache Druid 30.0 |
| **Object Storage** | MinIO (S3-compatible) |
| **Table Format** | Apache Iceberg 1.4 (REST Catalog) |
| **Stream Processing** | Apache Spark 3.5 (PySpark Structured Streaming) |
| **Backend API** | Go 1.21 (Gorilla Mux) + Java 17 (Spring Boot WebFlux) |
| **Frontend** | Next.js 14, React, Recharts, Tailwind CSS |
| **Observability** | Prometheus, Grafana |
| **Container Orchestration** | Docker Compose (local), Kubernetes (production) |

---

## Prerequisites

- **Docker Desktop** ≥ 4.20 (with ≥ 10 GB RAM allocated)
- **Go** ≥ 1.21
- **Java** 17 + Maven ≥ 3.9
- **Node.js** ≥ 18

---

## Quick Start

### 1. Clone and enter the project

```bash
git clone <your-repo-url>
cd Project
```

### 2. Start the infrastructure

```bash
docker compose \
  -f docker-compose.yml \
  -f druid-compose.yml \
  -f spark-compose.yml \
  up -d
```

This starts:
- Kafka (KRaft) + Schema Registry
- MinIO (S3 object store) — bucket `warehouse` auto-created
- Apache Druid (Coordinator, Broker, Historical, MiddleManager, Router)
- Iceberg REST Catalog
- Spark + Iceberg container
- Python AI-agent event producer
- Java Spring Boot Analytics API

> ⏳ First launch takes 5–10 minutes to pull images (~4 GB).

### 3. Submit Druid ingestion spec

Once Druid is healthy (check `http://localhost:18081`):

```bash
curl -X POST \
  -H 'Content-Type: application/json' \
  -d @druid_supervisor.json \
  http://localhost:18081/druid/indexer/v1/supervisor
```

### 4. Start the Spark → Iceberg streaming job

```bash
docker exec -it spark-iceberg \
  spark-submit \
    --packages \
      org.apache.spark:spark-avro_2.12:3.5.0,\
      org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.4.2,\
      org.apache.hadoop:hadoop-aws:3.3.4,\
      com.amazonaws:aws-java-sdk-bundle:1.12.261 \
    /home/iceberg/local/iceberg_streaming.py
```

### 5. Start the Go API (optional — Java API is the primary)

```bash
cd api
go run main.go
# → http://localhost:8080
```

### 6. Start the frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

---

## Service Endpoints

| Service | URL |
|---|---|
| Kafka (external) | `localhost:19092` |
| Schema Registry | `http://localhost:8081` |
| Druid Console | `http://localhost:18081` |
| Druid SQL Broker | `http://localhost:8082` |
| MinIO Console | `http://localhost:9001` (admin / password123) |
| Iceberg REST Catalog | `http://localhost:8181` |
| Spark UI | `http://localhost:18080` |
| Java Analytics API | `http://localhost:8085` |
| Go Analytics API | `http://localhost:8080` |
| Next.js Dashboard | `http://localhost:3000` |

---

## Analytics API Reference

### Java Spring Boot API (`localhost:8085`)

```
GET /analytics/health                      — Health check
GET /analytics/traffic                     — Requests/min over last 1h
GET /analytics/errors                      — Error count by status (last 24h)
GET /analytics/latency                     — Avg latency per model (last 24h)
GET /analytics/models/{model}              — Tool/status breakdown for a model
GET /analytics/agents/{agent_id}           — Per-agent usage stats
```

### Example

```bash
curl http://localhost:8085/analytics/latency
curl http://localhost:8085/analytics/models/gpt-4
curl http://localhost:8085/analytics/agents/agent_42
```

---

## Iceberg Features

### Query the Iceberg table via Spark SQL

```bash
docker exec -it spark-iceberg spark-sql
```

```sql
-- Browse data
SELECT * FROM rest.default.agent_events LIMIT 20;

-- Time-travel: read a snapshot from yesterday
SELECT * FROM rest.default.agent_events
TIMESTAMP AS OF '2024-01-01 00:00:00';

-- List snapshots
SELECT * FROM rest.default.agent_events.snapshots;

-- Compaction (removes small files)
CALL rest.system.rewrite_data_files('default.agent_events');
```

### Schema Evolution

```bash
# Add a new column (backward-compatible)
docker exec spark-iceberg spark-sql -e "
ALTER TABLE rest.default.agent_events
ADD COLUMN user_id STRING;
"
```

---

## Avro Schema Evolution

The schema supports backward-compatible evolution. The current schema is at [`avro/agent_execution_event.avsc`](avro/agent_execution_event.avsc).

To add a new field (e.g., `error_code`):

```json
{
  "name": "error_code",
  "type": ["null", "string"],
  "default": null
}
```

Register the evolved schema:

```bash
jq -Rs '{"schema": .}' avro/agent_execution_event.avsc | \
  curl -X POST http://localhost:8081/subjects/agent_execution_events-value/versions \
    -H 'Content-Type: application/vnd.schemaregistry.v1+json' \
    -d @-
```

---

## Observability

Prometheus scrapes Kafka JMX metrics. Access Grafana dashboards at `http://localhost:3000` (when the observability stack is deployed):

```bash
kubectl apply -f k8s/observability.yaml
```

Key metrics tracked:
- Kafka consumer lag (`kafka_consumergroup_lag`)
- Event throughput (events/sec)
- Druid ingestion lag
- API p95/p99 latency
- Iceberg write failures

---

## Kubernetes Deployment

```bash
# Create namespace and deploy core services
kubectl apply -f k8s/platform.yaml
kubectl apply -f k8s/observability.yaml

# Verify
kubectl get pods -n analytics-platform
```

### Moving to AWS

Replace MinIO with real AWS S3 by updating:
1. `druid.env`: change `s3.endpoint` → remove (use default AWS endpoint)
2. `spark-compose.yml`: use IAM role or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars
3. `spark/iceberg_streaming.py`: update `spark.hadoop.fs.s3a.endpoint` → remove (default to AWS)

---

## Project Structure

```
Project/
├── avro/                          # Avro schemas
│   └── agent_execution_event.avsc
├── producer/                      # Python Kafka producer
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── spark/                         # PySpark streaming job
│   └── iceberg_streaming.py
├── api/                           # Go REST API
│   ├── main.go
│   └── go.mod
├── java-api/                      # Java Spring Boot API
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                      # Next.js dashboard
│   └── src/
├── k8s/                           # Kubernetes manifests
│   ├── platform.yaml
│   └── observability.yaml
├── docker-compose.yml             # Core services
├── druid-compose.yml              # Druid cluster
├── spark-compose.yml              # Iceberg + Spark
├── druid.env                      # Druid environment variables
└── druid_supervisor.json          # Druid Kafka ingestion spec
```

---

## Resume Talking Points

> **Built and deployed an end-to-end Big Data analytics platform processing AI-agent execution events through Apache Kafka with Avro schema management, landing historical data in MinIO/S3 Parquet format with Apache Iceberg (REST Catalog, partitioning, time-travel, compaction), and serving low-latency real-time analytics through Apache Druid. Implemented polyglot backends in Go and Java (Spring Boot WebFlux), a PySpark Structured Streaming pipeline, and a Next.js analytics dashboard. Containerised the full stack with Docker Compose and Kubernetes.**
