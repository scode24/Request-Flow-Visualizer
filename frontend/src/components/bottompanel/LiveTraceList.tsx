import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { TraceSummary, TraceSpan } from '../../types';
import { CheckCircle2, XCircle, Clock, ChevronRight, CornerDownRight } from 'lucide-react';

export const LiveTraceList: React.FC = () => {
  const { recentTraces, selectedTrace, setSelectedTrace, clearTraces } = useSystem();

  return (
    <div className="flex h-full text-xs">
      {/* Left List of Recent Traces */}
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Recent Request Traces</span>
          <button
            onClick={clearTraces}
            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Clear
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {recentTraces.length === 0 ? (
            <div className="p-6 text-center text-slate-400">
              No active traces yet. Execute a load test or send an API request.
            </div>
          ) : (
            recentTraces.map((trace) => {
              const isSelected = selectedTrace?.traceId === trace.traceId;
              const isSuccess = (trace.statusCode || 200) < 400;

              return (
                <div
                  key={trace.traceId}
                  onClick={() => setSelectedTrace(trace)}
                  className={`p-2.5 cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-l-2 border-emerald-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{trace.method}</span>
                        <span className="text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{trace.path}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                        <span>{trace.traceId.slice(0, 8)}</span>
                        {trace.cacheOutcome && (
                          <span className={trace.cacheOutcome === 'hit' ? 'text-emerald-500 font-bold' : 'text-amber-500'}>
                            CACHE-{trace.cacheOutcome.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {trace.totalDurationMs !== undefined ? `${trace.totalDurationMs}ms` : '...'}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      HTTP {trace.statusCode || 200}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Detailed Trace Waterfall / Span Inspector */}
      <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50/20 dark:bg-slate-900/20 p-4">
        {selectedTrace ? (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                    {selectedTrace.method}
                  </span>
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {selectedTrace.path}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-1">
                  Trace ID: <span className="text-slate-800 dark:text-slate-200">{selectedTrace.traceId}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-slate-400 block">Total Duration</span>
                  <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                    {selectedTrace.totalDurationMs} ms
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status Code</span>
                  <span className="font-mono font-bold text-sm text-emerald-600">
                    {selectedTrace.statusCode}
                  </span>
                </div>
              </div>
            </div>

            {/* Span Waterfall */}
            <div>
              <h5 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Distributed Hop Sequence</h5>
              <div className="space-y-2">
                {selectedTrace.spans.map((span, idx) => (
                  <div
                    key={span.spanId}
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-mono text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
                            {span.component}
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {span.operation}
                          </span>
                          {span.instanceId && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {span.instanceId}
                            </span>
                          )}
                        </div>
                        {span.details && (
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {JSON.stringify(span.details)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {span.durationMs ? `${span.durationMs}ms` : '<1ms'}
                      </span>
                      <span className={`block text-[10px] font-semibold ${
                        span.status === 'cache-hit' ? 'text-emerald-500' :
                        span.status === 'cache-miss' ? 'text-amber-500' :
                        span.status === 'error' ? 'text-rose-500' : 'text-slate-400'
                      }`}>
                        {span.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Select a trace from the left panel to inspect its distributed hop timeline.
          </div>
        )}
      </div>
    </div>
  );
};
