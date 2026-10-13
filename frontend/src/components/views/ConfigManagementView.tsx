import React, { useState, useEffect } from 'react';
import { Sliders, Save, CheckCircle2 } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

export const ConfigManagementView: React.FC = () => {
  const { config, updateConfig } = useSystem();
  const [savedAlert, setSavedAlert] = useState(false);

  // Form states
  const [cdnEnabled, setCdnEnabled] = useState(config?.cdn.enabled ?? true);
  const [cdnTtl, setCdnTtl] = useState(config?.cdn.ttlSeconds ?? 30);
  const [cdnLatency, setCdnLatency] = useState(config?.cdn.simulatedLatencyMs ?? 10);

  const [lbAlgorithm, setLbAlgorithm] = useState(config?.loadBalancer.algorithm ?? 'round-robin');
  const [lbReplicas, setLbReplicas] = useState(config?.loadBalancer.replicas ?? 1);

  const [backendReplicas, setBackendReplicas] = useState(config?.backend.activeReplicas ?? 3);
  const [autoscalingEnabled, setAutoscalingEnabled] = useState(config?.backend.autoscalingEnabled ?? false);
  const [targetCpu, setTargetCpu] = useState(config?.backend.targetCpuPercent ?? 65);
  const [artificialDelay, setArtificialDelay] = useState(config?.backend.artificialDelayMs ?? 0);

  const [redisEnabled, setRedisEnabled] = useState(config?.redis.enabled ?? true);
  const [redisTtl, setRedisTtl] = useState(config?.redis.ttlSeconds ?? 60);

  const [dbMode, setDbMode] = useState(config?.database?.mode ?? 'standalone');
  const [dbReplicas, setDbReplicas] = useState(config?.database?.replicasCount ?? 2);
  const [dbShards, setDbShards] = useState(config?.database?.shardsCount ?? 2);
  const [dbShardingKey, setDbShardingKey] = useState(config?.database?.shardingKey ?? 'hash');

  // Sync state if config updates dynamically (e.g. via HPA autoscaling or presets)
  useEffect(() => {
    if (config) {
      setCdnEnabled(config.cdn.enabled);
      setCdnTtl(config.cdn.ttlSeconds);
      setCdnLatency(config.cdn.simulatedLatencyMs);
      setLbAlgorithm(config.loadBalancer.algorithm);
      setLbReplicas(config.loadBalancer.replicas);
      setBackendReplicas(config.backend.activeReplicas);
      setAutoscalingEnabled(config.backend.autoscalingEnabled);
      setTargetCpu(config.backend.targetCpuPercent);
      setArtificialDelay(config.backend.artificialDelayMs);
      setRedisEnabled(config.redis.enabled);
      setRedisTtl(config.redis.ttlSeconds);
      if (config.database) {
        setDbMode(config.database.mode);
        setDbReplicas(config.database.replicasCount);
        setDbShards(config.database.shardsCount);
        setDbShardingKey(config.database.shardingKey);
      }
    }
  }, [config]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfig({
      cdn: { enabled: cdnEnabled, ttlSeconds: cdnTtl, simulatedLatencyMs: cdnLatency },
      loadBalancer: { algorithm: lbAlgorithm, replicas: lbReplicas },
      backend: {
        activeReplicas: backendReplicas,
        autoscalingEnabled,
        targetCpuPercent: targetCpu,
        artificialDelayMs: artificialDelay,
      },
      redis: { enabled: redisEnabled, ttlSeconds: redisTtl },
      database: {
        mode: dbMode,
        replicasCount: dbReplicas,
        shardsCount: dbShards,
        shardingKey: dbShardingKey,
      },
    });
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto p-6 select-none text-xs">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-500" />
              <span>Infrastructure Configuration</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Adjust cluster parameters, caching policies, and traffic rules. Changes apply dynamically.
            </p>
          </div>

          {savedAlert && (
            <div className="flex items-center gap-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Configuration Applied Successfully!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* CDN Edge Configuration */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              CDN Edge Simulation Settings
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">CDN Edge Cache</label>
                <select
                  value={cdnEnabled ? 'true' : 'false'}
                  onChange={(e) => setCdnEnabled(e.target.value === 'true')}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Bypassed (Direct to Gateway)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Edge TTL (Seconds)</label>
                <input
                  type="number"
                  value={cdnTtl}
                  onChange={(e) => setCdnTtl(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Simulated Edge Latency (ms)</label>
                <input
                  type="number"
                  value={cdnLatency}
                  onChange={(e) => setCdnLatency(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Load Balancer Settings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Load Balancer Routing & Replicas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Routing Algorithm</label>
                <select
                  value={lbAlgorithm}
                  onChange={(e) => setLbAlgorithm(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="round-robin">Round Robin</option>
                  <option value="least-connections">Least Connections</option>
                  <option value="random">Random</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Load Balancer Instances</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={lbReplicas}
                  onChange={(e) => setLbReplicas(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Backend & HPA Settings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Backend Pods & Autoscaling Policy
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Backend Replicas</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={backendReplicas}
                  onChange={(e) => setBackendReplicas(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Kubernetes HPA Status</label>
                <select
                  value={autoscalingEnabled ? 'true' : 'false'}
                  onChange={(e) => setAutoscalingEnabled(e.target.value === 'true')}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="true">Enabled (Auto Scale Pods)</option>
                  <option value="false">Disabled (Fixed Replicas)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Target CPU Utilization (%)</label>
                <input
                  type="number"
                  min="30"
                  max="90"
                  value={targetCpu}
                  onChange={(e) => setTargetCpu(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Artificial Delay (ms) (Lab Mode)</label>
                <input
                  type="number"
                  min="0"
                  max="500"
                  value={artificialDelay}
                  onChange={(e) => setArtificialDelay(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Redis Caching Settings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              Redis Caching Strategy
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Redis Cache State</label>
                <select
                  value={redisEnabled ? 'true' : 'false'}
                  onChange={(e) => setRedisEnabled(e.target.value === 'true')}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Redis Key TTL (Seconds)</label>
                <input
                  type="number"
                  value={redisTtl}
                  onChange={(e) => setRedisTtl(parseInt(e.target.value, 10))}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Database Architecture & Sharding Settings */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              PostgreSQL Architecture & Scaling Tier
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Architecture Topology</label>
                <select
                  value={dbMode}
                  onChange={(e) => setDbMode(e.target.value as any)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="standalone">Standalone (Single Primary Instance)</option>
                  <option value="read-replicas">Read Replicas (Primary Leader + Replicas)</option>
                  <option value="sharded">Sharded Cluster (Horizontal Partitioning)</option>
                </select>
              </div>

              {dbMode === 'read-replicas' && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Read Replicas Count (1-4)</label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={dbReplicas}
                    onChange={(e) => setDbReplicas(parseInt(e.target.value, 10))}
                    className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
              )}

              {dbMode === 'sharded' && (
                <>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Shards Partitions Count (2-4)</label>
                    <input
                      type="number"
                      min="2"
                      max="4"
                      value={dbShards}
                      onChange={(e) => setDbShards(parseInt(e.target.value, 10))}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 mb-1">Partition Key Scheme</label>
                    <select
                      value={dbShardingKey}
                      onChange={(e) => setDbShardingKey(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="hash">Consistent Hash Routing</option>
                      <option value="range">Range Partitioning (ID Buckets)</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-sm shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Apply Configuration Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
