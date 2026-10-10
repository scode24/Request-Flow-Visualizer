import { config } from '../config';

export interface CdnMetrics {
  enabled: boolean;
  totalRequests: number;
  hits: number;
  misses: number;
  bypassed: number;
  hitRatioPercent: number;
  cachedRoutesCount: number;
  bandwidthSavedKB: number;
  avgEdgeLatencyMs: number;
}

interface CdnCacheEntry {
  data: any;
  contentType: string;
  expiresAt: number;
  sizeBytes: number;
}

class CdnService {
  private cache: Map<string, CdnCacheEntry> = new Map();
  private totalRequests = 0;
  private hits = 0;
  private misses = 0;
  private bypassed = 0;
  private bandwidthSavedBytes = 0;

  public async evaluateRequest(
    path: string,
    method: string
  ): Promise<{ outcome: 'hit' | 'miss' | 'bypassed'; cachedData?: any; latencyMs: number }> {
    this.totalRequests++;

    if (!config.cdn.enabled) {
      this.bypassed++;
      return { outcome: 'bypassed', latencyMs: 0 };
    }

    // Only GET requests are cacheable at CDN edge
    if (method.toUpperCase() !== 'GET') {
      return { outcome: 'miss', latencyMs: config.cdn.simulatedLatencyMs };
    }

    const entry = this.cache.get(path);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        this.hits++;
        this.bandwidthSavedBytes += entry.sizeBytes;
        // Edge delivery latency
        await new Promise((r) => setTimeout(r, config.cdn.simulatedLatencyMs));
        return { outcome: 'hit', cachedData: entry.data, latencyMs: config.cdn.simulatedLatencyMs };
      } else {
        this.cache.delete(path);
      }
    }

    this.misses++;
    return { outcome: 'miss', latencyMs: config.cdn.simulatedLatencyMs };
  }

  public storeResponse(path: string, data: any, ttlSeconds: number = config.cdn.ttlSeconds): void {
    if (!config.cdn.enabled) return;

    const str = typeof data === 'string' ? data : JSON.stringify(data);
    this.cache.set(path, {
      data,
      contentType: 'application/json',
      expiresAt: Date.now() + ttlSeconds * 1000,
      sizeBytes: Buffer.byteLength(str),
    });
  }

  public purge(path?: string): void {
    if (path) {
      this.cache.delete(path);
    } else {
      this.cache.clear();
    }
  }

  public setEnabled(enabled: boolean): void {
    config.cdn.enabled = enabled;
  }

  public getMetrics(): CdnMetrics {
    const totalCacheable = this.hits + this.misses;
    const hitRatio = totalCacheable > 0 ? Math.round((this.hits / totalCacheable) * 1000) / 10 : 0;

    return {
      enabled: config.cdn.enabled,
      totalRequests: this.totalRequests,
      hits: this.hits,
      misses: this.misses,
      bypassed: this.bypassed,
      hitRatioPercent: hitRatio,
      cachedRoutesCount: this.cache.size,
      bandwidthSavedKB: Math.round(this.bandwidthSavedBytes / 1024),
      avgEdgeLatencyMs: config.cdn.simulatedLatencyMs,
    };
  }
}

export const cdnService = new CdnService();
