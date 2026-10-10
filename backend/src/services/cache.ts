import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

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

  // In-memory fallback cache
  private memoryCache: Map<string, CacheItem> = new Map();

  constructor() {
    this.init();
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
          reconnectStrategy: () => false, // don't infinite loop on failure during startup
        },
      });

      this.client.on('error', (err) => {
        // quiet error on fallback
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('✅ [Redis] Connected successfully to host: ' + config.redis.host);
    } catch (err: any) {
      this.isConnected = false;
      console.log('⚠️ [Redis] Live Redis unavailable (' + (err?.message || 'timeout') + '). Initialized In-Memory Emulation Mode.');
    }
  }

  public async get(key: string): Promise<{ value: string | null; hit: boolean; durationMs: number }> {
    const start = Date.now();

    if (!config.redis.enabled) {
      return { value: null, hit: false, durationMs: 0 };
    }

    if (this.isConnected && this.client) {
      try {
        const val = await this.client.get(key);
        const duration = Date.now() - start;
        this.recordDuration(duration);
        if (val !== null) {
          this.totalHits++;
          return { value: val, hit: true, durationMs: duration };
        } else {
          this.totalMisses++;
          return { value: null, hit: false, durationMs: duration };
        }
      } catch (err) {
        console.error('[Redis] Get error, falling back to in-memory:', err);
      }
    }

    // In-memory fallback
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 2) + 1));
    const duration = Date.now() - start;
    this.recordDuration(duration);

    const item = this.memoryCache.get(key);
    if (item) {
      if (Date.now() > item.expiresAt) {
        this.memoryCache.delete(key);
        this.evictions++;
        this.totalMisses++;
        return { value: null, hit: false, durationMs: duration };
      }
      this.totalHits++;
      return { value: item.value, hit: true, durationMs: duration };
    }

    this.totalMisses++;
    return { value: null, hit: false, durationMs: duration };
  }

  public async set(key: string, value: string, ttlSeconds: number = config.redis.ttlSeconds): Promise<{ durationMs: number }> {
    const start = Date.now();

    if (!config.redis.enabled) {
      return { durationMs: 0 };
    }

    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, value, { EX: ttlSeconds });
        const duration = Date.now() - start;
        this.recordDuration(duration);
        return { durationMs: duration };
      } catch (err) {
        console.error('[Redis] Set error, falling back to in-memory:', err);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1));
    const duration = Date.now() - start;
    this.recordDuration(duration);

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });

    return { durationMs: duration };
  }

  public async del(key: string): Promise<{ durationMs: number }> {
    const start = Date.now();

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

    this.memoryCache.delete(key);
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
    this.memoryCache.clear();
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

    return {
      connected: this.isConnected,
      isRealRedis: this.isConnected,
      enabled: config.redis.enabled,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRatioPercent: hitRatio,
      keysCount: this.memoryCache.size,
      evictions: this.evictions,
      avgOpDurationMs: avgDuration,
    };
  }
}

export const cacheService = new CacheService();
