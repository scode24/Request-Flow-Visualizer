# Distributed Systems Flow Visualizer & Load Testing Lab

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React Flow](https://img.shields.io/badge/React%20Flow-12.x-indigo.svg)](https://reactflow.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ed.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-HPA-326ce5.svg)](https://kubernetes.io/)

A modern, production-grade distributed systems visualization, real-time request tracing, and concurrent load testing developer platform.

The platform visually demonstrates how a modern cloud-native system processes API requests, handles concurrent traffic, distributes load across pod replicas, evaluates caching tiers, queries relational databases, retrieves unstructured S3 objects, and automatically scales stateless compute using the Kubernetes Horizontal Pod Autoscaler (HPA).

---

## 🌟 Key Features

- **Interactive Architecture Canvas**: Draggable, zoomable React Flow (`@xyflow/react`) canvas with icon-first infrastructure nodes for **Client**, **CDN Edge Network**, **API Gateway**, **Load Balancer**, **Stateless Backend Replicas**, **Redis Cache**, **PostgreSQL Database**, **MinIO S3 Storage**, and **Kubernetes HPA Autoscaler**.
- **Real-Time Request Packet Tracing**: Dynamic particle flow animations represent real backend OpenTelemetry-compatible traces streamed over WebSockets (`ws`).
- **Concurrent Load Testing Lab**: In-engine multi-user HTTP traffic generator with real-time throughput (RPS), p50, p95, and p99 percentiles, status code breakdowns, and configurable concurrency limits.
- **Dynamic Topology Modes**:
  - **Standard Distributed Tier**: Multi-replica backend, CDN, Redis, PostgreSQL, and MinIO.
  - **Single Backend Pod**: 1 replica without autoscaling.
  - **Kubernetes HPA**: Dynamic auto-scaling based on real-time CPU thresholds.
  - **CDN Bypass**: Instant route rerouting directly from Client to API Gateway.
  - **Single Database Tier**: Dedicated database connection pool monitoring.
- **Independent Component Testing**: Dedicated tabs to execute isolated operations on Redis (GET, SET, DEL, TTL, FLUSHALL), PostgreSQL (SELECT, INSERT, seed reset), MinIO (list, read, write JSON objects), Load Balancer (traffic distribution test across algorithms), CDN (edge cache hits/misses), and HPA (CPU spike injection).
- **Interactive API Console**: Integrated REST API tester with predefined endpoints, headers, payloads, and response telemetry.
- **Refined Light & Dark Themes**: Modern developer-tool aesthetic with persistent theme switching.
- **Zero-Dependency Local Emulation**: Automatically detects if live Docker services (PostgreSQL, Redis, MinIO) are running; if offline, transparently falls back to local in-memory engines so the app runs out-of-the-box via `npm run dev`!

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), Framer Motion, Lucide React, Vite |
| **Backend** | Node.js, Express.js, TypeScript, WebSockets (`ws`), OpenTelemetry-compatible Tracer |
| **Databases & Storage** | PostgreSQL 16 (`pg`), Redis 7 (`redis`), MinIO S3 (`minio`) |
| **Observability** | Prometheus (`prom-client`), Grafana dashboards |
| **Containerization** | Docker, Docker Compose (multi-stage builds) |
| **Orchestration** | Kubernetes manifests (Minikube / Kind / K3s) with HorizontalPodAutoscaler (HPA) |

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js >= 20.x
- npm >= 10.x
- Docker (optional for local mock mode; required for full container stack)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/Request-Flow-Visualizer.git
cd Request-Flow-Visualizer

# Install dependencies
npm run build:backend
npm run build:frontend
```

### 3. Run Dev Server (Zero-Docker Mock Mode)
Run both the Express backend (port 4000) and the Vite frontend (port 3000) concurrently:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

---

## 🐳 Docker Compose Deployment

Run the complete multi-container production stack (PostgreSQL, Redis, MinIO, Backend, Frontend, Prometheus, Grafana):

```bash
docker compose up --build
```

### Access Services:
- **Web Dashboard**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
- **Grafana Dashboard**: [http://localhost:3001](http://localhost:3001) (Credentials: `admin` / `admin`)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Credentials: `minioadmin` / `minioadmin`)

---

## ☸️ Kubernetes & Autoscaling Deployment

See the comprehensive [Kubernetes Deployment Guide](docs/KUBERNETES_GUIDE.md):

```bash
# Apply Kubernetes manifests in order
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap-secrets.yaml
kubectl apply -f k8s/02-postgres.yaml
kubectl apply -f k8s/03-redis.yaml
kubectl apply -f k8s/04-minio.yaml
kubectl apply -f k8s/05-backend-deployment.yaml
kubectl apply -f k8s/06-backend-hpa.yaml
kubectl apply -f k8s/07-loadbalancer-gateway.yaml
kubectl apply -f k8s/08-frontend-deployment.yaml

# Watch HPA autoscaling live
kubectl get hpa -n request-flow -w
```

---

## 🌐 Hostinger VPS Deployment

For full VPS setup instructions (firewall, Caddy automated SSL, systemd services, automated database backups), refer to the [Hostinger VPS Production Guide](docs/HOSTINGER_VPS_DEPLOYMENT.md).

```bash
# Launch on VPS using hardened production profile
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📖 Documentation Directory

- [Architecture & Request Lifecycle](docs/ARCHITECTURE.md)
- [REST API & WebSocket Reference](docs/API_DOCUMENTATION.md)
- [Hostinger VPS Production Deployment](docs/HOSTINGER_VPS_DEPLOYMENT.md)
- [Kubernetes & HPA Autoscaling Guide](docs/KUBERNETES_GUIDE.md)

---

## 📄 License

MIT License. Built for modern cloud-native systems exploration and load testing.
