import React from 'react';
import { useSystem } from '../../context/SystemContext';
import { Code, FileJson, CheckCircle } from 'lucide-react';

export const ResponseInspector: React.FC = () => {
  const { selectedTrace, recentTraces } = useSystem();
  const trace = selectedTrace || recentTraces[0];

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4 text-xs font-mono">
      {trace ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                HTTP {trace.statusCode || 200}
              </span>
              <span className="text-slate-800 dark:text-slate-200 font-semibold">{trace.method} {trace.path}</span>
            </div>
            <span className="text-slate-400">Total Roundtrip: {trace.totalDurationMs} ms</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Metadata & Routing
              </span>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                <div>Trace ID: <span className="text-slate-700 dark:text-slate-300">{trace.traceId}</span></div>
                <div>Backend Instance: <span className="text-slate-700 dark:text-slate-300">{trace.backendInstance || 'N/A'}</span></div>
                <div>CDN Outcome: <span className="text-slate-700 dark:text-slate-300">{trace.cdnOutcome || 'bypassed'}</span></div>
                <div>Cache Outcome: <span className="text-slate-700 dark:text-slate-300">{trace.cacheOutcome || 'N/A'}</span></div>
                <div>PostgreSQL Queried: <span className="text-slate-700 dark:text-slate-300">{trace.databaseQueried ? 'YES' : 'NO (Cached)'}</span></div>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Response Payload JSON
              </span>
              <pre className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(
                  {
                    traceId: trace.traceId,
                    statusCode: trace.statusCode || 200,
                    durationMs: trace.totalDurationMs,
                    spansCount: trace.spans.length,
                    executedHops: trace.spans.map((s) => `${s.component}:${s.operation}`),
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-slate-400 font-sans">
          Send a request or run a load test to inspect live HTTP responses.
        </div>
      )}
    </div>
  );
};
