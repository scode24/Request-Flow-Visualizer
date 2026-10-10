import React, { useState, useEffect } from 'react';
import { Zap, Database, HardDrive, Split, Globe, ArrowUpRight, Play, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

type ComponentTab = 'cache' | 'database' | 'storage' | 'loadbalancer' | 'cdn' | 'autoscaler';

export const ComponentTestingView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ComponentTab>('cache');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { config, updateConfig } = useSystem();

  // 1. Cache Test Action
  const runCacheTest = async (op: 'get' | 'set' | 'invalidate' | 'flush', key = 'demo:key', value?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/cache/test-op', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, key, value, ttl: 30 }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 2. Database Test Action
  const runDatabaseTest = async (op: 'read' | 'write' | 'reset', id = 1, payload?: any) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/database/test-op', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, id, payload }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 3. Storage Test Action
  const runStorageTest = async (op: 'read' | 'write' | 'list', key = 'architecture-spec.json', content?: any) => {
    setLoading(true);
    try {
      if (op === 'list') {
        const res = await fetch('/api/test/storage/objects');
        const data = await res.json();
        setTestResult(data);
      } else {
        const res = await fetch('/api/test/storage/test-op', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ op, key, content }),
        });
        const data = await res.json();
        setTestResult(data);
      }
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 4. Load Balancer Distribution Test
  const runLbDistributionTest = async (requestsCount = 20) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/loadbalancer/test-distribution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestsCount }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 5. CDN Test Action
  const runCdnTest = async (op: 'evaluate' | 'purge', route = '/api/products/1') => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/cdn/test-op', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ op, route }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 6. Autoscaler Spike Test
  const runAutoscalerSpike = async (cpuPercent = 88) => {
    setLoading(true);
    try {
      const res = await fetch('/api/test/autoscaler/simulate-spike', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpuPercent }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden p-6 select-none">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col space-y-5">
        {/* Title */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Independent Component Testing Lab
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Execute targeted isolated experiments against individual distributed architecture tiers.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 text-xs">
          {[
            { id: 'cache', label: 'Redis Cache', icon: Zap, color: 'text-red-500' },
            { id: 'database', label: 'PostgreSQL Database', icon: Database, color: 'text-blue-500' },
            { id: 'storage', label: 'MinIO S3 Storage', icon: HardDrive, color: 'text-amber-500' },
            { id: 'loadbalancer', label: 'Load Balancer', icon: Split, color: 'text-purple-500' },
            { id: 'cdn', label: 'CDN Edge Network', icon: Globe, color: 'text-cyan-500' },
            { id: 'autoscaler', label: 'HPA Autoscaler', icon: ArrowUpRight, color: 'text-teal-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as ComponentTab); setTestResult(null); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-medium transition-all ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Panels */}
        <div className="flex-1 grid grid-cols-12 gap-6 overflow-hidden">
          {/* Controls Column */}
          <div className="col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 overflow-y-auto">
            {activeTab === 'cache' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Redis Cache Operations</h4>
                  <p className="text-slate-500 mt-1">
                    Test cache hit, miss, TTL expiry, and explicit key invalidation.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => runCacheTest('get', 'product:1')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between"
                  >
                    <span>Read Key (GET product:1)</span>
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                  </button>

                  <button
                    onClick={() => runCacheTest('set', 'product:1', JSON.stringify({ id: 1, name: 'Cloud Router X9', price: 1299.99 }))}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between"
                  >
                    <span>Write Key (SET product:1, TTL: 30s)</span>
                    <Play className="w-3.5 h-3.5 text-emerald-500" />
                  </button>

                  <button
                    onClick={() => runCacheTest('invalidate', 'product:1')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between"
                  >
                    <span>Invalidate Key (DEL product:1)</span>
                    <Trash2 className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    onClick={() => runCacheTest('flush')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 font-medium text-left flex items-center justify-between"
                  >
                    <span>Flush All Keys (FLUSHALL)</span>
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">PostgreSQL Operations</h4>
                  <p className="text-slate-500 mt-1">
                    Execute real parameterized SQL queries, check connection pool utilization, and reset seed data.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => runDatabaseTest('read', 1)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Execute SELECT WHERE id = 1</span>
                    <Play className="w-3.5 h-3.5 text-blue-500" />
                  </button>

                  <button
                    onClick={() => runDatabaseTest('write', 0, {
                      name: `Rack Server R7-${Math.floor(Math.random() * 900)}`,
                      description: 'Inserted via Database Test console',
                      price: 3499.00,
                      stock: 14,
                      category: 'Enterprise',
                    })}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Execute INSERT INTO products</span>
                    <Play className="w-3.5 h-3.5 text-blue-500" />
                  </button>

                  <button
                    onClick={() => runDatabaseTest('reset')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 hover:bg-amber-100 font-medium text-left flex items-center justify-between"
                  >
                    <span>Reset Database Seed Data</span>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">MinIO S3 Storage Operations</h4>
                  <p className="text-slate-500 mt-1">
                    List objects, read JSON documents, and upload test payloads to S3 bucket.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => runStorageTest('list')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>List S3 Bucket Objects</span>
                    <Play className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    onClick={() => runStorageTest('read', 'architecture-spec.json')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Fetch 'architecture-spec.json'</span>
                    <Play className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    onClick={() => runStorageTest('write', `log-${Date.now()}.json`, {
                      event: 'Diagnostics snapshot',
                      timestamp: new Date().toISOString(),
                      status: 'OK',
                    })}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Put S3 JSON Object</span>
                    <Play className="w-3.5 h-3.5 text-amber-500" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'loadbalancer' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Load Balancer Distribution Test</h4>
                  <p className="text-slate-500 mt-1">
                    Send a test batch of 20 requests and observe how the selected algorithm distributes traffic.
                  </p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                      Active Algorithm
                    </label>
                    <select
                      value={config?.loadBalancer.algorithm || 'round-robin'}
                      onChange={(e) => updateConfig({ loadBalancer: { algorithm: e.target.value } })}
                      className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="round-robin">Round Robin</option>
                      <option value="least-connections">Least Connections</option>
                      <option value="random">Random</option>
                    </select>
                  </div>

                  <button
                    onClick={() => runLbDistributionTest(25)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Send 25 Test Requests & Check Distribution</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'cdn' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">CDN Edge Simulation</h4>
                  <p className="text-slate-500 mt-1">
                    Verify CDN edge cache hits vs misses and edge cache purge actions.
                  </p>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => runCdnTest('evaluate', '/api/products/1')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Simulate Edge Request (/api/products/1)</span>
                    <Play className="w-3.5 h-3.5 text-cyan-500" />
                  </button>

                  <button
                    onClick={() => runCdnTest('purge', '/api/products/1')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-medium text-left flex items-center justify-between"
                  >
                    <span>Purge Edge Route Cache</span>
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'autoscaler' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Kubernetes HPA Testing</h4>
                  <p className="text-slate-500 mt-1">
                    Simulate sudden aggregate CPU utilization spikes and witness autoscaler reaction.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => runAutoscalerSpike(88)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium flex items-center justify-center gap-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Simulate 88% CPU Spike (Triggers Scale-Up)</span>
                  </button>

                  <button
                    onClick={() => runAutoscalerSpike(20)}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-medium flex items-center justify-center gap-2"
                  >
                    <span>Simulate 20% CPU Idle (Triggers Scale-Down)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Column */}
          <div className="col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col overflow-hidden">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-xs mb-3 flex items-center justify-between">
              <span>Test Execution Output</span>
              {loading && <span className="text-emerald-500 animate-pulse font-mono text-[11px]">Executing...</span>}
            </h4>

            <div className="flex-1 bg-slate-950 text-slate-100 rounded-xl p-4 overflow-y-auto font-mono text-xs">
              {testResult ? (
                <pre className="leading-relaxed">{JSON.stringify(testResult, null, 2)}</pre>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 font-sans">
                  Choose an operation on the left to run an isolated component test.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
