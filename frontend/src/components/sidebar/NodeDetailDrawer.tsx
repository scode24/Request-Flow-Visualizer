import React from 'react';
import { X, Server, Database, Zap, Globe, Network, Split, HardDrive, ArrowUpRight, Activity } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const NodeDetailDrawer: React.FC = () => {
  const {
    selectedNodeId,
    setSelectedNodeId,
    databaseMetrics,
    cacheMetrics,
    storageMetrics,
    cdnMetrics,
    loadBalancerMetrics,
    autoscalerMetrics,
    queueMetrics,
    resilienceMetrics,
    config,
  } = useSystem();

  if (!selectedNodeId) return null;

  const isBackend = selectedNodeId.startsWith('backend-instance');
  const backendInstance = isBackend
    ? loadBalancerMetrics?.instances.find((i) => i.id === selectedNodeId)
    : null;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-l border-slate-200 dark:border-slate-800 shadow-xl z-20 flex flex-col select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Component Diagnostics
            </h3>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              ID: {selectedNodeId}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSelectedNodeId(null)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 text-xs">
        {/* Backend Node Details */}
        {isBackend && backendInstance && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Pod Instance Status</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Name</span>
                  <span>{backendInstance.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="text-emerald-600">{backendInstance.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">CPU Utilization</span>
                  <span>{backendInstance.cpuPercent}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Active Sockets</span>
                  <span>{backendInstance.activeConnections}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Processed Requests</span>
                  <span>{backendInstance.totalRequests}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Uptime</span>
                  <span>{backendInstance.uptimeSeconds}s</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Redis Node Details */}
        {selectedNodeId === 'cache' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 space-y-2">
              <span className="font-semibold text-red-900 dark:text-red-200">Redis In-Memory Engine</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Cache Status</span>
                  <span>{cacheMetrics?.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hit Ratio</span>
                  <span className="text-emerald-600">{cacheMetrics?.hitRatioPercent}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Hits / Misses</span>
                  <span>{cacheMetrics?.totalHits} / {cacheMetrics?.totalMisses}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Default TTL</span>
                  <span>{config?.redis.ttlSeconds}s</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Keys in Memory</span>
                  <span>{cacheMetrics?.keysCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Avg Op Latency</span>
                  <span>{cacheMetrics?.avgOpDurationMs} ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Database Node Details */}
        {selectedNodeId === 'database' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-2">
              <span className="font-semibold text-blue-900 dark:text-blue-200">PostgreSQL Primary Cluster</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Queries</span>
                  <span>{databaseMetrics?.totalQueries}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Connection Pool</span>
                  <span>{databaseMetrics?.activeConnections} / 10 Active</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Avg Query Latency</span>
                  <span>{databaseMetrics?.avgQueryDurationMs} ms</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Connection State</span>
                  <span className="text-emerald-600">CONNECTED</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CDN Node Details */}
        {selectedNodeId === 'cdn' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 space-y-2">
              <span className="font-semibold text-cyan-900 dark:text-cyan-200">CDN Edge Anycast</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Edge Hits</span>
                  <span>{cdnMetrics?.hits}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Origin Passes</span>
                  <span>{cdnMetrics?.misses}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Bandwidth Saved</span>
                  <span>{cdnMetrics?.bandwidthSavedKB} KB</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Simulated Latency</span>
                  <span>{cdnMetrics?.avgEdgeLatencyMs} ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MinIO Storage Details */}
        {selectedNodeId === 'storage' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <span className="font-semibold text-amber-900 dark:text-amber-200">MinIO S3 Bucket</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Bucket</span>
                  <span>{storageMetrics?.bucketName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Objects Count</span>
                  <span>{storageMetrics?.objectsCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Reads</span>
                  <span>{storageMetrics?.totalReads}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Avg S3 Latency</span>
                  <span>{storageMetrics?.avgLatencyMs} ms</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Load Balancer Details */}
        {selectedNodeId === 'loadbalancer' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-2">
              <span className="font-semibold text-purple-900 dark:text-purple-200">Traffic Distribution</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Algorithm</span>
                  <span>{loadBalancerMetrics?.algorithm}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">LB Replicas</span>
                  <span>{loadBalancerMetrics?.replicas}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Routed Requests</span>
                  <span>{loadBalancerMetrics?.totalRequestsRouted}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">LB CPU</span>
                  <span>{loadBalancerMetrics?.cpuUtilizationPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Autoscaler Details */}
        {selectedNodeId === 'autoscaler' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 space-y-2">
              <span className="font-semibold text-teal-900 dark:text-teal-200">Horizontal Pod Autoscaler</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Current Replicas</span>
                  <span>{autoscalerMetrics?.currentReplicas}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Target CPU</span>
                  <span>{autoscalerMetrics?.targetCpuPercent}%</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Min / Max</span>
                  <span>{autoscalerMetrics?.minReplicas} / {autoscalerMetrics?.maxReplicas}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Current Avg CPU</span>
                  <span>{autoscalerMetrics?.currentCpuPercent}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message Broker (Kafka) Details */}
        {selectedNodeId === 'queue-broker' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 space-y-2">
              <span className="font-semibold text-amber-900 dark:text-amber-200">Kafka / Message Broker Telemetry</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Topic</span>
                  <span className="truncate block">{queueMetrics?.topic || 'events.stream'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Partitions</span>
                  <span>{queueMetrics?.partitions || 3} Partitions</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Queue Depth</span>
                  <span>{queueMetrics?.queueDepth || 0} msgs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Consumer Lag</span>
                  <span className="text-amber-600 font-bold">{queueMetrics?.consumerLag || 0} msgs</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Published</span>
                  <span>{queueMetrics?.totalPublished || 0} total</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Dead Letter Queue</span>
                  <span className={(queueMetrics?.deadLetterQueueCount || 0) > 0 ? 'text-rose-500 font-bold' : ''}>
                    {queueMetrics?.deadLetterQueueCount || 0} poison msgs
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Worker Instance Details */}
        {selectedNodeId?.startsWith('worker-instance') && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 space-y-2">
              <span className="font-semibold text-teal-900 dark:text-teal-200">Async Event Consumer Worker</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Worker ID</span>
                  <span>{selectedNodeId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Status</span>
                  <span className="text-emerald-500 font-bold">Active Consumer</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Source Topic</span>
                  <span>{queueMetrics?.topic || 'events.stream'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Sink Destination</span>
                  <span>PostgreSQL (Async)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API Gateway Resilience Details */}
        {selectedNodeId === 'gateway' && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 space-y-2">
              <span className="font-semibold text-purple-900 dark:text-purple-200">API Gateway & Rate Limiter</span>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Limiter Algorithm</span>
                  <span>Token Bucket</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Available Tokens</span>
                  <span className="text-purple-600 font-bold">{resilienceMetrics?.rateLimiter?.tokensAvailable ?? 100} / 100</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Refill Rate</span>
                  <span>20 tokens/sec</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Throttled (429)</span>
                  <span className={(resilienceMetrics?.rateLimiter?.totalThrottled || 0) > 0 ? 'text-rose-500 font-bold' : ''}>
                    {resilienceMetrics?.rateLimiter?.totalThrottled || 0} reqs
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
