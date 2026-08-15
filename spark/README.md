# Spark → Iceberg Streaming Job

PySpark Structured Streaming job that reads AI-agent execution events from Kafka, deserialises the Confluent Avro payload, and writes the records into an Apache Iceberg table partitioned by day and agent bucket.

## Partitioning Strategy

```
PARTITIONED BY (
  days(event_timestamp),     -- time-based partition pruning
  bucket(32, agent_id)       -- even distribution across 32 buckets
)
```

## Running

Execute inside the `spark-iceberg` container:

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

## Iceberg Table Operations

```sql
-- Connect to Spark SQL
docker exec -it spark-iceberg spark-sql

-- Browse the latest data
SELECT * FROM rest.default.agent_events
ORDER BY event_timestamp DESC LIMIT 20;

-- Time-travel query
SELECT * FROM rest.default.agent_events
TIMESTAMP AS OF '2024-01-01 12:00:00';

-- List all snapshots
SELECT * FROM rest.default.agent_events.snapshots;

-- Compact small files (run periodically)
CALL rest.system.rewrite_data_files(
  table => 'default.agent_events',
  options => map('target-file-size-bytes', '134217728')
);

-- Expire old snapshots
CALL rest.system.expire_snapshots(
  table => 'default.agent_events',
  older_than => TIMESTAMP '2024-01-01 00:00:00'
);
```

## Schema Evolution

Add a new nullable column without breaking consumers:

```sql
ALTER TABLE rest.default.agent_events
ADD COLUMN cost_usd DOUBLE;
```

The Iceberg REST Catalog tracks all schema versions. Old data that lacks the new column will read `NULL`.

## Moving to AWS S3

1. Remove `spark.hadoop.fs.s3a.endpoint` config (defaults to AWS)
2. Set `spark.hadoop.fs.s3a.aws.credentials.provider` to `com.amazonaws.auth.InstanceProfileCredentialsProvider` (for EC2/EKS IAM roles)
3. Update `CATALOG_S3_ENDPOINT` in the REST catalog service to point to real S3
