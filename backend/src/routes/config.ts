import { Router, Request, Response } from 'express';
import { config, SystemConfig } from '../config';
import { loadBalancerService } from '../services/loadbalancer';
import { autoscalerService } from '../services/autoscaler';
import { cdnService } from '../services/cdn';
import { cacheService } from '../services/cache';
import { databaseService } from '../services/database';
import { broadcastEvent } from '../websocket/wsServer';

const router = Router();

// GET /api/config
router.get('/', (req: Request, res: Response) => {
  res.json({ config });
});

// POST /api/config
router.post('/', (req: Request, res: Response) => {
  try {
    const updates = req.body;

    // Apply infrastructure mode presets
    if (updates.infrastructureMode && updates.infrastructureMode !== config.infrastructureMode) {
      config.infrastructureMode = updates.infrastructureMode;
      switch (updates.infrastructureMode) {
        case 'single-backend':
          loadBalancerService.setReplicaCount(1);
          autoscalerService.setEnabled(false);
          config.cdn.enabled = true;
          break;
        case 'hpa':
          autoscalerService.setEnabled(true);
          config.backend.minReplicas = 2;
          config.backend.maxReplicas = 8;
          config.cdn.enabled = true;
          break;
        case 'cdn-bypass':
          cdnService.setEnabled(false);
          break;
        case 'single-db':
          // Standard topology with explicit single DB emphasis
          break;
        case 'standard':
        default:
          loadBalancerService.setReplicaCount(3);
          autoscalerService.setEnabled(false);
          cdnService.setEnabled(true);
          config.redis.enabled = true;
          break;
      }
    }

    // CDN updates
    if (updates.cdn) {
      if (typeof updates.cdn.enabled === 'boolean') {
        cdnService.setEnabled(updates.cdn.enabled);
      }
      if (typeof updates.cdn.ttlSeconds === 'number') {
        config.cdn.ttlSeconds = updates.cdn.ttlSeconds;
      }
      if (typeof updates.cdn.simulatedLatencyMs === 'number') {
        config.cdn.simulatedLatencyMs = updates.cdn.simulatedLatencyMs;
      }
    }

    // Load Balancer updates
    if (updates.loadBalancer) {
      if (updates.loadBalancer.algorithm) {
        loadBalancerService.setAlgorithm(updates.loadBalancer.algorithm);
      }
      if (updates.loadBalancer.scalingMode) {
        loadBalancerService.setLbScalingMode(updates.loadBalancer.scalingMode);
      }
      if (typeof updates.loadBalancer.replicas === 'number') {
        loadBalancerService.setLbReplicas(updates.loadBalancer.replicas);
      }
    }

    // Backend updates
    if (updates.backend) {
      if (typeof updates.backend.activeReplicas === 'number') {
        loadBalancerService.setReplicaCount(updates.backend.activeReplicas);
      }
      if (typeof updates.backend.autoscalingEnabled === 'boolean') {
        autoscalerService.setEnabled(updates.backend.autoscalingEnabled);
      }
      if (typeof updates.backend.targetCpuPercent === 'number') {
        autoscalerService.setTargetCpu(updates.backend.targetCpuPercent);
      }
      if (typeof updates.backend.minReplicas === 'number' && typeof updates.backend.maxReplicas === 'number') {
        autoscalerService.setLimits(updates.backend.minReplicas, updates.backend.maxReplicas);
      }
      if (typeof updates.backend.artificialDelayMs === 'number') {
        config.backend.artificialDelayMs = updates.backend.artificialDelayMs;
      }
    }

    // Redis updates
    if (updates.redis) {
      if (typeof updates.redis.enabled === 'boolean') {
        config.redis.enabled = updates.redis.enabled;
      }
      if (typeof updates.redis.ttlSeconds === 'number') {
        config.redis.ttlSeconds = updates.redis.ttlSeconds;
      }
      if (updates.redis.clusterMode || typeof updates.redis.nodesCount === 'number' || updates.redis.hashingStrategy) {
        const clusterMode = updates.redis.clusterMode || config.redis.clusterMode;
        const nodesCount = typeof updates.redis.nodesCount === 'number' ? updates.redis.nodesCount : config.redis.nodesCount;
        const hashingStrategy = updates.redis.hashingStrategy || config.redis.hashingStrategy;
        cacheService.setConfiguration(clusterMode, nodesCount, hashingStrategy);
      }
    }

    // Database scaling & sharding updates
    if (updates.database) {
      const dbMode = updates.database.mode || config.database.mode;
      const dbReplicas = typeof updates.database.replicasCount === 'number' ? updates.database.replicasCount : config.database.replicasCount;
      const dbShards = typeof updates.database.shardsCount === 'number' ? updates.database.shardsCount : config.database.shardsCount;
      databaseService.setConfiguration(dbMode, dbReplicas, dbShards);
    }

    const updatedMetrics = {
      loadBalancer: loadBalancerService.getMetrics(),
      autoscaler: autoscalerService.getMetrics(),
      cdn: cdnService.getMetrics(),
      cache: cacheService.getMetrics(),
      database: databaseService.getMetrics(),
    };

    // Broadcast configuration and metrics to frontend so React Flow updates immediately
    broadcastEvent('config_updated', {
      type: 'config_updated',
      config,
      metrics: updatedMetrics,
      timestamp: Date.now(),
    });

    res.json({
      message: 'Configuration updated successfully',
      config,
      metrics: updatedMetrics,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update config', message: err?.message });
  }
});

export default router;
