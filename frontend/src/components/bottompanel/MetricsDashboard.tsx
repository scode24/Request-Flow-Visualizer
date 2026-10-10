import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { Activity, Gauge, Server, Database, Zap } from 'lucide-react';

export const MetricsDashboard: React.FC = () => {
  const {
    loadTestStatus,
    cacheMetrics,
    databaseMetrics,
    loadBalancerMetrics,
    autoscalerMetrics,
  } = useSystem();

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-xs">
      {/* Top Telemetry Grid */}
      <div className="grid grid-cols-4 gap-3">
        {/* Card 1: Throughput */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Throughput (RPS)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {loadTestStatus?.currentRps || 0}
            <span className="text-xs font-normal text-slate-400 ml-1">req/s</span>
          </div>
          <span className="text-[10px] text-slate-400">Total: {loadTestStatus?.totalRequests || 0} requests</span>
        </div>

        {/* Card 2: Latencies */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Latency Percentiles</span>
            <Gauge className="w-4 h-4 text-sky-500" />
          </div>
          <div className="grid grid-cols-3 gap-1 font-mono pt-1">
            <div>
              <span className="text-[10px] text-slate-400 block">p50</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{loadTestStatus?.p50LatencyMs || 0}ms</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">p95</span>
              <span className="font-bold text-amber-500">{loadTestStatus?.p95LatencyMs || 0}ms</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">p99</span>
              <span className="font-bold text-rose-500">{loadTestStatus?.p99LatencyMs || 0}ms</span>
            </div>
          </div>
        </div>

        {/* Card 3: Redis Cache */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Redis Cache Hit Rate</span>
            <Zap className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {cacheMetrics?.hitRatioPercent || 0}%
          </div>
          <span className="text-[10px] text-slate-400">
            Hits: {cacheMetrics?.totalHits || 0} | Misses: {cacheMetrics?.totalMisses || 0}
          </span>
        </div>

        {/* Card 4: Backend Pods */}
        <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active Backend Pods</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {loadBalancerMetrics?.instances.length || 1}
            <span className="text-xs font-normal text-slate-400 ml-1">Replicas</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Avg CPU: {autoscalerMetrics?.currentCpuPercent || 15}%
          </span>
        </div>
      </div>

      {/* Backend Pod Distribution Breakdown */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
          Per-Pod Traffic Distribution & Resource Allocation
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {loadBalancerMetrics?.instances.map((pod) => (
            <div
              key={pod.id}
              className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
            >
              <div className="flex items-center justify-between font-mono mb-2">
                <span className="font-bold text-slate-800 dark:text-slate-200">{pod.name}</span>
                <span className="text-emerald-600 text-[10px] font-semibold">{pod.status}</span>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">CPU Usage:</span>
                  <span className="font-bold">{pod.cpuPercent}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, pod.cpuPercent)}%` }}
                  />
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-slate-400">Active Connections:</span>
                  <span>{pod.activeConnections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Requests Handled:</span>
                  <span>{pod.totalRequests}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
