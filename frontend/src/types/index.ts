export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string | null;
  component: 'client' | 'cdn' | 'gateway' | 'loadbalancer' | 'backend' | 'cache' | 'database' | 'storage' | 'autoscaler';
  instanceId?: string;
  operation: string;
  status: 'start' | 'success' | 'error' | 'cache-hit' | 'cache-miss' | 'bypassed';
  startTime: number;
  endTime?: number;
  durationMs?: number;
  details?: Record<string, any>;
}

export interface TraceSummary {
  traceId: string;
  method: string;
  path: string;
  statusCode?: number;
  totalDurationMs?: number;
  startTime: number;
  endTime?: number;
  backendInstance?: string;
  cdnOutcome?: 'hit' | 'miss' | 'bypassed';
  cacheOutcome?: 'hit' | 'miss' | 'bypassed';
  databaseQueried: boolean;
  storageAccessed: boolean;
  spans: TraceSpan[];
  error?: string;
}

export interface BackendInstance {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  activeConnections: number;
  totalRequests: number;
  cpuPercent: number;
  memoryPercent: number;
  lastResponseTimeMs: number;
  uptimeSeconds: number;
}

export interface LoadBalancerMetrics {
  algorithm: 'round-robin' | 'least-connections' | 'random';
  scalingMode: 'single' | 'fixed' | 'autoscaling';
  replicas: number;
  totalRequestsRouted: number;
  activeConnections: number;
  cpuUtilizationPercent: number;
  instances: BackendInstance[];
}

export interface DatabaseNodeMetric {
  id: string;
  name: string;
  role: 'primary' | 'replica' | 'shard';
  shardKey?: string;
  totalQueries: number;
  activeConnections: number;
  cpuPercent: number;
  status: 'healthy' | 'active' | 'degraded';
}

export interface DatabaseMetrics {
  connected: boolean;
  isRealPostgres: boolean;
  totalQueries: number;
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  avgQueryDurationMs: number;
  lastQueryDurationMs: number;
  mode?: 'standalone' | 'read-replicas' | 'sharded';
  replicasCount?: number;
  shardsCount?: number;
  nodes?: DatabaseNodeMetric[];
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
}

export interface StorageMetrics {
  connected: boolean;
  isRealMinio: boolean;
  totalReads: number;
  totalWrites: number;
  bucketName: string;
  objectsCount: number;
  avgLatencyMs: number;
}

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

export interface ScalingEvent {
  id: string;
  timestamp: number;
  type: 'scale-up' | 'scale-down';
  previousReplicas: number;
  newReplicas: number;
  currentCpuPercent: number;
  targetCpuPercent: number;
  reason: string;
}

export interface AutoscalerMetrics {
  enabled: boolean;
  minReplicas: number;
  maxReplicas: number;
  currentReplicas: number;
  targetCpuPercent: number;
  currentCpuPercent: number;
  lastScalingTime?: number;
  recentEvents: ScalingEvent[];
}

export interface LoadTestConfig {
  scenario: 'get_product_cached' | 'get_product_uncached' | 'get_random_product' | 'post_product' | 'get_object_storage' | 'mixed_workload';
  concurrentUsers: number;
  durationSeconds: number;
  targetRps?: number;
}

export interface LoadTestStatus {
  id: string;
  isRunning: boolean;
  config: LoadTestConfig;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  currentRps: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  statusCodes: Record<string, number>;
  activeWorkers: number;
}

export interface SystemConfig {
  port: number;
  environment: string;
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    poolSize: number;
    queryTimeoutMs: number;
  };
  redis: {
    host: string;
    port: number;
    ttlSeconds: number;
    enabled: boolean;
  };
  minio: {
    endPoint: string;
    port: number;
    bucket: string;
  };
  cdn: {
    enabled: boolean;
    ttlSeconds: number;
    simulatedLatencyMs: number;
  };
  loadBalancer: {
    algorithm: 'round-robin' | 'least-connections' | 'random';
    scalingMode: 'single' | 'fixed' | 'autoscaling';
    replicas: number;
    connectionLimit: number;
  };
  backend: {
    activeReplicas: number;
    minReplicas: number;
    maxReplicas: number;
    targetCpuPercent: number;
    artificialDelayMs: number;
    autoscalingEnabled: boolean;
  };
  database: {
    mode: 'standalone' | 'read-replicas' | 'sharded';
    replicasCount: number;
    shardsCount: number;
    shardingKey: 'hash' | 'range';
  };
  infrastructureMode: 'standard' | 'single-backend' | 'hpa' | 'cdn-bypass' | 'single-db';
}
