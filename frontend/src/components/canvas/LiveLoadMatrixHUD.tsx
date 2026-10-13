import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { Activity, Gauge, Server, Zap } from 'lucide-react';

export const LiveLoadMatrixHUD: React.FC = () => {
  const {
    loadTestStatus,
    cacheMetrics,
    loadBalancerMetrics,
    autoscalerMetrics,
  } = useSystem();

  const isRunning = !!loadTestStatus?.isRunning;
  const currentRps = loadTestStatus?.currentRps || 0;
  const p50 = loadTestStatus?.p50LatencyMs || 0;
  const p95 = loadTestStatus?.p95LatencyMs || 0;
  const p99 = loadTestStatus?.p99LatencyMs || 0;
  const cacheHitRate = cacheMetrics?.hitRatioPercent || 0;
  const activePods = loadBalancerMetrics?.instances?.length || 1;
  const avgCpu = autoscalerMetrics?.currentCpuPercent || 15;

  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-auto select-none font-sans">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 shadow-xl p-3 w-[470px] max-w-[calc(100vw-22rem)] transition-all duration-200">
        {/* HUD Fixed Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
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
            </div>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
              isRunning
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isRunning ? 'Load Active' : 'Cluster Live'}
          </span>
        </div>

        {/* 4 Fixed Core Metrics Cards Only */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          {/* Card 1: Throughput */}
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
            <span className="text-[9px] text-slate-400 truncate font-mono">
              {loadTestStatus?.totalRequests?.toLocaleString() || 0} reqs
            </span>
          </div>

          {/* Card 2: Latencies */}
          <div className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/50 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Latency
              </span>
              <Gauge className="w-3.5 h-3.5 text-sky-500" />
            </div>
            <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
              {p50}
              <span className="text-[10px] font-normal text-slate-400 ml-0.5">ms</span>
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
              <span className="text-amber-500 font-semibold">{p95}ms p95</span>
              <span className="text-rose-500 font-semibold">{p99}ms p99</span>
            </div>
          </div>

          {/* Card 3: Cache Hit */}
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
            <span className="text-[9px] text-slate-400 truncate font-mono">
              {cacheMetrics?.totalHits || 0} hit / {cacheMetrics?.totalMisses || 0} miss
            </span>
          </div>

          {/* Card 4: Pods / CPU */}
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
            <span className="text-[9px] text-slate-400 truncate font-mono">
              CPU: {Math.round(avgCpu)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
