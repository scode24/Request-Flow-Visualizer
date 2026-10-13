import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { AlertTriangle, Sparkles, X, ArrowUpRight, Cpu, Server, Zap, Check } from 'lucide-react';

export const ScalingAdvisoryBanner: React.FC = () => {
  const { activeAdvisory, dismissAdvisory, updateConfig, config } = useSystem();

  if (!activeAdvisory) return null;

  const isWarning = activeAdvisory.level === 'warning';
  const suggestion = activeAdvisory.suggestion;

  const handleApplyAllRecommendations = async () => {
    const updates: any = {};
    if (suggestion?.recommendedPods) {
      updates.backend = { activeReplicas: suggestion.recommendedPods };
    }
    if (suggestion?.recommendedCache === 'cluster') {
      updates.redis = {
        clusterMode: 'cluster',
        nodesCount: 3,
        hashingStrategy: 'consistent-hashing',
      };
    }
    if (suggestion?.recommendedDbMode === 'read-replicas') {
      updates.database = {
        mode: 'read-replicas',
        replicasCount: 2,
      };
    }
    await updateConfig(updates);
    dismissAdvisory();
  };

  const handleScalePods = async () => {
    if (suggestion?.recommendedPods) {
      await updateConfig({ backend: { activeReplicas: suggestion.recommendedPods } });
    }
    dismissAdvisory();
  };

  const handleScaleCache = async () => {
    await updateConfig({
      redis: {
        clusterMode: 'cluster',
        nodesCount: 3,
        hashingStrategy: 'consistent-hashing',
      },
    });
    dismissAdvisory();
  };

  const handleEnableHpa = async () => {
    await updateConfig({
      backend: {
        autoscalingEnabled: true,
        minReplicas: 2,
        maxReplicas: 8,
      },
    });
    dismissAdvisory();
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 max-w-xl w-[92%] animate-in fade-in slide-in-from-top-4 duration-300 font-sans select-none">
      <div
        className={`rounded-2xl p-4 shadow-2xl backdrop-blur-md border ${
          isWarning
            ? 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 shadow-amber-500/10'
            : 'bg-indigo-50/95 dark:bg-slate-900/95 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-100 shadow-indigo-500/10'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl flex items-center justify-center ${
                isWarning
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                  : 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {isWarning ? (
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              ) : (
                <Sparkles className="w-5 h-5 text-indigo-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  {activeAdvisory.title}
                </h4>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full uppercase ${
                    isWarning
                      ? 'bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                      : 'bg-indigo-200/80 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200'
                  }`}
                >
                  {isWarning ? 'Auto-Scaling Active' : 'Advisory Engine'}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">
                {activeAdvisory.message}
              </p>
            </div>
          </div>

          <button
            onClick={dismissAdvisory}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actionable Suggestions for Non-Scaling / Advisory Scenario */}
        {!isWarning && (
          <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-slate-800/80">
            <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Recommended actions to optimize infrastructure throughput:
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {suggestion?.recommendedPods && (
                <button
                  onClick={handleScalePods}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1 shadow-sm transition-colors text-[11px]"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Scale Pods to {suggestion.recommendedPods}</span>
                </button>
              )}

              <button
                onClick={handleScaleCache}
                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium flex items-center gap-1 shadow-sm transition-colors text-[11px]"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Cluster Redis (Consistent Hash)</span>
              </button>

              <button
                onClick={handleEnableHpa}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 shadow-sm transition-colors text-[11px]"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Enable Autoscaler (HPA)</span>
              </button>

              <button
                onClick={handleApplyAllRecommendations}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-white font-semibold flex items-center gap-1 text-[11px] ml-auto transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply All</span>
              </button>
            </div>
          </div>
        )}

        {/* Warning Details when Scaling is Triggered */}
        {isWarning && (
          <div className="mt-2.5 pt-2 border-t border-amber-200/80 dark:border-amber-800/80 flex items-center justify-between text-[11px] font-mono text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <span>
                Replicas: <strong>{activeAdvisory.previousReplicas || config.backend.activeReplicas}</strong>
              </span>
              <span>➔</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                {activeAdvisory.targetReplicas || 4} Pods Provisioning
              </span>
            </div>
            <button
              onClick={dismissAdvisory}
              className="text-amber-700 dark:text-amber-300 underline font-sans text-xs hover:text-amber-900"
            >
              Acknowledge
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
