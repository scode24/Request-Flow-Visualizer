import { Router, Request, Response } from 'express';
import { cacheService } from '../services/cache';
import { databaseService } from '../services/database';
import { storageService } from '../services/storage';
import { loadBalancerService } from '../services/loadbalancer';
import { cdnService } from '../services/cdn';
import { autoscalerService } from '../services/autoscaler';
import { config } from '../config';

const router = Router();

// ==========================================
// 1. Cache Testing (Redis)
// ==========================================
router.post('/cache/test-op', async (req: Request, res: Response) => {
  try {
    const { op, key, value, ttl } = req.body;
    const testKey = key || 'test:demo-key';

    if (op === 'get') {
      const result = await cacheService.get(testKey);
      return res.json({
        op: 'get',
        key: testKey,
        hit: result.hit,
        value: result.value,
        durationMs: result.durationMs,
        metrics: cacheService.getMetrics(),
      });
    }

    if (op === 'set') {
      const testVal = value || JSON.stringify({ message: 'Hello Redis', time: new Date().toISOString() });
      const result = await cacheService.set(testKey, testVal, ttl || 30);
      return res.json({
        op: 'set',
        key: testKey,
        durationMs: result.durationMs,
        ttl: ttl || 30,
        metrics: cacheService.getMetrics(),
      });
    }

    if (op === 'invalidate') {
      const result = await cacheService.del(testKey);
      return res.json({
        op: 'invalidate',
        key: testKey,
        durationMs: result.durationMs,
        metrics: cacheService.getMetrics(),
      });
    }

    if (op === 'flush') {
      await cacheService.flush();
      return res.json({
        op: 'flush',
        message: 'Cache cleared completely',
        metrics: cacheService.getMetrics(),
      });
    }

    res.status(400).json({ error: 'Unsupported cache operation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Database Testing (PostgreSQL)
// ==========================================
router.post('/database/test-op', async (req: Request, res: Response) => {
  try {
    const { op, id, payload } = req.body;

    if (op === 'read') {
      const result = await databaseService.getProductById(parseInt(id || '1', 10));
      return res.json({
        op: 'read',
        id: id || 1,
        durationMs: result.durationMs,
        data: result.product,
        poolMetrics: databaseService.getMetrics(),
      });
    }

    if (op === 'write') {
      const product = await databaseService.createProduct(payload || {
        name: `Test Unit #${Date.now().toString().slice(-4)}`,
        description: 'Inserted via Database Test console',
        price: 199.99,
        stock: 50,
        category: 'Test',
      });
      return res.json({
        op: 'write',
        data: product.product,
        durationMs: product.durationMs,
        poolMetrics: databaseService.getMetrics(),
      });
    }

    if (op === 'reset') {
      const result = await databaseService.resetSeedData();
      return res.json({
        op: 'reset',
        success: result.success,
        durationMs: result.durationMs,
        message: 'Database seed data restored to factory defaults',
        poolMetrics: databaseService.getMetrics(),
      });
    }

    res.status(400).json({ error: 'Unsupported database operation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Object Storage Testing (MinIO)
// ==========================================
router.get('/storage/objects', async (req: Request, res: Response) => {
  try {
    const list = await storageService.listObjects();
    res.json({ objects: list, metrics: storageService.getMetrics() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/storage/test-op', async (req: Request, res: Response) => {
  try {
    const { op, key, content } = req.body;
    const testKey = key || 'demo-config.json';

    if (op === 'read') {
      const result = await storageService.getObject(testKey);
      if (!result) return res.status(404).json({ error: `Object '${testKey}' not found` });
      return res.json({
        op: 'read',
        key: testKey,
        data: result.data,
        sizeBytes: result.sizeBytes,
        durationMs: result.durationMs,
        metrics: storageService.getMetrics(),
      });
    }

    if (op === 'write') {
      const result = await storageService.putObject(
        testKey,
        content || { timestamp: new Date().toISOString(), test: true, version: '1.0' }
      );
      return res.json({
        op: 'write',
        key: testKey,
        success: result.success,
        durationMs: result.durationMs,
        metrics: storageService.getMetrics(),
      });
    }

    res.status(400).json({ error: 'Unsupported storage operation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Load Balancer Testing
// ==========================================
router.post('/loadbalancer/test-distribution', (req: Request, res: Response) => {
  try {
    const count = parseInt(req.body.requestsCount || '20', 10);
    const distribution: Record<string, number> = {};

    for (let i = 0; i < count; i++) {
      const pod = loadBalancerService.selectInstance();
      distribution[pod.id] = (distribution[pod.id] || 0) + 1;
      // simulate quick finish
      loadBalancerService.releaseConnection(pod.id, 10);
    }

    res.json({
      requestsSent: count,
      algorithm: config.loadBalancer.algorithm,
      distribution,
      instances: loadBalancerService.getMetrics().instances,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. CDN Testing
// ==========================================
router.post('/cdn/test-op', async (req: Request, res: Response) => {
  try {
    const { op, route } = req.body;
    const targetRoute = route || '/api/products/1';

    if (op === 'evaluate') {
      const result = await cdnService.evaluateRequest(targetRoute, 'GET');
      return res.json({
        op: 'evaluate',
        route: targetRoute,
        outcome: result.outcome,
        latencyMs: result.latencyMs,
        data: result.cachedData,
        metrics: cdnService.getMetrics(),
      });
    }

    if (op === 'purge') {
      cdnService.purge(targetRoute);
      return res.json({
        op: 'purge',
        route: targetRoute,
        message: 'CDN edge cache purged',
        metrics: cdnService.getMetrics(),
      });
    }

    res.status(400).json({ error: 'Unsupported CDN operation' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Autoscaler Testing
// ==========================================
router.post('/autoscaler/simulate-spike', (req: Request, res: Response) => {
  try {
    const targetCpu = parseInt(req.body.cpuPercent || '85', 10);
    const metrics = loadBalancerService.getMetrics();
    // Simulate spike on all instances
    for (const inst of metrics.instances) {
      inst.cpuPercent = targetCpu;
      inst.activeConnections += 15;
    }
    res.json({
      message: `Simulated CPU spike to ${targetCpu}%. Observe HPA evaluation within 2-4 seconds.`,
      autoscalerMetrics: autoscalerService.getMetrics(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
