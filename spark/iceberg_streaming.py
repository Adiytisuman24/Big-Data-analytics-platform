#!/usr/bin/env python3
"""
Kafka → Iceberg Structured Streaming Job

Reads AI-agent execution events from Kafka (Confluent Avro wire format),
strips the 5-byte Confluent magic header, deserialises with from_avro(),
and writes the resulting records to an Apache Iceberg table on MinIO.

Run inside the spark-iceberg container:
  docker exec -it spark-iceberg spark-submit \
    --packages org.apache.spark:spark-avro_2.12:3.5.0,\
org.apache.iceberg:iceberg-spark-runtime-3.5_2.12:1.4.2,\
org.apache.hadoop:hadoop-aws:3.3.4,\
com.amazonaws:aws-java-sdk-bundle:1.12.261 \
    /home/iceberg/local/iceberg_streaming.py
"""

from pyspark.sql import SparkSession
from pyspark.sql.functions import col, expr, to_timestamp
from pyspark.sql.avro.functions import from_avro

# ── Iceberg + S3 Spark session ──────────────────────────────────────────────
spark = (
    SparkSession.builder
    .appName("KafkaToIcebergStreaming")
    # Iceberg catalog
    .config("spark.sql.extensions",
            "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions")
    .config("spark.sql.catalog.rest", "org.apache.iceberg.spark.SparkCatalog")
    .config("spark.sql.catalog.rest.type", "rest")
    .config("spark.sql.catalog.rest.uri", "http://rest:8181")
    .config("spark.sql.catalog.rest.io-impl",
            "org.apache.iceberg.aws.s3.S3FileIO")
    .config("spark.sql.catalog.rest.warehouse", "s3://warehouse/")
    .config("spark.sql.catalog.rest.s3.endpoint", "http://minio:9000")
    # S3A for MinIO
    .config("spark.hadoop.fs.s3a.endpoint", "http://minio:9000")
    .config("spark.hadoop.fs.s3a.access.key", "admin")
    .config("spark.hadoop.fs.s3a.secret.key", "password123")
    .config("spark.hadoop.fs.s3a.path.style.access", "true")
    .config("spark.hadoop.fs.s3a.impl",
            "org.apache.hadoop.fs.s3a.S3AFileSystem")
    .config("spark.hadoop.fs.s3a.aws.credentials.provider",
            "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
    .getOrCreate()
)

spark.sparkContext.setLogLevel("WARN")

# ── Avro schema (must match Schema Registry definition exactly) ──────────────
AVRO_SCHEMA = """
{
  "namespace": "com.ai.analytics",
  "type": "record",
  "name": "AgentExecutionEvent",
  "fields": [
    {"name": "event_time",    "type": {"type": "long", "logicalType": "timestamp-millis"}},
    {"name": "agent_id",      "type": "string"},
    {"name": "task_id",       "type": "string"},
    {"name": "trace_id",      "type": ["null", "string"], "default": null},
    {"name": "model",         "type": "string"},
    {"name": "tool",          "type": ["null", "string"], "default": null},
    {"name": "status",        "type": "string"},
    {"name": "latency_ms",    "type": "long"},
    {"name": "input_tokens",  "type": "int"},
    {"name": "output_tokens", "type": "int"}
  ]
}
"""

# ── Create Iceberg table (idempotent) ────────────────────────────────────────
spark.sql("""
CREATE TABLE IF NOT EXISTS rest.default.agent_events (
    event_time      BIGINT,
    agent_id        STRING,
    task_id         STRING,
    trace_id        STRING,
    model           STRING,
    tool            STRING,
    status          STRING,
    latency_ms      BIGINT,
    input_tokens    INT,
    output_tokens   INT,
    event_timestamp TIMESTAMP
)
USING iceberg
PARTITIONED BY (days(event_timestamp), bucket(32, agent_id))
""")

# ── Read from Kafka ──────────────────────────────────────────────────────────
raw_df = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "broker:29092")
    .option("subscribe", "agent_execution_events")
    .option("startingOffsets", "earliest")
    .option("failOnDataLoss", "false")
    .load()
)

# Confluent wire format: [magic_byte(1)] [schema_id(4)] [avro_payload(N)]
# Strip the first 5 bytes before passing to from_avro().
payload_df = raw_df.withColumn(
    "avro_payload",
    expr("substring(value, 6, length(value) - 5)")   # byte offsets are 1-based in Spark
)

events_df = (
    payload_df
    .select(from_avro(col("avro_payload"), AVRO_SCHEMA).alias("data"))
    .select("data.*")
    .withColumn("event_timestamp", to_timestamp(col("event_time") / 1000))
)

# ── Write to Iceberg ─────────────────────────────────────────────────────────
query = (
    events_df.writeStream
    .format("iceberg")
    .outputMode("append")
    .trigger(processingTime="30 seconds")
    .option("path", "rest.default.agent_events")
    .option("checkpointLocation", "s3a://warehouse/checkpoints/agent_events")
    .start()
)

print("✅ Streaming query started. Writing to rest.default.agent_events …")
query.awaitTermination()
