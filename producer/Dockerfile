FROM python:3.9-slim
WORKDIR /app
COPY producer/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY producer/main.py .
COPY avro/ avro/
CMD ["python", "main.py", "--broker", "broker:29092", "--schema-registry", "http://schema-registry:8081"]
