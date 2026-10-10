# REST API & WebSocket Reference

Base URL: `http://localhost:4000` (or `http://localhost:3000/api` through Vite/Nginx proxy)

---

## 1. Core Application Endpoints

### `GET /api/health`
Returns system status, uptime, and cluster environment.
- **Response `200 OK`**:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-10T15:00:00.000Z",
  "uptime": 124.5,
  "environment": "development",
  "infrastructureMode": "standard"
}
```

### `GET /api/products/:id`
Retrieves product details. Evaluates CDN edge cache, then Redis in-memory cache, and falls back to PostgreSQL on cache miss.
- **Query Parameters**:
  - `cache` (optional, boolean): If `false`, bypasses Redis and forces direct PostgreSQL query.
- **Response Headers**:
  - `X-Trace-Id`: Unique UUID for request trace.
  - `X-Backend-Instance`: Replica ID that processed the request (e.g. `backend-instance-2`).
  - `X-Cache-Status`: `HIT` or `MISS`.
- **Response `200 OK`**:
```json
{
  "data": {
    "id": 1,
    "name": "Cloud Router X9",
    "description": "Enterprise low-latency core network router",
    "price": 1299.99,
    "stock": 45,
    "category": "Hardware"
  },
  "meta": {
    "traceId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "backendInstance": "backend-instance-2",
    "cacheHit": true,
    "durationMs": 4
  }
}
```

### `POST /api/products`
Inserts a new product record into PostgreSQL and purges the product list cache.
- **Request Body**:
```json
{
  "name": "Fiber Transceiver 100G",
  "description": "Single-mode optical transceiver",
  "price": 499.00,
  "stock": 100,
  "category": "Optics"
}
```
- **Response `201 Created`**:
```json
{
  "data": {
    "id": 6,
    "name": "Fiber Transceiver 100G",
    "price": 499.00
  },
  "meta": {
    "traceId": "...",
    "durationMs": 14
  }
}
```

### `GET /api/objects/:key`
Retrieves unstructured JSON documents stored in the MinIO S3 bucket.
- **Example**: `GET /api/objects/architecture-spec.json`
- **Response `200 OK`**:
```json
{
  "key": "architecture-spec.json",
  "sizeBytes": 1420,
  "data": {
    "systemName": "Distributed Request Flow Platform",
    "topology": ["client", "cdn", "gateway", "loadbalancer", "backend", "redis", "postgres", "minio"],
    "version": "2.4.0"
  }
}
```

---

## 2. Load Testing Controls

### `POST /api/load-test/start`
Starts a concurrent traffic generation test.
- **Request Body**:
```json
{
  "scenario": "get_product_cached",
  "concurrentUsers": 25,
  "durationSeconds": 15,
  "targetRps": 100
}
```

### `POST /api/load-test/stop`
Aborts any active load test.

### `GET /api/load-test/status`
Returns real-time execution statistics (RPS, throughput, p50, p95, p99 latencies, status codes).

---

## 3. Distributed Tracing & Metrics

### `GET /api/traces`
Returns recent distributed traces buffer.

### `GET /api/metrics`
Prometheus text-format scraping endpoint.

### `GET /api/metrics/summary`
Consolidated JSON metrics across Database, Cache, MinIO, Load Balancer, Autoscaler, and Load Test engine.

---

## 4. Real-Time WebSocket Interface

**URL**: `ws://localhost:4000/ws`

### Emitted Events:
1. `telemetry_tick`: 1-second pulse containing metrics across all tiers.
2. `trace_event`: Individual hop execution span (`client`, `cdn`, `gateway`, `loadbalancer`, `backend`, `cache`, `database`, `storage`).
3. `trace_completed`: Completed request trace with latency breakdown.
4. `load_test_update`: Real-time traffic generation throughput and latency percentiles.
5. `scaling_event`: Kubernetes HPA pod scale-up or scale-down event.
6. `config_updated`: Live topology update broadcast.
