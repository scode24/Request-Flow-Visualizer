import React, { useState } from 'react';
import { Send, CheckCircle2, Clock, Server, Zap, Database, HardDrive, Terminal } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

interface ApiPreset {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: string;
  description: string;
}

const PRESETS: ApiPreset[] = [
  {
    name: 'Health Check',
    method: 'GET',
    path: '/api/health',
    description: 'System health, uptime, and cluster status',
  },
  {
    name: 'Fetch Product (Cached)',
    method: 'GET',
    path: '/api/products/1',
    description: 'Evaluates CDN edge cache, then Redis cache hit',
  },
  {
    name: 'Fetch Product (Bypass Cache)',
    method: 'GET',
    path: '/api/products/1?cache=false',
    description: 'Bypasses Redis and queries PostgreSQL directly',
  },
  {
    name: 'Create Product (PostgreSQL Write)',
    method: 'POST',
    path: '/api/products',
    body: JSON.stringify({
      name: 'High-Speed Fiber Switch 32X',
      description: 'Ultra-low latency data center aggregation switch',
      price: 1890.00,
      stock: 22,
      category: 'Networking',
    }, null, 2),
    description: 'Executes parameterized SQL INSERT and purges product list cache',
  },
  {
    name: 'Retrieve MinIO S3 Object',
    method: 'GET',
    path: '/api/objects/architecture-spec.json',
    description: 'Streams JSON architecture specification document from MinIO',
  },
  {
    name: 'Cluster Telemetry Summary',
    method: 'GET',
    path: '/api/metrics/summary',
    description: 'Consolidated real-time metrics across all system tiers',
  },
];

export const ApiConsoleView: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<ApiPreset>(PRESETS[1]);
  const [customPath, setCustomPath] = useState(PRESETS[1].path);
  const [customMethod, setCustomMethod] = useState<'GET' | 'POST'>(PRESETS[1].method);
  const [customBody, setCustomBody] = useState(PRESETS[1].body || '');
  const [loading, setLoading] = useState(false);
  const [responseDetails, setResponseDetails] = useState<any>(null);
  const { refreshTraces } = useSystem();

  const handleSelectPreset = (preset: ApiPreset) => {
    setSelectedPreset(preset);
    setCustomPath(preset.path);
    setCustomMethod(preset.method);
    setCustomBody(preset.body || '');
  };

  const handleSendRequest = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const res = await fetch(customPath, {
        method: customMethod,
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Console': 'true',
        },
        body: customMethod === 'POST' && customBody ? customBody : undefined,
      });

      const durationMs = Date.now() - start;
      const headersObj: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        headersObj[key] = val;
      });

      let jsonBody: any = null;
      try {
        jsonBody = await res.json();
      } catch (e) {
        jsonBody = { message: 'Non-JSON response' };
      }

      setResponseDetails({
        status: res.status,
        statusText: res.statusText,
        durationMs,
        headers: headersObj,
        body: jsonBody,
        traceId: headersObj['x-trace-id'],
        backendInstance: headersObj['x-backend-instance'],
        cacheStatus: headersObj['x-cache-status'],
      });

      // Refresh trace history
      await refreshTraces();
    } catch (err: any) {
      setResponseDetails({
        status: 500,
        statusText: 'Network Error',
        durationMs: Date.now() - start,
        error: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden p-6 select-none text-xs">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col space-y-4">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-500" />
            <span>Interactive API Console</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Test backend REST endpoints with live trace propagation, headers, and execution metrics.
          </p>
        </div>

        {/* Preset Selector Badges */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(p)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition-all ${
                selectedPreset.name === p.name
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-semibold'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span className="font-mono text-[10px] font-bold mr-1.5 opacity-70">{p.method}</span>
              {p.name}
            </button>
          ))}
        </div>

        {/* Main Request Form & Response Viewer */}
        <div className="flex-1 grid grid-cols-12 gap-5 overflow-hidden">
          {/* Left: Request Builder */}
          <div className="col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col space-y-3">
            {/* Address Bar */}
            <div className="flex items-center gap-2">
              <select
                value={customMethod}
                onChange={(e) => setCustomMethod(e.target.value as any)}
                className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                className="flex-1 font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={handleSendRequest}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              {selectedPreset.description}
            </p>

            {/* Request Payload Editor (if POST) */}
            {customMethod === 'POST' && (
              <div className="flex-1 flex flex-col">
                <span className="font-semibold text-slate-700 dark:text-slate-300 mb-1">JSON Payload</span>
                <textarea
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 font-mono text-xs resize-none"
                  rows={8}
                />
              </div>
            )}
          </div>

          {/* Right: Response Inspector */}
          <div className="col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col space-y-3 overflow-hidden">
            {responseDetails ? (
              <>
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                      responseDetails.status < 400
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    }`}>
                      HTTP {responseDetails.status} {responseDetails.statusText}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {responseDetails.durationMs} ms
                    </span>
                  </div>

                  {responseDetails.traceId && (
                    <span className="font-mono text-[11px] text-slate-500">
                      Trace: {responseDetails.traceId.slice(0, 8)}
                    </span>
                  )}
                </div>

                {/* Routing & Hop Diagnostics Badges */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Backend Pod</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {responseDetails.backendInstance || 'Primary Server'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Cache Status</span>
                    <span className={`font-mono font-semibold ${
                      responseDetails.cacheStatus === 'HIT' ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-400'
                    }`}>
                      {responseDetails.cacheStatus || 'BYPASSED'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block">Latency</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {responseDetails.durationMs} ms
                    </span>
                  </div>
                </div>

                {/* Body Viewer */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 mb-1">Response Body</span>
                  <pre className="flex-1 p-3 rounded-lg bg-slate-950 text-slate-100 font-mono overflow-y-auto leading-relaxed">
                    {JSON.stringify(responseDetails.body || responseDetails.error, null, 2)}
                  </pre>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-sans">
                Select an endpoint or click 'Send' to inspect live HTTP response payload.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
