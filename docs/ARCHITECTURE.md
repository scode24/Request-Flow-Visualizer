# Architecture Specification & Request Journey Lifecycle

## 1. System Topology Overview

The platform visualizes the complete end-to-end lifecycle of HTTP/2 requests flowing through a modern, cloud-native distributed architecture:

```
[ Client / Browser ] 
         │ (HTTP/2)
         ▼
[ CDN Edge Network (Simulation) ] 
   ├── Cache HIT  ──> Instant Response (5-15ms)
   └── Cache MISS ──> Forward to Origin
         │
         ▼
[ API Gateway (Kong / Ingress) ]
   ├── Authentication & Route Resolution
   └── Token Bucket Rate Limiting (1,000 req/m)
         │
         ▼
[ Load Balancer (NGINX / Envoy) ]
   ├── Configurable Algorithms: Round Robin, Least Connections, Random
   ├── Dynamic Health Checking & Connection Tracking
   └── LB Replicas Scaling
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
  [ Backend Pod #1 ]  [ Backend Pod #2 ]  [ Backend Pod #N ]
         │ (Express / Node.js Stateless Microservices)
         │   └── Monitored by Kubernetes HPA (Autoscaler)
         │
         ├───────────────────┬───────────────────┐
         ▼                   ▼                   ▼
[ Redis Cache ]     [ PostgreSQL DB ]     [ MinIO S3 ]
(In-Memory Keys)     (Relational DB)     (Object Storage)
```

---

## 2. Distributed Hop Execution Mechanics

### Hop 1: Client Request Generation
- Generates genuine concurrent HTTP/2 requests via the integrated worker engine or external tools (curl, k6).
- Assigns a unique trace ID (`x-trace-id`) and correlation identifiers to every packet.

### Hop 2: CDN Edge Evaluation
- If CDN is **Enabled**:
  - GET requests are inspected against edge cache memory.
  - **HIT**: Response is delivered immediately with simulated geographical edge latency (5-15ms), saving origin bandwidth.
  - **MISS**: Request continues to the origin API Gateway; response is populated into edge cache on the return journey.
- If CDN is **Bypassed**:
  - The CDN hop is skipped, routing packets directly from Client to API Gateway.

### Hop 3: API Gateway
- Validates request integrity, checks rate limits, and routes to the upstream cluster entrypoint.

### Hop 4: Load Balancer
- Selects an available backend instance using the active algorithm:
  - **Round Robin**: Sequential dispatch.
  - **Least Connections**: Dispatches to the replica with the fewest active socket connections.
- Increments the pod's active connection count and forwards the request.

### Hop 5: Backend Service Pod
- Executes business logic controller.
- Emits real-time span events over WebSocket.
- Evaluates caching tier:
  1. Checks **Redis Cache** (`GET product:<id>`).
  2. If Cache HIT: avoids database query, returns immediately.
  3. If Cache MISS: executes parameterized SQL query against **PostgreSQL**, stores result in Redis, then returns.
- If accessing unstructured documents or catalog assets: invokes **MinIO S3** API.

### Hop 6: Return Journey & Real-Time Visualization
- Releases socket on Load Balancer pod.
- Emits trace completion event.
- React Flow canvas renders moving packet particles across active edges.

---

## 3. Graceful In-Memory Fallback Design

To enable seamless out-of-the-box local development (`npm run dev`) before or without Docker:
- If live **PostgreSQL** is detected on port 5432, real connection pool and SQL queries are used. If offline, the backend transparently falls back to an in-memory SQL mock with identical table structures and seed records.
- If live **Redis** is detected on port 6379, real Redis client commands (`GET`, `SET`, `DEL`, `FLUSHALL`) are executed. If offline, in-memory TTL caching with hit/miss telemetry runs.
- If live **MinIO** is detected on port 9000, real S3 API buckets and objects are accessed. If offline, in-memory S3 simulation with pre-seeded JSON objects is served.
- Telemetry explicitly flags `isRealPostgres`, `isRealRedis`, and `isRealMinio` for full transparency.
