import React, { useState } from 'react';
import { useSystem } from '../../context/SystemContext';
import {
  Activity,
  Gauge,
  Server,
  Zap,
  ChevronRight,
  ChevronLeft,
  Database,
  HardDrive,
  Globe,
  Sliders,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const LiveLoadMatrixPanel: React.FC = () => {
  const {
    loadTestStatus,
    cacheMetrics,
    loadBalancerMetrics,
    autoscalerMetrics,
    databaseMetrics,
    storageMetrics,
    config,
    selectedNodeId,
    setSelectedNodeId,
  } = useSystem();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const isRunning = !!loadTestStatus?.isRunning;
  const currentRps = loadTestStatus?.currentRps || 0;
  const p50 = loadTestStatus?.p50LatencyMs || 0;
  const p95 = loadTestStatus?.p95LatencyMs || 0;
  const p99 = loadTestStatus?.p99LatencyMs || 0;
  const cacheHitRate = cacheMetrics?.hitRatioPercent || 0;
  const activePods = loadBalancerMetrics?.instances?.length || 1;
  const avgCpu = autoscalerMetrics?.currentCpuPercent || 15;

  const dbConns = databaseMetrics?.activeConnections || 1;
  const totalDbQueries = databaseMetrics?.totalQueries || 0;
  const storageReads = storageMetrics?.totalReads || 0;

  if (isCollapsed) {
    return (
      <div className="w-12 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col items-center py-4 select-none transition-all duration-200 z-10 shadow-xs">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4"
          title="Expand Live Load Matrix"
        >
          <ChevronLeft className="w-4 h-4 text-emerald-500" />
        </button>

        <div className="flex-1 flex flex-col items-center justify-between py-6">
          <div className="flex flex-col items-center gap-4 text-slate-400">
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
            <Activity className="w-4 h-4 text-emerald-500" />
            <Gauge className="w-4 h-4 text-sky-500" />
            <Zap className="w-4 h-4 text-rose-500" />
            <Server className="w-4 h-4 text-indigo-500" />
          </div>

          <div className="writing-mode-vertical rotate-180 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-semibold">
            {isRunning ? `${currentRps} RPS` : 'MATRIX READY'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 flex flex-col h-full overflow-y-auto select-none font-sans z-10 transition-all duration-200 shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
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
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Live Load Matrix
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              Real-time Cluster Telemetry
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
              isRunning
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isRunning ? 'Active' : 'Live'}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Collapse Matrix Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-3.5 space-y-3.5 flex-1">
        {/* Core 4 Metrics (Throughput, Latency, Cache Hit, Pods/CPU) */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-between">
            <span>Primary Core Metrics</span>
            <span className="font-mono text-[9px]">4/4 FIXED</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* 1. Throughput */}
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Throughput
                </span>
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Activity className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {currentRps}
                <span className="text-[10px] font-normal text-slate-400 ml-1">rps</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate font-mono mt-1">
                {loadTestStatus?.totalRequests?.toLocaleString() || 0} reqs total
              </span>
            </div>

            {/* 2. Latency */}
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Latency
                </span>
                <div className="p-1 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Gauge className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {p50}
                <span className="text-[10px] font-normal text-slate-400 ml-1">ms</span>
              </div>
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span className="text-amber-500 font-semibold">{p95}ms p95</span>
                <span className="text-rose-500 font-semibold">{p99}ms p99</span>
              </div>
            </div>

            {/* 3. Cache Hit Ratio */}
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cache Hit
                </span>
                <div className="p-1 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                {cacheHitRate}%
              </div>
              <span className="text-[9px] text-slate-400 truncate font-mono mt-1">
                {cacheMetrics?.totalHits || 0} hit / {cacheMetrics?.totalMisses || 0} miss
              </span>
            </div>

            {/* 4. Pods / CPU */}
            <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Pods / CPU
                </span>
                <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Server className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {activePods}
                <span className="text-[10px] font-normal text-slate-400 ml-1">pods</span>
              </div>
              <span className="text-[9px] text-slate-400 truncate font-mono mt-1">
                CPU: <strong className={avgCpu > 80 ? 'text-rose-500' : 'text-slate-600 dark:text-slate-300'}>{Math.round(avgCpu)}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Live Cluster Utilization Gauges */}
        <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 space-y-2.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Cluster Health & Gauges</span>
            <span className="font-mono text-[9px] text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              STABLE
            </span>
          </div>

          {/* CPU Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
              <span className="text-slate-500">Avg Pod CPU</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.round(avgCpu)}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  avgCpu > 80 ? 'bg-rose-500' : avgCpu > 50 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, avgCpu))}%` }}
              />
            </div>
          </div>

          {/* Cache Hit Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
              <span className="text-slate-500">Cache Efficiency</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{cacheHitRate}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, cacheHitRate)}%` }}
              />
            </div>
          </div>

          {/* Database Pool Gauge */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1 font-mono">
              <span className="text-slate-500">Database Pool</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{dbConns} / 10 active</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${Math.min(100, (dbConns / 10) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Distributed Component Status Cards */}
        <div className="space-y-1.5 text-xs font-mono">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-1">
            Component Telemetry
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-[11px]">Database Queries</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{totalDbQueries}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <Zap className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[11px]">Redis Cached Keys</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{cacheMetrics?.keysCount || 0}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px]">MinIO Object Reads</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">{storageReads}</span>
          </div>
        </div>

        {/* Selected Node Quick Info */}
        {selectedNodeId && (
          <div className="p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-indigo-900 dark:text-indigo-200 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Active Selection
              </span>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-mono"
              >
                Clear
              </button>
            </div>
            <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 block truncate">
              ID: {selectedNodeId}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
