# Python Kafka Producer

Simulates AI-agent execution events and publishes them to a Kafka topic using Confluent Schema Registry and Apache Avro serialisation.

## Event Schema

| Field | Type | Description |
|---|---|---|
| `event_time` | `long` (timestamp-millis) | Event timestamp |
| `agent_id` | `string` | Agent identifier (partition key) |
| `task_id` | `string` | Unique task UUID |
| `trace_id` | `string?` | OpenTelemetry trace ID |
| `model` | `string` | LLM model name |
| `tool` | `string?` | Tool used (web_search, calculator, etc.) |
| `status` | `string` | success / error / timeout |
| `latency_ms` | `long` | End-to-end latency in milliseconds |
| `input_tokens` | `int` | Prompt token count |
| `output_tokens` | `int` | Completion token count |

## Running locally (Python ≥ 3.9)

```bash
pip install -r requirements.txt

python main.py \
  --broker localhost:19092 \
  --schema-registry http://localhost:8081 \
  --topic agent_execution_events
```

## Running in Docker

The producer is built and started automatically by the main `docker-compose.yml`. It waits for Schema Registry to be healthy before producing.

```bash
docker compose up -d producer
```

## Kafka Topic Details

- **Topic**: `agent_execution_events`
- **Partition key**: `agent_id` (ensures all events for a given agent land in the same partition)
- **Serialisation**: Confluent Avro (5-byte wire format header + payload)
- **Dead-letter topic**: `agent_execution_events.dlq` (configure in consumer)
