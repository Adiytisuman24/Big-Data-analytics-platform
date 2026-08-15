import json
import time
import uuid
import random
import argparse
from confluent_kafka import SerializingProducer
from confluent_kafka.schema_registry import SchemaRegistryClient
from confluent_kafka.schema_registry.avro import AvroSerializer
from confluent_kafka.serialization import StringSerializer

# Load schema
with open("avro/agent_execution_event.avsc", "r") as f:
    schema_str = f.read()

def generate_event():
    models = ["gpt-4", "gpt-3.5-turbo", "claude-3-opus", "gemini-pro"]
    tools = ["web_search", "calculator", "execute_code", None]
    statuses = ["success", "success", "success", "error", "timeout"]
    
    status = random.choice(statuses)
    latency = random.randint(50, 5000)
    if status == "timeout":
        latency = 5000
        
    return {
        "event_time": int(time.time() * 1000),
        "agent_id": f"agent_{random.randint(1, 100)}",
        "task_id": f"task_{uuid.uuid4().hex[:8]}",
        "trace_id": uuid.uuid4().hex,
        "model": random.choice(models),
        "tool": random.choice(tools),
        "status": status,
        "latency_ms": latency,
        "input_tokens": random.randint(10, 1000),
        "output_tokens": random.randint(10, 1000) if status == "success" else 0
    }

def delivery_report(err, msg):
    if err is not None:
        print(f"Delivery failed for record {msg.key()}: {err}")
    else:
        print(f"Record {msg.key()} successfully produced to {msg.topic()} [{msg.partition()}] at offset {msg.offset()}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--topic', type=str, default='agent_execution_events')
    parser.add_argument('--broker', type=str, default='localhost:19092')
    parser.add_argument('--schema-registry', type=str, default='http://localhost:8081')
    args = parser.parse_args()

    schema_registry_client = SchemaRegistryClient({'url': args.schema_registry})
    
    avro_serializer = AvroSerializer(
        schema_registry_client,
        schema_str
    )

    string_serializer = StringSerializer('utf_8')

    producer_conf = {
        'bootstrap.servers': args.broker,
        'key.serializer': string_serializer,
        'value.serializer': avro_serializer
    }

    producer = SerializingProducer(producer_conf)

    print(f"Starting to produce messages to {args.topic}...")
    try:
        while True:
            event = generate_event()
            # Use agent_id as the partition key
            producer.produce(
                topic=args.topic,
                key=event["agent_id"],
                value=event,
                on_delivery=delivery_report
            )
            producer.poll(0.0)
            time.sleep(random.uniform(0.1, 1.0))
    except KeyboardInterrupt:
        pass
    finally:
        print("Flushing records...")
        producer.flush()

if __name__ == '__main__':
    main()
