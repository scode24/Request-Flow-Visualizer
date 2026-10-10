import React, { useState } from 'react';
import { Play, Square, Settings2, Zap, Layers, RefreshCw } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';
import { LoadTestConfig } from '../../types';

export const LoadControlPanel: React.FC = () => {
  const { config, updateConfig, loadTestStatus, startLoadTest, stopLoadTest } = useSystem();

  const [scenario, setScenario] = useState<LoadTestConfig['scenario']>('get_product_cached');
  const [concurrentUsers, setConcurrentUsers] = useState<number>(10);
  const [durationSeconds, setDurationSeconds] = useState<number>(15);
  const [targetRps, setTargetRps] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const isRunning = !!loadTestStatus?.isRunning;

  const handleExecute = async () => {
    if (isRunning) {
      await stopLoadTest();
    } else {
      await startLoadTest({
        scenario,
        concurrentUsers,
        durationSeconds,
        targetRps: targetRps > 0 ? targetRps : undefined,
      });
    }
  };

  const handleModeChange = (mode: string) => {
    updateConfig({ infrastructureMode: mode });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 w-80 shrink-0 select-none overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Load & Scenario Lab</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {config?.infrastructureMode?.toUpperCase() || 'STANDARD'}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Simulate real concurrent HTTP traffic and observe distributed packet flow.
        </p>
      </div>

      {/* Main Controls Form */}
      <div className="p-4 space-y-4 flex-1">
        {/* Scenario Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Traffic Scenario
          </label>
          <select
            value={scenario}
            onChange={(e) => setScenario(e.target.value as any)}
            disabled={isRunning}
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="get_product_cached">⚡ Cached Read (Redis HIT path)</option>
            <option value="get_product_uncached">🗄️ Uncached Read (PostgreSQL Query)</option>
            <option value="get_random_product">🎲 Dynamic Queries (Cache Miss & Fill)</option>
            <option value="post_product">✍️ Product Creation (DB Write + Eviction)</option>
            <option value="get_object_storage">📦 MinIO Object S3 Retrieval</option>
            <option value="mixed_workload">🌐 Realistic Multi-Tier Production Mix</option>
          </select>
        </div>

        {/* Concurrency & Duration */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Users (VU)</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{concurrentUsers}</span>
            </div>
            <input
              type="range"
              min="1"
              max="150"
              value={concurrentUsers}
              onChange={(e) => setConcurrentUsers(parseInt(e.target.value, 10))}
              disabled={isRunning}
              className="w-full accent-emerald-500"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Duration</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{durationSeconds}s</span>
            </div>
            <input
              type="range"
              min="5"
              max="60"
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10))}
              disabled={isRunning}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        {/* Infrastructure Mode Quick Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Topology Mode
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'standard', label: 'Standard Tier' },
              { id: 'single-backend', label: 'Single Pod' },
              { id: 'hpa', label: 'Kubernetes HPA' },
              { id: 'cdn-bypass', label: 'CDN Bypass' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                disabled={isRunning}
                className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                  config?.infrastructureMode === m.id
                    ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-medium'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* CDN Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">CDN Edge Cache</span>
            <button
              onClick={() => updateConfig({ cdn: { enabled: !config?.cdn.enabled } })}
              disabled={isRunning}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                config?.cdn.enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  config?.cdn.enabled ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* HPA Autoscaling Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">HPA Autoscaling</span>
            <button
              onClick={() => updateConfig({ backend: { autoscalingEnabled: !config?.backend.autoscalingEnabled } })}
              disabled={isRunning}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                config?.backend.autoscalingEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                  config?.backend.autoscalingEnabled ? 'left-5' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Advanced Controls' : 'Show Advanced Controls'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Load Balancer Algorithm
                </label>
                <select
                  value={config?.loadBalancer.algorithm || 'round-robin'}
                  onChange={(e) => updateConfig({ loadBalancer: { algorithm: e.target.value } })}
                  disabled={isRunning}
                  className="w-full text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5"
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="least-connections">Least Connections</option>
                  <option value="random">Random Distribution</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Target RPS Cap</span>
                  <span className="font-mono">{targetRps > 0 ? `${targetRps} req/s` : 'Max Throughput'}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={targetRps}
                  onChange={(e) => setTargetRps(parseInt(e.target.value, 10))}
                  disabled={isRunning}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Pod Replicas</span>
                  <span className="font-mono">{config?.backend.activeReplicas || 3}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={config?.backend.activeReplicas || 3}
                  onChange={(e) => updateConfig({ backend: { activeReplicas: parseInt(e.target.value, 10) } })}
                  disabled={isRunning || config?.backend.autoscalingEnabled}
                  className="w-full accent-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Execute / Stop Button */}
        <div className="pt-2">
          <button
            onClick={handleExecute}
            className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-medium text-xs shadow-sm transition-all duration-150 ${
              isRunning
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 shadow-md animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 shadow-md'
            }`}
          >
            {isRunning ? (
              <>
                <Square className="w-4 h-4 fill-white" />
                <span>Stop Traffic Generator ({loadTestStatus?.remainingSeconds || 0}s)</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Execute Load Test</span>
              </>
            )}
          </button>
        </div>

        {/* Live Execution Status Card */}
        {loadTestStatus && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-400">Execution Telemetry</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                isRunning ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
              }`}>
                {isRunning ? 'RUNNING' : 'IDLE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Total Requests</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {loadTestStatus.totalRequests.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Achieved RPS</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {loadTestStatus.currentRps} /s
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">p95 Latency</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {loadTestStatus.p95LatencyMs} ms
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Success / Err</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  <span className="text-emerald-600">{loadTestStatus.successfulRequests}</span> / <span className="text-rose-500">{loadTestStatus.failedRequests}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
