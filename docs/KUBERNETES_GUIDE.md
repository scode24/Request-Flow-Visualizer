# Kubernetes Orchestration & HPA Autoscaling Guide

This guide covers deploying the Request Flow Visualizer to a local Kubernetes cluster (**Minikube** or **Kind**) or a lightweight VPS distribution (**K3s**).

---

## 1. Prerequisites

- `kubectl` installed
- `minikube` or `kind` installed
- Docker running

---

## 2. Cluster Setup & Metrics Server

> [!IMPORTANT]
> **Metrics Server Requirement**: The Horizontal Pod Autoscaler (HPA) requires `metrics-server` to scrape CPU and memory utilization from backend pods. Without it, HPA displays `<unknown>/65%`.

### Option A: Minikube
```bash
minikube start --cpus=4 --memory=8192
minikube addons enable metrics-server
minikube addons enable ingress
```

### Option B: Kind
```bash
kind create cluster --name request-flow
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
# On Kind, patch metrics-server to allow insecure TLS:
kubectl patch -n kube-system deployment metrics-server --type='json' -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
```

---

## 3. Deploy Application Manifests

Apply the manifests in sequential order:
```bash
kubectl apply -f k8s/00-namespace.yaml
kubectl apply -f k8s/01-configmap-secrets.yaml
kubectl apply -f k8s/02-postgres.yaml
kubectl apply -f k8s/03-redis.yaml
kubectl apply -f k8s/04-minio.yaml
kubectl apply -f k8s/05-backend-deployment.yaml
kubectl apply -f k8s/06-backend-hpa.yaml
kubectl apply -f k8s/07-loadbalancer-gateway.yaml
kubectl apply -f k8s/08-frontend-deployment.yaml
```

Verify pod statuses:
```bash
kubectl get pods -n request-flow
```

---

## 4. Observing HPA Autoscaling in Action

Watch the Horizontal Pod Autoscaler in real time:
```bash
kubectl get hpa -n request-flow -w
```

Example live output:
```text
NAME          REFERENCE            TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
backend-hpa   Deployment/backend   12%/65%   2         8         2          1m
backend-hpa   Deployment/backend   82%/65%   2         8         2          2m
backend-hpa   Deployment/backend   82%/65%   2         8         4          2m15s
backend-hpa   Deployment/backend   54%/65%   2         8         4          3m
```

### Accessing the Dashboard UI:
```bash
# Port forward frontend service
kubectl port-forward -n request-flow svc/frontend 3000:80
```
Open `http://localhost:3000` in your browser.

---

## 5. Recommended Graphical Dashboards

For local visual cluster inspection:
1. **Headlamp**: Lightweight, modern, cross-platform Kubernetes web UI. Run via desktop app or in-cluster.
2. **Kubernetes Dashboard**: Standard dashboard (`minikube dashboard`).
3. **Lens / k9s**: Terminal and desktop cluster navigation.
