import { Router, Request, Response } from 'express';
import client from 'prom-client';
import { databaseService } from '../services/database';
import { cacheService } from '../services/cache';
import { storageService } from '../services/storage';
import { loadBalancerService } from '../services/loadbalancer';
import { cdnService } from '../services/cdn';
import { autoscalerService } from '../services/autoscaler';
import { loadGeneratorService } from '../services/loadgenerator';
import { getConnectedClientCount } from '../websocket/wsServer';

const router = Router();

// Create a Prometheus Registry
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'flow_viz_' });

// Custom Prometheus Metrics
const httpRequestsTotal = new client.Counter({
  name: 'flow_viz_http_requests_total',
  help: 'Total HTTP requests processed by the platform',
  labelNames: ['method', 'status', 'backend_instance'],
  registers: [register],
});

const cacheHitsTotal = new client.Counter({
  name: 'flow_viz_cache_hits_total',
  help: 'Total Redis cache hits',
  registers: [register],
});

const cacheMissesTotal = new client.Counter({
  name: 'flow_viz_cache_misses_total',
  help: 'Total Redis cache misses',
  registers: [register],
});

const databaseQueriesTotal = new client.Counter({
  name: 'flow_viz_database_queries_total',
  help: 'Total PostgreSQL database queries executed',
  registers: [register],
});

const activeBackendPodsGauge = new client.Gauge({
  name: 'flow_viz_backend_pods_active',
  help: 'Current active backend pods count',
  registers: [register],
});

// GET /api/metrics (Prometheus Scraping Endpoint)
router.get('/', async (req: Request, res: Response) => {
  try {
    const lbMetrics = loadBalancerService.getMetrics();
    activeBackendPodsGauge.set(lbMetrics.instances.length);

    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err: any) {
    res.status(500).end(err?.message);
  }
});

// GET /api/metrics/summary (Consolidated JSON for Web Frontend & Dashboards)
router.get('/summary', (req: Request, res: Response) => {
  res.json({
    timestamp: Date.now(),
    wsClients: getConnectedClientCount(),
    database: databaseService.getMetrics(),
    cache: cacheService.getMetrics(),
    storage: storageService.getMetrics(),
    cdn: cdnService.getMetrics(),
    loadBalancer: loadBalancerService.getMetrics(),
    autoscaler: autoscalerService.getMetrics(),
    loadTest: loadGeneratorService.getStatus(),
  });
});

export default router;
