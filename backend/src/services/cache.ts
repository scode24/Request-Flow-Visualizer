import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export interface CacheNodeMetric {
  id: string;
  name: string;
  hashRingSlot?: string;
  keysCount: number;
  hits: number;
  misses: number;
  cpuPercent: number;
  status: 'healthy' | 'active' | 'degraded';
}

export interface CacheMetrics {
  connected: boolean;
  isRealRedis: boolean;
  enabled: boolean;
  totalHits: number;
  totalMisses: number;
  hitRatioPercent: number;
  keysCount: number;
  evictions: number;
  avgOpDurationMs: number;
  clusterMode: 'standalone' | 'cluster';
  nodesCount: number;
  hashingStrategy: 'consistent-hashing' | 'modulo';
  nodes: CacheNodeMetric[];
}

interface CacheItem {
  value: string;
  expiresAt: number;
}

class CacheService {
  private client: RedisClientType | null = null;
  private isConnected = false;
  private totalHits = 0;
  private totalMisses = 0;
  private evictions = 0;
  private opDurations: number[] = [];

  // Per-node in-memory storage partitions
  private partitions: Map<string, Map<string, CacheItem>> = new Map();
  private nodeMetrics: Map<string, { hits: number; misses: number; cpuPercent: number }> = new Map();

  constructor() {
    this.init();
    this.initNodes();
  }

  private initNodes() {
    this.partitions.clear();
    this.nodeMetrics.clear();

    const mode = config.redis.clusterMode || 'standalone';
    const count = mode === 'cluster' ? Math.max(2, Math.min(4, config.redis.nodesCount || 2)) : 1;

    for (let i = 1; i <= count; i++) {
      const id = count === 1 ? 'cache-node-1' : `cache-node-${i}`;
      this.partitions.set(id, new Map());
      this.nodeMetrics.set(id, { hits: 0, misses: 0, cpuPercent: 12 });
    }
  }

  public setConfiguration(
    clusterMode: 'standalone' | 'cluster',
    nodesCount: number,
    hashingStrategy: 'consistent-hashing' | 'modulo'
  ) {
    config.redis.clusterMode = clusterMode;
    config.redis.nodesCount = nodesCount;
    config.redis.hashingStrategy = hashingStrategy;
    this.initNodes();
    console.log(
      `🗄️ [CacheService] Configuration updated: mode=${clusterMode}, nodes=${nodesCount}, strategy=${hashingStrategy}`
    );
  }

  private async init() {
    if (!config.redis.enabled) {
      console.log('ℹ️ [Redis] Cache is disabled by configuration');
      return;
    }

    try {
      this.client = createClient({
        url: `redis://${config.redis.password ? `:${config.redis.password}@` : ''}${config.redis.host}:${config.redis.port}`,
        socket: {
          connectTimeout: 2000,
          reconnectStrategy: () => false,
        },
      });

      this.client.on('error', () => {});

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ [Redis] Connected successfully to host: ' + config.redis.host);
    } catch (err: any) {
      this.isConnected = false;
      console.log(
        '⚠️ [Redis] Live Redis unavailable (' +
          (err?.message || 'timeout') +
          '). Initialized In-Memory Multi-Node Emulation Mode.'
      );
    }
  }

  // Consistent Hashing / Modulo Node Selection
  public selectNode(key: string): { nodeId: string; slot: string } {
    const mode = config.redis.clusterMode || 'standalone';
    const count = mode === 'cluster' ? Math.max(2, Math.min(4, config.redis.nodesCount || 2)) : 1;

    if (count === 1) {
      return { nodeId: 'cache-node-1', slot: 'Full Ring [0-359°]' };
    }

    // Hash computation (djb2)
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
      hash = (hash << 5) + hash + key.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);

    if (config.redis.hashingStrategy === 'consistent-hashing') {
      // 360-degree ring space with virtual segments
      const degrees = positiveHash % 360;
      const segmentSize = Math.floor(360 / count);
      let selectedIndex = Math.floor(degrees / segmentSize);
      if (selectedIndex >= count) selectedIndex = count - 1;

      const nodeId = `cache-node-${selectedIndex + 1}`;
      const slot = `Ring Arc [${selectedIndex * segmentSize}°-${(selectedIndex + 1) * segmentSize}°]`;
      return { nodeId, slot };
    } else {
      // Modulo strategy
      const nodeIndex = positiveHash % count;
      const nodeId = `cache-node-${nodeIndex + 1}`;
      const slot = `Modulo Slot [${positiveHash % 1024}]`;
      return { nodeId, slot };
    }
  }

  public async get(
    key: string
  ): Promise<{ value: string | null; hit: boolean; durationMs: number; targetNodeId: string; slot: string }> {
    const start = Date.now();
    const { nodeId, slot } = this.selectNode(key);

    if (!config.redis.enabled) {
      return { value: null, hit: false, durationMs: 0, targetNodeId: nodeId, slot };
    }

    const nodeStats = this.nodeMetrics.get(nodeId) || { hits: 0, misses: 0, cpuPercent: 15 };
    const partition = this.partitions.get(nodeId) || new Map<string, CacheItem>();

    if (this.isConnected && this.client) {
      try {
        const val = await this.client.get(key);
        const duration = Date.now() - start;
        this.recordDuration(duration);
        if (val !== null) {
          this.totalHits++;
          nodeStats.hits++;
          nodeStats.cpuPercent = Math.min(95, nodeStats.cpuPercent + 2);
          return { value: val, hit: true, durationMs: duration, targetNodeId: nodeId, slot };
        } else {
          this.totalMisses++;
          nodeStats.misses++;
          return { value: null, hit: false, durationMs: duration, targetNodeId: nodeId, slot };
        }
      } catch (err) {
        console.error('[Redis] Get error, falling back to in-memory:', err);
      }
    }

    // In-memory partitioned lookup
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2) + 1));
    const duration = Date.now() - start;
    this.recordDuration(duration);

    const item = partition.get(key);
    if (item) {
      if (Date.now() > item.expiresAt) {
        partition.delete(key);
        this.evictions++;
        this.totalMisses++;
        nodeStats.misses++;
        return { value: null, hit: false, durationMs: duration, targetNodeId: nodeId, slot };
      }
      this.totalHits++;
      nodeStats.hits++;
      nodeStats.cpuPercent = Math.min(92, Math.max(15, nodeStats.cpuPercent + 3));
      return { value: item.value, hit: true, durationMs: duration, targetNodeId: nodeId, slot };
    }

    this.totalMisses++;
    nodeStats.misses++;
    return { value: null, hit: false, durationMs: duration, targetNodeId: nodeId, slot };
  }

  public async set(
    key: string,
    value: string,
    ttlSeconds: number = config.redis.ttlSeconds
  ): Promise<{ durationMs: number; targetNodeId: string; slot: string }> {
    const start = Date.now();
    const { nodeId, slot } = this.selectNode(key);

    if (!config.redis.enabled) {
      return { durationMs: 0, targetNodeId: nodeId, slot };
    }

    const partition = this.partitions.get(nodeId) || new Map<string, CacheItem>();
    const nodeStats = this.nodeMetrics.get(nodeId);
    if (nodeStats) {
      nodeStats.cpuPercent = Math.min(95, nodeStats.cpuPercent + 4);
    }

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, value, { EX: ttlSeconds });
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return { durationMs: duration, targetNodeId: nodeId, slot };
      } catch (err) {
        console.error('[Redis] Set error, falling back to in-memory:', err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1));
    const duration = Date.now() - start;
    this.recordDuration(duration);

    partition.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.partitions.set(nodeId, partition);

    return { durationMs: duration, targetNodeId: nodeId, slot };
  }

  public async del(key: string): Promise<{ durationMs: number }> {
    const start = Date.now();
    const { nodeId } = this.selectNode(key);

    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return { durationMs: duration };
      } catch (err) {
        console.error('[Redis] Del error:', err);
      }
    }

    const partition = this.partitions.get(nodeId);
    if (partition) {
      partition.delete(key);
    }

    const duration = Date.now() - start;
    this.recordDuration(duration);
    return { durationMs: duration };
  }

  public async flush(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.flushAll();
      } catch (err) {}
    }
    this.partitions.forEach((p) => p.clear());
    this.totalHits = 0;
    this.totalMisses = 0;
  }

  private recordDuration(ms: number) {
    this.opDurations.push(ms);
    if (this.opDurations.length > 100) this.opDurations.shift();
  }

  public getMetrics(): CacheMetrics {
    const total = this.totalHits + this.totalMisses;
    const hitRatio = total > 0 ? Math.round((this.totalHits / total) * 1000) / 10 : 0;
    const avgDuration =
      this.opDurations.length > 0
        ? Math.round((this.opDurations.reduce((a, b) => a + b, 0) / this.opDurations.length) * 10) / 10
        : 1.2;

    const mode = config.redis.clusterMode || 'standalone';
    const count = mode === 'cluster' ? Math.max(2, Math.min(4, config.redis.nodesCount || 2)) : 1;
    let totalKeys = 0;

    const nodesList: CacheNodeMetric[] = [];
    for (let i = 1; i <= count; i++) {
      const id = count === 1 ? 'cache-node-1' : `cache-node-${i}`;
      const partition = this.partitions.get(id);
      const keysCount = partition?.size || 0;
      totalKeys += keysCount;

      const nodeStats = this.nodeMetrics.get(id) || { hits: 0, misses: 0, cpuPercent: 12 };
      // Slight decay jitter towards baseline
      nodeStats.cpuPercent = Math.max(10, Math.round(nodeStats.cpuPercent * 0.95));

      const ringSlot =
        mode === 'cluster'
          ? config.redis.hashingStrategy === 'consistent-hashing'
            ? `Ring [${Math.round(((i - 1) * 360) / count)}°-${Math.round((i * 360) / count)}°]`
            : `Hash Modulo [Slot #${i}]`
          : 'Standalone Instance';

      nodesList.push({
        id,
        name: count === 1 ? 'Redis Cache Primary' : `Redis Node #${i}`,
        hashRingSlot: ringSlot,
        keysCount,
        hits: nodeStats.hits,
        misses: nodeStats.misses,
        cpuPercent: nodeStats.cpuPercent,
        status: nodeStats.cpuPercent > 80 ? 'degraded' : 'healthy',
      });
    }

    return {
      connected: this.isConnected,
      isRealRedis: this.isConnected,
      enabled: config.redis.enabled,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRatioPercent: hitRatio,
      keysCount: totalKeys,
      evictions: this.evictions,
      avgOpDurationMs: avgDuration,
      clusterMode: mode,
      nodesCount: count,
      hashingStrategy: config.redis.hashingStrategy || 'consistent-hashing',
      nodes: nodesList,
    };
  }
}

export const cacheService = new CacheService();

