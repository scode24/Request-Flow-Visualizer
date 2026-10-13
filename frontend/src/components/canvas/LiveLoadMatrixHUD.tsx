import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import {
  Activity,
  Gauge,
  Server,
  Database,
  Zap,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Layers,
  Cpu,
} from 'lucide-react';

export const LiveLoadMatrixHUD: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const {
    loadTestStatus,
    cacheMetrics,
    databaseMetrics,
    loadBalancerMetrics,
    autoscalerMetrics,
    config,
  } = useSystem();

  const isRunning = !!loadTestStatus?.isRunning;
  const currentRps = loadTestStatus?.currentRps || 0;
  const p50 = loadTestStatus?.p50LatencyMs || 0;
  const p95 = loadTestStatus?.p95LatencyMs || 0;
  const p99 = loadTestStatus?.p99LatencyMs || 0;
  const cacheHitRate = cacheMetrics?.hitRatioPercent || 0;
  const activePods = loadBalancerMetrics?.instances?.length || 1;
  const avgCpu = autoscalerMetrics?.currentCpuPercent || 15;

  const dbMode = databaseMetrics?.mode || config?.database?.mode || 'standalone';
  const dbNodes = databaseMetrics?.nodes || [];

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto select-none font-sans">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xl w-[480px] max-w-[calc(100vw-22rem)] transition-all duration-200 overflow-hidden">
        {/* HUD Header Bar */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isRunning ? 'bg-emerald-400' : 'bg-sky-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isRunning ? 'bg-emerald-500' : 'bg-sky-500'
                }`}
              />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                Live Load Matrix
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full font-semibold uppercase bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {isRunning ? 'Load Running' : 'Telemetry Live'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick mini metrics when collapsed */}
            {!isExpanded && (
              <div className="flex items-center gap-2.5 text-[11px] font-mono">
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {currentRps} RPS
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-amber-500 font-semibold">{p95}ms</span>
                <span className="text-slate-400">|</span>
                <span className="text-indigo-500 font-semibold">{activePods} Pods</span>
              </div>
            )}

            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* HUD Expanded Body */}
        {isExpanded && (
          <div className="p-3.5 space-y-3 max-h-[75vh] overflow-y-auto">
            {/* 4 Main Core KPI Tiles */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              {/* Tile 1: Throughput */}
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Throughput
                  </span>
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {currentRps}
                  <span className="text-[10px] font-normal text-slate-400 ml-0.5">rps</span>
                </div>
                <span className="text-[9px] text-slate-400 truncate">
                  {loadTestStatus?.totalRequests?.toLocaleString() || 0} reqs
                </span>
              </div>

              {/* Tile 2: Latencies */}
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Latency
                  </span>
                  <Gauge className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {p50}
                  <span className="text-[10px] font-normal text-slate-400 ml-0.5">ms (p50)</span>
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="text-amber-500 font-semibold">{p95}ms p95</span>
                  <span className="text-rose-500 font-semibold">{p99}ms p99</span>
                </div>
              </div>

              {/* Tile 3: Cache Hit % */}
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Cache Hit
                  </span>
                  <Zap className="w-3.5 h-3.5 text-red-500" />
                </div>
                <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {cacheHitRate}%
                </div>
                <span className="text-[9px] text-slate-400 truncate">
                  {cacheMetrics?.totalHits || 0} hits / {cacheMetrics?.totalMisses || 0} miss
                </span>
              </div>

              {/* Tile 4: Active Pods */}
              <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
                <div className="flex items-center justify-between text-slate-500 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Pods / CPU
                  </span>
                  <Server className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                  {activePods}
                  <span className="text-[10px] font-normal text-slate-400 ml-0.5">pods</span>
                </div>
                <span className="text-[9px] text-slate-400 truncate">
                  Avg CPU: {Math.round(avgCpu)}%
                </span>
              </div>
            </div>

            {/* Backend Pods Load Breakdown */}
            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                  Backend Pods Load Tree
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {config?.loadBalancer?.algorithm || 'round-robin'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {loadBalancerMetrics?.instances?.map((pod, i) => {
                  const cpu = pod.cpuPercent ?? 15;
                  const conns = pod.activeConnections ?? 0;
                  return (
                    <div
                      key={pod.id}
                      className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {pod.name || `Pod #${i + 1}`}
                        </span>
                        <span
                          className={`font-bold px-1 rounded text-[9px] ${
                            cpu > 80
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : cpu > 50
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {cpu}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            cpu > 80
                              ? 'bg-rose-500'
                              : cpu > 50
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(5, Math.min(100, cpu))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>{conns} conns</span>
                        <span>{pod.totalRequests || 0} reqs</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Database Tier Topology & Shard/Replica Load */}
            <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Database Tier Load
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-semibold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60">
                  {dbMode === 'standalone'
                    ? 'Standalone'
                    : dbMode === 'read-replicas'
                    ? `Primary + ${config?.database?.replicasCount || 2} Replicas`
                    : `${config?.database?.shardsCount || 2} Shards (${config?.database?.shardingKey || 'hash'})`}
                </span>
              </div>

              {/* DB Nodes List */}
              <div className="space-y-1.5">
                {dbNodes.length > 0 ? (
                  dbNodes.map((node) => {
                    const cpu = node.cpuPercent ?? 12;
                    return (
                      <div
                        key={node.id}
                        className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-[10px] font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              node.role === 'primary'
                                ? 'bg-blue-500'
                                : node.role === 'replica'
                                ? 'bg-sky-400'
                                : 'bg-indigo-500'
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                              {node.name}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              {node.role === 'shard'
                                ? `Key: ${node.shardKey || 'Hash'}`
                                : node.role === 'replica'
                                ? 'Read Replica'
                                : 'Primary Leader'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-slate-500 block">{node.totalQueries} queries</span>
                            <span className="text-[9px] text-slate-400">{node.activeConnections} conns</span>
                          </div>
                          <div className="w-14">
                            <div className="flex justify-between text-[9px] mb-0.5">
                              <span className="text-slate-400">Load</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300">{cpu}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${Math.max(6, Math.min(100, cpu))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-900 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                    <span>PostgreSQL Primary</span>
                    <span>{databaseMetrics?.totalQueries || 0} queries | {databaseMetrics?.activeConnections || 1} conns</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
