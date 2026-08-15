# Java Analytics API

A Spring Boot (WebFlux) REST API that executes real-time analytical SQL queries against Apache Druid and returns JSON responses. Designed as the primary analytics backend for the AI-Agent Analytics Platform.

## Stack

- **Java 17** + **Spring Boot 3.1** (WebFlux / Reactive)
- **Project Reactor** for non-blocking HTTP to Druid
- **Docker** (multi-stage build — ~200 MB final image)

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/analytics/health` | Service health check |
| `GET` | `/analytics/traffic` | Requests/min over last 1 hour |
| `GET` | `/analytics/errors` | Error count by status (last 24h) |
| `GET` | `/analytics/latency` | Avg latency per model (last 24h) |
| `GET` | `/analytics/models/{model}` | Tool/status breakdown for a model |
| `GET` | `/analytics/agents/{agentId}` | Per-agent execution stats |

## Configuration

| Property | Default | Description |
|---|---|---|
| `server.port` | `8085` | HTTP port |
| `druid.broker.url` | `http://broker:8082/druid/v2/sql` | Druid SQL endpoint |

Override via env vars:
```bash
export druid.broker.url=http://localhost:8082/druid/v2/sql
```

## Running locally

```bash
mvn spring-boot:run
```

## Running in Docker

```bash
# Build
docker build -t java-analytics-api .

# Run (connected to the project Docker network)
docker run -d \
  --name java-api \
  --network project_default \
  -p 8085:8085 \
  -e druid.broker.url=http://broker:8082/druid/v2/sql \
  java-analytics-api
```

## Example requests

```bash
curl http://localhost:8085/analytics/health
curl http://localhost:8085/analytics/traffic
curl http://localhost:8085/analytics/latency
curl http://localhost:8085/analytics/models/gpt-4
curl http://localhost:8085/analytics/agents/agent_42
```
