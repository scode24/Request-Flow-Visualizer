# Hostinger VPS Production Deployment Guide

This guide provides end-to-end instructions for deploying the **Request Flow Visualizer & Load Testing Platform** to a Hostinger VPS running Ubuntu 22.04 / 24.04 LTS.

---

## 1. Single VPS Reliability Note

> [!WARNING]
> **Single Failure Domain Caution**: A single VPS represents one physical failure domain (shared hypervisor CPU, RAM, network interface, and storage pool). Running multiple backend container replicas or load balancer replicas inside a single VPS provides process-level resilience, graceful rollouts, and load distribution testing, but does **not** create physical high availability (HA). For true HA, distribute across multiple VPS instances or a multi-zone cloud cluster.

---

## 2. Server Prerequisites & Hardening

### Step 2.1: Update Server Packages
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban htop unzip
```

### Step 2.2: Configure Firewall (UFW)
Only expose ports **22 (SSH)**, **80 (HTTP)**, and **443 (HTTPS)**. Do **NOT** expose PostgreSQL (5432), Redis (6379), or MinIO (9000/9001) publicly.
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### Step 2.3: Install Docker & Docker Compose
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
# Log out and log back in, or run:
newgrp docker
docker --version
docker compose version
```

---

## 3. Clone Repository & Setup Environment

```bash
cd /opt
sudo git clone https://github.com/your-username/Request-Flow-Visualizer.git
sudo chown -R $USER:$USER /opt/Request-Flow-Visualizer
cd /opt/Request-Flow-Visualizer
```

### Step 3.1: Create Production `.env`
Create `/opt/Request-Flow-Visualizer/.env` with strong random passwords:
```bash
# Domain configuration for Caddy automatic HTTPS
DOMAIN=flow.yourdomain.com

# PostgreSQL Credentials
POSTGRES_USER=flow_admin_prod
POSTGRES_PASSWORD=$(openssl rand -hex 16)
POSTGRES_DB=flow_visualizer

# Redis Credentials
REDIS_PASSWORD=$(openssl rand -hex 16)

# MinIO S3 Credentials
MINIO_ACCESS_KEY=flow_s3_admin
MINIO_SECRET_KEY=$(openssl rand -hex 20)

# Backend Tuning
BACKEND_REPLICAS=4
NODE_ENV=production
```

---

## 4. Launch Production Stack

Deploy with `docker-compose.prod.yml`:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Verify that all containers are healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

Check logs in real time:
```bash
docker compose -f docker-compose.prod.yml logs -f
```

---

## 5. Automated Systemd Service

To ensure the application starts automatically upon VPS reboots:

Create `/etc/systemd/system/request-flow.service`:
```ini
[Unit]
Description=Request Flow Visualizer Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/Request-Flow-Visualizer
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable request-flow
```

---

## 6. Database & Object Storage Backups

### Automated Backup Script
Create `/opt/Request-Flow-Visualizer/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/request-flow"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 1. PostgreSQL Database Dump
docker exec flow_postgres_prod pg_dump -U flow_admin_prod flow_visualizer | gzip > "$BACKUP_DIR/db_$TIMESTAMP.sql.gz"

# 2. Redis RDB Backup
docker exec flow_redis_prod redis-cli -a "$REDIS_PASSWORD" BGSAVE
sleep 2
docker cp flow_redis_prod:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"

# 3. Prune backups older than 14 days
find "$BACKUP_DIR" -type f -mtime +14 -delete

echo "Backup completed successfully at $TIMESTAMP"
```

Make executable and schedule nightly via cron (`sudo crontab -e`):
```cron
0 3 * * * /opt/Request-Flow-Visualizer/backup.sh >> /var/log/request-flow-backup.log 2>&1
```

---

## 7. Zero-Downtime Rollout & Rollback

### Deploying Updates:
```bash
cd /opt/Request-Flow-Visualizer
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend frontend
```

### Rollback:
```bash
git checkout <previous_commit_hash>
docker compose -f docker-compose.prod.yml up -d --build
```
