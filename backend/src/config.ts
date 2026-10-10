import dotenv from 'dotenv';
dotenv.config();

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
    password?: string;
    ttlSeconds: number;
    enabled: boolean;
  };
  minio: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
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
    healthCheckIntervalMs: number;
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
  infrastructureMode: 'standard' | 'single-backend' | 'hpa' | 'cdn-bypass' | 'single-db';
}

export const config: SystemConfig = {
  port: parseInt(process.env.PORT || '4000', 10),
  environment: process.env.NODE_ENV || 'development',
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres123',
    database: process.env.POSTGRES_DB || 'flow_visualizer',
    poolSize: parseInt(process.env.POSTGRES_POOL_SIZE || '10', 10),
    queryTimeoutMs: parseInt(process.env.POSTGRES_TIMEOUT_MS || '3000', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttlSeconds: parseInt(process.env.REDIS_TTL || '60', 10),
    enabled: process.env.REDIS_ENABLED !== 'false',
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_BUCKET || 'request-flow-bucket',
  },
  cdn: {
    enabled: process.env.CDN_ENABLED !== 'false',
    ttlSeconds: parseInt(process.env.CDN_TTL || '30', 10),
    simulatedLatencyMs: parseInt(process.env.CDN_LATENCY_MS || '10', 10),
  },
  loadBalancer: {
    algorithm: (process.env.LB_ALGORITHM as any) || 'round-robin',
    scalingMode: (process.env.LB_SCALING_MODE as any) || 'single',
    replicas: parseInt(process.env.LB_REPLICAS || '1', 10),
    healthCheckIntervalMs: 5000,
    connectionLimit: 1000,
  },
  backend: {
    activeReplicas: parseInt(process.env.BACKEND_REPLICAS || '3', 10),
    minReplicas: parseInt(process.env.BACKEND_MIN_REPLICAS || '2', 10),
    maxReplicas: parseInt(process.env.BACKEND_MAX_REPLICAS || '8', 10),
    targetCpuPercent: parseInt(process.env.BACKEND_TARGET_CPU || '65', 10),
    artificialDelayMs: parseInt(process.env.ARTIFICIAL_DELAY_MS || '0', 10),
    autoscalingEnabled: process.env.AUTOSCALING_ENABLED === 'true',
  },
  infrastructureMode: (process.env.INFRASTRUCTURE_MODE as any) || 'standard',
};
