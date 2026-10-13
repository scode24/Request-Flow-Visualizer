import { Router, Request, Response } from 'express';
import { databaseService } from '../services/database';
import { cacheService } from '../services/cache';
import { storageService } from '../services/storage';
import { cdnService } from '../services/cdn';
import { loadBalancerService } from '../services/loadbalancer';
import { Tracer } from '../services/tracer';
import { config } from '../config';

const router = Router();

// GET /api/health
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.environment,
    infrastructureMode: config.infrastructureMode,
  });
});

// GET /api/products/:id
router.get('/products/:id', async (req: Request, res: Response) => {
  const reqStart = Date.now();
  const productId = parseInt(req.params.id, 10);
  const cacheBypass = req.query.cache === 'false';
  const traceId = (req.headers['x-trace-id'] as string) || undefined;

  const trace = Tracer.startTrace('GET', `/api/products/${req.params.id}`, traceId);

  try {
    // 1. Client Span
    Tracer.addSpan(trace.traceId, 'client', 'HTTP_GET_REQUEST', 'start', null, undefined, {
      path: req.path,
      query: req.query,
      cacheBypass,
    });

    // 2. CDN Edge Simulation Span
    let cdnEvaluated = false;
    if (config.cdn.enabled && !cacheBypass) {
      cdnEvaluated = true;
      const cdnResult = await cdnService.evaluateRequest(req.path, req.method);
      if (cdnResult.outcome === 'hit') {
        Tracer.addSpan(trace.traceId, 'cdn', 'EDGE_CACHE_LOOKUP', 'cache-hit', null, 'cdn-edge-pop', {
          latencyMs: cdnResult.latencyMs,
          message: 'Delivered directly from CloudFront / Cloudflare Edge Cache',
        }, cdnResult.latencyMs);

        Tracer.completeTrace(trace.traceId, 200);
        return res.setHeader('X-Trace-Id', trace.traceId).setHeader('X-Cache-Source', 'CDN').json({
          data: cdnResult.cachedData,
          meta: { traceId: trace.traceId, source: 'CDN', durationMs: Date.now() - reqStart },
        });
      } else {
        Tracer.addSpan(trace.traceId, 'cdn', 'EDGE_CACHE_LOOKUP', 'cache-miss', null, 'cdn-edge-pop', {
          latencyMs: cdnResult.latencyMs,
          message: 'CDN edge cache miss, forwarding to API Gateway',
        }, cdnResult.latencyMs);
      }
    } else {
      Tracer.addSpan(trace.traceId, 'cdn', 'EDGE_CACHE_LOOKUP', 'bypassed', null, undefined, {
        message: config.cdn.enabled ? 'Cache-control bypass requested' : 'CDN Disabled in configuration',
      });
    }

    // 3. API Gateway Span
    Tracer.addSpan(trace.traceId, 'gateway', 'ROUTE_AND_AUTHENTICATE', 'success', null, 'gateway-kong-01', {
      rateLimitLimit: 1000,
      rateLimitRemaining: 994,
      upstreamService: 'load-balancer-ingress',
    }, 2);

    // 4. Load Balancer Decision Span
    const selectedPod = loadBalancerService.selectInstance();
    Tracer.addSpan(trace.traceId, 'loadbalancer', 'DISPATCH_UPSTREAM', 'success', null, 'nginx-lb-01', {
      algorithm: config.loadBalancer.algorithm,
      targetInstance: selectedPod.id,
      activeConnectionsOnPod: selectedPod.activeConnections,
    }, 1);

    // 5. Backend Instance Processing Span
    Tracer.addSpan(trace.traceId, 'backend', 'EXECUTE_CONTROLLER', 'start', null, selectedPod.id, {
      controller: 'ProductController.getById',
      podCpu: selectedPod.cpuPercent,
    });

    // Optional Artificial Delay for Educational Experiments
    if (config.backend.artificialDelayMs > 0) {
      await new Promise((r) => setTimeout(r, config.backend.artificialDelayMs));
    }

    // 6. Redis Cache Check Span
    let productData: any = null;
    let cacheHit = false;
    const cacheKey = `product:${productId}`;

    if (config.redis.enabled && !cacheBypass) {
      const cacheRes = await cacheService.get(cacheKey);
      if (cacheRes.hit && cacheRes.value) {
        cacheHit = true;
        try {
          productData = JSON.parse(cacheRes.value);
        } catch (e) {
          productData = cacheRes.value;
        }

        Tracer.addSpan(trace.traceId, 'cache', 'REDIS_GET', 'cache-hit', null, 'redis-master', {
          key: cacheKey,
          durationMs: cacheRes.durationMs,
        }, cacheRes.durationMs);
      } else {
        Tracer.addSpan(trace.traceId, 'cache', 'REDIS_GET', 'cache-miss', null, 'redis-master', {
          key: cacheKey,
          durationMs: cacheRes.durationMs,
        }, cacheRes.durationMs);
      }
    } else {
      Tracer.addSpan(trace.traceId, 'cache', 'REDIS_GET', 'bypassed', null, undefined, {
        reason: cacheBypass ? 'Bypass header provided' : 'Redis disabled',
      });
    }

    // 7. Database Query Span (ONLY on Cache Miss)
    if (!cacheHit) {
      const dbRes = await databaseService.getProductById(productId);
      productData = dbRes.product;

      Tracer.addSpan(trace.traceId, 'database', 'POSTGRES_QUERY', 'success', null, dbRes.targetNodeId || 'database-primary', {
        query: 'SELECT * FROM products WHERE id = $1',
        params: [productId],
        durationMs: dbRes.durationMs,
        rowsReturned: productData ? 1 : 0,
        nodeRole: dbRes.targetRole,
      }, dbRes.durationMs);

      // Populate Redis Cache for subsequent requests
      if (productData && config.redis.enabled && !cacheBypass) {
        await cacheService.set(cacheKey, JSON.stringify(productData));
      }
    }

    // If CDN enabled and was a miss, store in CDN cache for next edge requests
    if (cdnEvaluated && productData) {
      cdnService.storeResponse(req.path, productData);
    }

    // Release connection on pod
    const duration = Date.now() - reqStart;
    loadBalancerService.releaseConnection(selectedPod.id, duration);

    // 8. Complete Trace
    const status = productData ? 200 : 404;
    Tracer.completeTrace(trace.traceId, status);

    if (!productData) {
      return res.status(404).setHeader('X-Trace-Id', trace.traceId).json({
        error: 'Product not found',
        meta: { traceId: trace.traceId, backendInstance: selectedPod.id },
      });
    }

    res.setHeader('X-Trace-Id', trace.traceId)
      .setHeader('X-Backend-Instance', selectedPod.id)
      .setHeader('X-Cache-Status', cacheHit ? 'HIT' : 'MISS')
      .json({
        data: productData,
        meta: {
          traceId: trace.traceId,
          backendInstance: selectedPod.id,
          cacheHit,
          durationMs: duration,
        },
      });
  } catch (err: any) {
    Tracer.completeTrace(trace.traceId, 500, err?.message);
    res.status(500).setHeader('X-Trace-Id', trace.traceId).json({
      error: 'Internal server error',
      message: err?.message,
      meta: { traceId: trace.traceId },
    });
  }
});

// GET /api/products
router.get('/products', async (req: Request, res: Response) => {
  const reqStart = Date.now();
  const trace = Tracer.startTrace('GET', '/api/products');

  try {
    Tracer.addSpan(trace.traceId, 'client', 'HTTP_GET_REQUEST', 'start');
    Tracer.addSpan(trace.traceId, 'gateway', 'ROUTE_AND_AUTHENTICATE', 'success', null, 'gateway-kong-01', undefined, 2);

    const selectedPod = loadBalancerService.selectInstance();
    Tracer.addSpan(trace.traceId, 'loadbalancer', 'DISPATCH_UPSTREAM', 'success', null, 'nginx-lb-01', {
      targetInstance: selectedPod.id,
    }, 1);

    const dbRes = await databaseService.listProducts();
    Tracer.addSpan(trace.traceId, 'database', 'POSTGRES_QUERY', 'success', null, dbRes.targetNodeId || 'database-primary', {
      query: 'SELECT * FROM products ORDER BY id ASC LIMIT 50',
      durationMs: dbRes.durationMs,
      rowsReturned: dbRes.products.length,
      nodeRole: dbRes.targetRole,
    }, dbRes.durationMs);

    loadBalancerService.releaseConnection(selectedPod.id, Date.now() - reqStart);
    Tracer.completeTrace(trace.traceId, 200);

    res.setHeader('X-Trace-Id', trace.traceId)
      .setHeader('X-Backend-Instance', selectedPod.id)
      .json({
        data: dbRes.products,
        meta: {
          traceId: trace.traceId,
          backendInstance: selectedPod.id,
          count: dbRes.products.length,
          durationMs: Date.now() - reqStart,
        },
      });
  } catch (err: any) {
    Tracer.completeTrace(trace.traceId, 500, err?.message);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

// POST /api/products
router.post('/products', async (req: Request, res: Response) => {
  const reqStart = Date.now();
  const trace = Tracer.startTrace('POST', '/api/products');

  try {
    const { name, description, price, stock, category } = req.body;
    if (!name || price === undefined) {
      Tracer.completeTrace(trace.traceId, 400, 'Invalid parameters');
      return res.status(400).json({ error: 'Name and price are required' });
    }

    Tracer.addSpan(trace.traceId, 'client', 'HTTP_POST_REQUEST', 'start');
    Tracer.addSpan(trace.traceId, 'gateway', 'ROUTE_AND_AUTHENTICATE', 'success', null, 'gateway-kong-01', undefined, 2);

    const selectedPod = loadBalancerService.selectInstance();
    Tracer.addSpan(trace.traceId, 'loadbalancer', 'DISPATCH_UPSTREAM', 'success', null, 'nginx-lb-01', {
      targetInstance: selectedPod.id,
    }, 1);

    Tracer.addSpan(trace.traceId, 'backend', 'INSERT_PRODUCT', 'start', null, selectedPod.id);

    const dbRes = await databaseService.createProduct({
      name,
      description: description || '',
      price: parseFloat(price),
      stock: parseInt(stock || '0', 10),
      category: category || 'General',
    });

    Tracer.addSpan(trace.traceId, 'database', 'POSTGRES_INSERT', 'success', null, dbRes.targetNodeId || 'database-primary', {
      insertedId: dbRes.product.id,
      durationMs: dbRes.durationMs,
      nodeRole: dbRes.targetRole,
    }, dbRes.durationMs);

    // Invalidate CDN cache for product list
    cdnService.purge('/api/products');

    loadBalancerService.releaseConnection(selectedPod.id, Date.now() - reqStart);
    Tracer.completeTrace(trace.traceId, 201);

    res.status(201)
      .setHeader('X-Trace-Id', trace.traceId)
      .setHeader('X-Backend-Instance', selectedPod.id)
      .json({
        data: dbRes.product,
        meta: {
          traceId: trace.traceId,
          backendInstance: selectedPod.id,
          durationMs: Date.now() - reqStart,
        },
      });
  } catch (err: any) {
    Tracer.completeTrace(trace.traceId, 500, err?.message);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// GET /api/objects/:key (MinIO S3 object retrieval)
router.get('/objects/:key', async (req: Request, res: Response) => {
  const reqStart = Date.now();
  const key = req.params.key;
  const trace = Tracer.startTrace('GET', `/api/objects/${key}`);

  try {
    Tracer.addSpan(trace.traceId, 'client', 'HTTP_GET_OBJECT', 'start');
    Tracer.addSpan(trace.traceId, 'gateway', 'ROUTE_AND_AUTHENTICATE', 'success', null, 'gateway-kong-01', undefined, 2);

    const selectedPod = loadBalancerService.selectInstance();
    Tracer.addSpan(trace.traceId, 'loadbalancer', 'DISPATCH_UPSTREAM', 'success', null, 'nginx-lb-01', {
      targetInstance: selectedPod.id,
    }, 1);

    Tracer.addSpan(trace.traceId, 'backend', 'FETCH_S3_BLOB', 'start', null, selectedPod.id);

    const objRes = await storageService.getObject(key);

    if (!objRes) {
      Tracer.addSpan(trace.traceId, 'storage', 'MINIO_GET_OBJECT', 'error', null, 'minio-s3-cluster', {
        key,
        message: 'Object not found in bucket',
      }, 10);
      loadBalancerService.releaseConnection(selectedPod.id, Date.now() - reqStart);
      Tracer.completeTrace(trace.traceId, 404);
      return res.status(404).json({ error: `Object '${key}' not found in MinIO bucket` });
    }

    Tracer.addSpan(trace.traceId, 'storage', 'MINIO_GET_OBJECT', 'success', null, 'minio-s3-cluster', {
      key,
      sizeBytes: objRes.sizeBytes,
      durationMs: objRes.durationMs,
    }, objRes.durationMs);

    loadBalancerService.releaseConnection(selectedPod.id, Date.now() - reqStart);
    Tracer.completeTrace(trace.traceId, 200);

    res.setHeader('X-Trace-Id', trace.traceId)
      .setHeader('X-Backend-Instance', selectedPod.id)
      .json({
        key,
        sizeBytes: objRes.sizeBytes,
        data: objRes.data,
        meta: {
          traceId: trace.traceId,
          backendInstance: selectedPod.id,
          durationMs: Date.now() - reqStart,
        },
      });
  } catch (err: any) {
    Tracer.completeTrace(trace.traceId, 500, err?.message);
    res.status(500).json({ error: 'Failed to retrieve object' });
  }
});

// GET /api/traces
router.get('/traces', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || '30', 10);
  res.json({ traces: Tracer.getRecentTraces(limit) });
});

// GET /api/traces/:id
router.get('/traces/:id', (req: Request, res: Response) => {
  const trace = Tracer.getTrace(req.params.id);
  if (!trace) return res.status(404).json({ error: 'Trace not found' });
  res.json({ trace });
});

export default router;
