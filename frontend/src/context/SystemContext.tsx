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
  config: SystemConfig | null;
  databaseMetrics: DatabaseMetrics | null;
  cacheMetrics: CacheMetrics | null;
  storageMetrics: StorageMetrics | null;
  cdnMetrics: CdnMetrics | null;
  loadBalancerMetrics: LoadBalancerMetrics | null;
  autoscalerMetrics: AutoscalerMetrics | null;
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

const SystemContext = createContext<SystemContextType | undefined>(undefined);

export const SystemProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wsConnected, setWsConnected] = useState(false);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [databaseMetrics, setDatabaseMetrics] = useState<DatabaseMetrics | null>(null);
  const [cacheMetrics, setCacheMetrics] = useState<CacheMetrics | null>(null);
  const [storageMetrics, setStorageMetrics] = useState<StorageMetrics | null>(null);
  const [cdnMetrics, setCdnMetrics] = useState<CdnMetrics | null>(null);
  const [loadBalancerMetrics, setLoadBalancerMetrics] = useState<LoadBalancerMetrics | null>(null);
  const [autoscalerMetrics, setAutoscalerMetrics] = useState<AutoscalerMetrics | null>(null);
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
    // 1. Highlight specific component node
    triggerNodeHighlight(span.component);
    if (span.instanceId) {
      triggerNodeHighlight(span.instanceId);
    }

    // 2. Highlight corresponding edge based on hop
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
        setConfig(cfgData.config);
      }

      const summaryRes = await fetch('/api/metrics/summary');
      if (summaryRes.ok) {
        const s = await summaryRes.json();
        setDatabaseMetrics(s.database);
        setCacheMetrics(s.cache);
        setStorageMetrics(s.storage);
        setCdnMetrics(s.cdn);
        setLoadBalancerMetrics(s.loadBalancer);
        setAutoscalerMetrics(s.autoscaler);
        setLoadTestStatus(s.loadTest);
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
              if (d.loadBalancer) setLoadBalancerMetrics(d.loadBalancer);
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
                setAutoscalerMetrics((prev) =>
                  prev
                    ? {
                        ...prev,
                        currentReplicas: msg.event.newReplicas,
                        recentEvents: [msg.event, ...(prev.recentEvents || [])],
                      }
                    : null
                );
              }
              break;
            }
            case 'config_updated': {
              if (msg.config) {
                setConfig(msg.config);
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
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setConfig(data.config);
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
