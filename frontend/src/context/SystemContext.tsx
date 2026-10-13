import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import {
  TraceSpan,
  TraceSummary,
  DatabaseMetrics,
  CacheMetrics,
  StorageMetrics,
  CdnMetrics,
  LoadBalancerMetrics,
  AutoscalerMetrics,
  LoadTestStatus,
  LoadTestConfig,
  SystemConfig,
} from '../types';

interface SystemContextType {
  wsConnected: boolean;
  config: SystemConfig;
  databaseMetrics: DatabaseMetrics;
  cacheMetrics: CacheMetrics;
  storageMetrics: StorageMetrics;
  cdnMetrics: CdnMetrics;
  loadBalancerMetrics: LoadBalancerMetrics;
  autoscalerMetrics: AutoscalerMetrics;
  loadTestStatus: LoadTestStatus | null;
  recentTraces: TraceSummary[];
  selectedTrace: TraceSummary | null;
  selectedNodeId: string | null;
  activeNodeHighlights: Record<string, boolean>;
  activeEdgeHighlights: Record<string, boolean>;
  setSelectedNodeId: (id: string | null) => void;
  setSelectedTrace: (trace: TraceSummary | null) => void;
  startLoadTest: (testConfig: LoadTestConfig) => Promise<void>;
  stopLoadTest: () => Promise<void>;
  updateConfig: (updates: any) => Promise<void>;
  refreshTraces: () => Promise<void>;
  clearTraces: () => void;
}

const defaultInitialConfig: SystemConfig = {
  port: 4000,
  environment: 'development',
  postgres: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres123',
    database: 'flow_visualizer',
    poolSize: 10,
    queryTimeoutMs: 3000,
  },
  redis: {
    host: 'localhost',
    port: 6379,
    ttlSeconds: 60,
    enabled: true,
  },
  minio: {
    endPoint: 'localhost',
    port: 9000,
    bucket: 'request-flow-bucket',
  },
  cdn: {
    enabled: true,
    ttlSeconds: 30,
    simulatedLatencyMs: 10,
  },
  loadBalancer: {
    algorithm: 'round-robin',
    scalingMode: 'single',
    replicas: 1,
    connectionLimit: 1000,
  },
  backend: {
    activeReplicas: 3,
    minReplicas: 2,
    maxReplicas: 8,
    targetCpuPercent: 65,
    artificialDelayMs: 0,
    autoscalingEnabled: false,
  },
  database: {
    mode: 'standalone',
    replicasCount: 2,
    shardsCount: 2,
    shardingKey: 'hash',
  },
  infrastructureMode: 'standard',
};

const defaultInitialLbMetrics: LoadBalancerMetrics = {
  algorithm: 'round-robin',
  scalingMode: 'single',
  replicas: 1,
  totalRequestsRouted: 0,
  activeConnections: 0,
  cpuUtilizationPercent: 18,
  instances: [
    { id: 'backend-instance-1', name: 'Backend Pod #1', status: 'healthy', activeConnections: 0, totalRequests: 0, cpuPercent: 15, memoryPercent: 30, lastResponseTimeMs: 12, uptimeSeconds: 0 },
    { id: 'backend-instance-2', name: 'Backend Pod #2', status: 'healthy', activeConnections: 0, totalRequests: 0, cpuPercent: 12, memoryPercent: 30, lastResponseTimeMs: 14, uptimeSeconds: 0 },
    { id: 'backend-instance-3', name: 'Backend Pod #3', status: 'healthy', activeConnections: 0, totalRequests: 0, cpuPercent: 16, memoryPercent: 30, lastResponseTimeMs: 11, uptimeSeconds: 0 },
  ],
};

const defaultInitialCdnMetrics: CdnMetrics = {
  enabled: true,
  totalRequests: 0,
  hits: 0,
  misses: 0,
  bypassed: 0,
  hitRatioPercent: 0,
  cachedRoutesCount: 0,
  bandwidthSavedKB: 0,
  avgEdgeLatencyMs: 10,
};

const defaultInitialCacheMetrics: CacheMetrics = {
  connected: false,
  isRealRedis: false,
  enabled: true,
  totalHits: 0,
  totalMisses: 0,
  hitRatioPercent: 0,
  keysCount: 0,
  evictions: 0,
  avgOpDurationMs: 1.2,
};

const defaultInitialDbMetrics: DatabaseMetrics = {
  connected: false,
  isRealPostgres: false,
  totalQueries: 0,
  activeConnections: 1,
  idleConnections: 4,
  waitingClients: 0,
  avgQueryDurationMs: 8.5,
  lastQueryDurationMs: 8.5,
  mode: 'standalone',
  replicasCount: 2,
  shardsCount: 2,
  nodes: [
    { id: 'database-primary', name: 'PostgreSQL Primary', role: 'primary', totalQueries: 0, activeConnections: 1, cpuPercent: 12, status: 'healthy' },
  ],
};

const defaultInitialStorageMetrics: StorageMetrics = {
  connected: false,
  isRealMinio: false,
  totalReads: 0,
  totalWrites: 0,
  bucketName: 'request-flow-bucket',
  objectsCount: 3,
  avgLatencyMs: 14,
};

const defaultInitialAutoscalerMetrics: AutoscalerMetrics = {
  enabled: false,
  minReplicas: 2,
  maxReplicas: 8,
  currentReplicas: 3,
  targetCpuPercent: 65,
  currentCpuPercent: 15,
  recentEvents: [],
};

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [config, setConfig] = useState<SystemConfig>(defaultInitialConfig);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics>(defaultInitialDbMetrics);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics>(defaultInitialCacheMetrics);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics>(defaultInitialStorageMetrics);
  const [cdnMetrics, setCdnMetrics] = useState<CdnMetrics>(defaultInitialCdnMetrics);
  const [loadBalancerMetrics, setLoadBalancerMetrics] = useState<LoadBalancerMetrics>(defaultInitialLbMetrics);
  const [autoscalerMetrics, setAutoscalerMetrics] = useState<AutoscalerMetrics>(defaultInitialAutoscalerMetrics);
  const [loadTestStatus, setLoadTestStatus] = useState<LoadTestStatus | null>(null);
  const [recentTraces, setRecentTraces] = useState<TraceSummary[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<TraceSummary | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Active highlighted nodes and edges for real-time visualization animations
  const [activeNodeHighlights, setActiveNodeHighlights] = useState<Record<string, boolean>>({});
  const [activeEdgeHighlights, setActiveEdgeHighlights] = useState<Record<string, boolean>>({});

  const nodeTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const edgeTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Trigger temporary highlight on node
  const triggerNodeHighlight = useCallback((nodeId: string, durationMs = 800) => {
    setActiveNodeHighlights((prev) => ({ ...prev, [nodeId]: true }));
    if (nodeTimeoutsRef.current[nodeId]) {
      clearTimeout(nodeTimeoutsRef.current[nodeId]);
    }
    nodeTimeoutsRef.current[nodeId] = setTimeout(() => {
      setActiveNodeHighlights((prev) => {
        const next = { ...prev };
        delete next[nodeId];
        return next;
      });
    }, durationMs);
  }, []);

  // Trigger temporary highlight on edge
  const triggerEdgeHighlight = useCallback((edgeId: string, durationMs = 800) => {
    setActiveEdgeHighlights((prev) => ({ ...prev, [edgeId]: true }));
    if (edgeTimeoutsRef.current[edgeId]) {
      clearTimeout(edgeTimeoutsRef.current[edgeId]);
    }
    edgeTimeoutsRef.current[edgeId] = setTimeout(() => {
      setActiveEdgeHighlights((prev) => {
        const next = { ...prev };
        delete next[edgeId];
        return next;
      });
    }, durationMs);
  }, []);

  // Process trace span and map to architecture nodes and edges
  const handleTraceSpan = useCallback((span: TraceSpan) => {
    triggerNodeHighlight(span.component);
    if (span.instanceId) {
      triggerNodeHighlight(span.instanceId);
    }

    switch (span.component) {
      case 'client':
        triggerEdgeHighlight('e-client-cdn');
        triggerEdgeHighlight('e-client-gateway');
        break;
      case 'cdn':
        triggerEdgeHighlight('e-cdn-gateway');
        break;
      case 'gateway':
        triggerEdgeHighlight('e-gateway-lb');
        break;
      case 'loadbalancer':
        if (span.instanceId) {
          triggerEdgeHighlight(`e-lb-${span.instanceId}`);
        } else {
          triggerEdgeHighlight('e-lb-backend');
        }
        break;
      case 'cache':
        triggerEdgeHighlight('e-backend-cache');
        break;
      case 'database':
        if (span.instanceId) {
          triggerEdgeHighlight(`e-backend-${span.instanceId}`);
        }
        triggerEdgeHighlight('e-backend-database');
        break;
      case 'storage':
        triggerEdgeHighlight('e-backend-storage');
        break;
    }
  }, [triggerNodeHighlight, triggerEdgeHighlight]);

  // Fetch initial system config
  const fetchInitialData = useCallback(async () => {
    try {
      const cfgRes = await fetch('/api/config');
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.config) setConfig(cfgData.config);
      }

      const summaryRes = await fetch('/api/metrics/summary');
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        if (s.database) setDatabaseMetrics(s.database);
        if (s.cache) setCacheMetrics(s.cache);
        if (s.storage) setStorageMetrics(s.storage);
        if (s.cdn) setCdnMetrics(s.cdn);
        if (s.loadBalancer) setLoadBalancerMetrics(s.loadBalancer);
        if (s.autoscaler) setAutoscalerMetrics(s.autoscaler);
        if (s.loadTest) setLoadTestStatus(s.loadTest);
      }

      const tracesRes = await fetch('/api/traces?limit=30');
      if (tracesRes.ok) {
        const t = await tracesRes.json();
        setRecentTraces(t.traces || []);
      }
    } catch (err) {
      console.warn('Backend not yet reachable on initial load:', err);
    }
  }, []);

  // Setup WebSocket connection with auto-reconnect
  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        console.log('⚡ Connected to Flow Visualizer WebSocket');
        fetchInitialData();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.type) {
            case 'telemetry_tick': {
              const d = msg.data;
              if (d.database) setDatabaseMetrics(d.database);
              if (d.cache) setCacheMetrics(d.cache);
              if (d.storage) setStorageMetrics(d.storage);
              if (d.cdn) setCdnMetrics(d.cdn);
              if (d.loadBalancer) {
                setLoadBalancerMetrics(d.loadBalancer);
                if (d.loadBalancer.instances?.length) {
                  setConfig((prev) => {
                    if (prev.backend.activeReplicas !== d.loadBalancer.instances.length) {
                      return {
                        ...prev,
                        backend: {
                          ...prev.backend,
                          activeReplicas: d.loadBalancer.instances.length,
                        },
                      };
                    }
                    return prev;
                  });
                }
              }
              if (d.autoscaler) setAutoscalerMetrics(d.autoscaler);
              if (d.loadTest) setLoadTestStatus(d.loadTest);
              break;
            }
            case 'trace_event': {
              if (msg.span) {
                handleTraceSpan(msg.span);
              }
              break;
            }
            case 'trace_completed': {
              if (msg.trace) {
                setRecentTraces((prev) => [msg.trace, ...prev.slice(0, 49)]);
              }
              break;
            }
            case 'load_test_update':
            case 'load_test_completed': {
              if (msg.status) {
                setLoadTestStatus(msg.status);
              }
              break;
            }
            case 'scaling_event': {
              if (msg.event) {
                setConfig((prev) => ({
                  ...prev,
                  backend: {
                    ...prev.backend,
                    activeReplicas: msg.event.newReplicas,
                  },
                }));
                setAutoscalerMetrics((prev) => ({
                  ...prev,
                  currentReplicas: msg.event.newReplicas,
                  recentEvents: [msg.event, ...(prev.recentEvents || [])],
                }));
                // Also update load balancer instances to match new replica count
                setLoadBalancerMetrics((prev) => {
                  const newInstances = [];
                  for (let i = 1; i <= msg.event.newReplicas; i++) {
                    const existing = prev.instances.find((inst) => inst.id === `backend-instance-${i}`);
                    newInstances.push(existing || {
                      id: `backend-instance-${i}`,
                      name: `Backend Pod #${i}`,
                      status: 'healthy' as const,
                      activeConnections: 0,
                      totalRequests: 0,
                      cpuPercent: 15,
                      memoryPercent: 30,
                      lastResponseTimeMs: 15,
                      uptimeSeconds: 0,
                    });
                  }
                  return { ...prev, instances: newInstances };
                });
              }
              break;
            }
            case 'config_updated': {
              if (msg.config) setConfig(msg.config);
              if (msg.metrics) {
                if (msg.metrics.loadBalancer) setLoadBalancerMetrics(msg.metrics.loadBalancer);
                if (msg.metrics.autoscaler) setAutoscalerMetrics(msg.metrics.autoscaler);
                if (msg.metrics.cdn) setCdnMetrics(msg.metrics.cdn);
                if (msg.metrics.cache) setCacheMetrics(msg.metrics.cache);
                if (msg.metrics.database) setDatabaseMetrics(msg.metrics.database);
              }
              break;
            }
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchInitialData, handleTraceSpan]);

  const startLoadTest = async (testConfig: LoadTestConfig) => {
    const res = await fetch('/api/load-test/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfig),
    });
    if (res.ok) {
      const data = await res.json();
      setLoadTestStatus(data.status);
    }
  };

  const stopLoadTest = async () => {
    const res = await fetch('/api/load-test/stop', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setLoadTestStatus(data.status);
    }
  };

  const updateConfig = async (updates: any) => {
    // 1. Optimistic immediate state update for instantaneous UI feedback
    let resolvedReplicas: number | undefined;

    setConfig((prev) => {
      const next: SystemConfig = {
        ...prev,
        cdn: { ...prev.cdn },
        loadBalancer: { ...prev.loadBalancer },
        backend: { ...prev.backend },
        redis: { ...prev.redis },
        postgres: { ...prev.postgres },
        minio: { ...prev.minio },
      };

      if (updates.infrastructureMode) {
        next.infrastructureMode = updates.infrastructureMode;
        if (updates.infrastructureMode === 'single-backend') {
          next.backend.activeReplicas = 1;
          next.backend.autoscalingEnabled = false;
          next.cdn.enabled = true;
          resolvedReplicas = 1;
        } else if (updates.infrastructureMode === 'hpa') {
          next.backend.autoscalingEnabled = true;
          next.backend.minReplicas = 2;
          next.backend.maxReplicas = 8;
          next.cdn.enabled = true;
          resolvedReplicas = Math.max(2, next.backend.activeReplicas);
          next.backend.activeReplicas = resolvedReplicas;
        } else if (updates.infrastructureMode === 'cdn-bypass') {
          next.cdn.enabled = false;
        } else if (updates.infrastructureMode === 'single-db') {
          // Single DB mode
        } else if (updates.infrastructureMode === 'standard') {
          next.backend.activeReplicas = 3;
          next.backend.autoscalingEnabled = false;
          next.cdn.enabled = true;
          next.redis.enabled = true;
          resolvedReplicas = 3;
        }
      }

      if (updates.cdn) Object.assign(next.cdn, updates.cdn);
      if (updates.loadBalancer) Object.assign(next.loadBalancer, updates.loadBalancer);
      if (updates.backend) {
        Object.assign(next.backend, updates.backend);
        if (typeof updates.backend.activeReplicas === 'number') {
          resolvedReplicas = updates.backend.activeReplicas;
        }
      }
      if (updates.redis) Object.assign(next.redis, updates.redis);
      if (updates.database) {
        next.database = {
          ...(prev.database || { mode: 'standalone', replicasCount: 2, shardsCount: 2, shardingKey: 'hash' }),
          ...updates.database,
        };
      }

      return next;
    });

    if (updates.database) {
      setDatabaseMetrics((prev) => ({
        ...prev,
        mode: updates.database.mode ?? prev.mode,
        replicasCount: updates.database.replicasCount ?? prev.replicasCount,
        shardsCount: updates.database.shardsCount ?? prev.shardsCount,
      }));
    }

    // Update loadBalancerMetrics instances immediately if replica count or mode changed
    if (resolvedReplicas !== undefined || updates.loadBalancer?.algorithm || updates.loadBalancer?.replicas) {
      setLoadBalancerMetrics((prev) => {
        const targetCount = resolvedReplicas !== undefined ? resolvedReplicas : prev.instances.length;
        const newInstances = [];
        for (let i = 1; i <= targetCount; i++) {
          const existing = prev.instances.find((inst) => inst.id === `backend-instance-${i}`);
          newInstances.push(existing || {
            id: `backend-instance-${i}`,
            name: `Backend Pod #${i}`,
            status: 'healthy' as const,
            activeConnections: 0,
            totalRequests: 0,
            cpuPercent: 15,
            memoryPercent: 30,
            lastResponseTimeMs: 15,
            uptimeSeconds: 0,
          });
        }
        return {
          ...prev,
          algorithm: updates.loadBalancer?.algorithm || prev.algorithm,
          replicas: updates.loadBalancer?.replicas || prev.replicas,
          instances: newInstances,
        };
      });
    }

    // Update cdnMetrics immediately if CDN was toggled
    if (updates.cdn?.enabled !== undefined || updates.infrastructureMode) {
      const isEnabled = updates.cdn?.enabled !== undefined
        ? updates.cdn.enabled
        : updates.infrastructureMode === 'cdn-bypass'
        ? false
        : true;
      setCdnMetrics((prev) => ({ ...prev, enabled: isEnabled }));
    }

    // Update autoscalerMetrics immediately if autoscaling was toggled
    if (updates.backend?.autoscalingEnabled !== undefined || updates.infrastructureMode) {
      const isHpa = updates.backend?.autoscalingEnabled !== undefined
        ? updates.backend.autoscalingEnabled
        : updates.infrastructureMode === 'hpa';
      setAutoscalerMetrics((prev) => ({ ...prev, enabled: isHpa }));
    }

    // 2. Transmit to backend API and sync server-confirmed state
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) setConfig(data.config);
        if (data.metrics) {
          if (data.metrics.loadBalancer) setLoadBalancerMetrics(data.metrics.loadBalancer);
          if (data.metrics.autoscaler) setAutoscalerMetrics(data.metrics.autoscaler);
          if (data.metrics.cdn) setCdnMetrics(data.metrics.cdn);
          if (data.metrics.cache) setCacheMetrics(data.metrics.cache);
          if (data.metrics.database) setDatabaseMetrics(data.metrics.database);
        }
      }
    } catch (err) {
      console.warn('Backend sync failed (optimistic update active):', err);
    }
  };

  const refreshTraces = async () => {
    const res = await fetch('/api/traces?limit=50');
    if (res.ok) {
      const data = await res.json();
      setRecentTraces(data.traces || []);
    }
  };

  const clearTraces = () => {
    setRecentTraces([]);
    setSelectedTrace(null);
  };

  return (
    <SystemContext.Provider
      value={{
        wsConnected,
        config,
        databaseMetrics,
        cacheMetrics,
        storageMetrics,
        cdnMetrics,
        loadBalancerMetrics,
        autoscalerMetrics,
        loadTestStatus,
        recentTraces,
        selectedTrace,
        selectedNodeId,
        activeNodeHighlights,
        activeEdgeHighlights,
        setSelectedNodeId,
        setSelectedTrace,
        startLoadTest,
        stopLoadTest,
        updateConfig,
        refreshTraces,
        clearTraces,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

export const useSystem = (): SystemContextType => {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
