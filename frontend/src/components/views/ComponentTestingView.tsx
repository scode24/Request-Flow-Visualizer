import React, { useState, useEffect } from 'react';
import { Zap, Database, HardDrive, Split, Globe, ArrowUpRight, Play, RefreshCw, Trash2, CheckCircle2, Layers, ShieldAlert, ShoppingCart, Shuffle, Hash } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

type ComponentTab = 'cache' | 'database' | 'storage' | 'loadbalancer' | 'cdn' | 'autoscaler' | 'queue' | 'resilience';

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

  // 7. Message Queue Test
  const runQueueTest = async (
    op: 'publish' | 'burst' | 'poison' | 'clear' | 'order-saga' | 'partition-hash',
    extra?: { customerId?: string; partitionKey?: string; count?: number }
  ) => {
    setLoading(true);
    try {
      let endpoint = '/api/test/queue/publish';
      let body: any = { payload: { event: 'order.created', amount: 149.99, timestamp: Date.now() } };
      if (op === 'burst') {
        endpoint = '/api/test/queue/burst';
        body = { count: extra?.count || 20 };
      } else if (op === 'poison') {
        endpoint = '/api/test/queue/poison-pill';
        body = {};
      } else if (op === 'clear') {
        endpoint = '/api/test/queue/clear';
        body = {};
      } else if (op === 'order-saga') {
        endpoint = '/api/test/queue/order-saga';
        body = {
          customerId: extra?.customerId || `CUST-${Math.floor(Math.random() * 8999) + 1000}`,
          amount: 249.50,
          items: ['Cloud Microservice Pack', 'Kafka Partition Cluster Access'],
        };
      } else if (op === 'partition-hash') {
        endpoint = '/api/test/queue/publish';
        body = {
          partitionKey: extra?.partitionKey || 'user-vip-88',
          payload: {
            event: 'order.payment_settled',
            user: extra?.partitionKey || 'user-vip-88',
            amount: 189.0,
            timestamp: Date.now(),
          },
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 8. Resilience Test
  const runResilienceTest = async (op: 'trip' | 'reset' | 'exhaust' | 'refill') => {
    setLoading(true);
    try {
      let endpoint = '/api/test/resilience/trip-cb';
      if (op === 'reset') endpoint = '/api/test/resilience/reset-cb';
      if (op === 'exhaust') endpoint = '/api/test/resilience/exhaust-tokens';
      if (op === 'refill') endpoint = '/api/test/resilience/refill-tokens';

      const res = await fetch(endpoint, { method: 'POST' });
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
            { id: 'queue', label: 'Message Queue (Kafka)', icon: Layers, color: 'text-amber-500' },
            { id: 'resilience', label: 'Resilience & Circuit Breaker', icon: ShieldAlert, color: 'text-rose-500' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as ComponentTab); setTestResult(null); }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium transition-all text-[11px] whitespace-nowrap ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
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

            {activeTab === 'queue' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Kafka Message Queue & Event Streaming</h4>
                  <p className="text-slate-500 mt-1">
                    Simulate asynchronous event streaming, distributed order sagas, partition key hashing, and Dead Letter Queue (DLQ).
                  </p>
                </div>

                <div className="space-y-2.5">
                  {/* Distributed Saga */}
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-amber-500" />
                        <span>E-Commerce Distributed Saga</span>
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">End-to-End</span>
                    </div>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/70">
                      Dispatches order through Gateway → LB → Backend → Kafka Topic Partition → Worker → DB Transaction.
                    </p>
                    <button
                      onClick={() => runQueueTest('order-saga')}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center justify-between shadow-sm transition-all"
                    >
                      <span>Execute Order Saga (Kafka Async)</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </button>
                  </div>

                  {/* Partition Hashing */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-blue-500" />
                      <span>Consistent Partition Key Hashing</span>
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Messages with identical keys deterministically hash to the same Kafka partition to preserve ordering.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['user-vip-101', 'user-vip-88', 'tenant-eu-west'].map((k) => (
                        <button
                          key={k}
                          onClick={() => runQueueTest('partition-hash', { partitionKey: k })}
                          disabled={loading}
                          className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-blue-400 font-mono text-[10px] truncate text-center transition-all text-slate-700 dark:text-slate-300"
                          title={`Hash key: ${k}`}
                        >
                          {k}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Standard Operations */}
                  <button
                    onClick={() => runQueueTest('publish')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between"
                  >
                    <span>Publish Single Event (order.created)</span>
                    <Play className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    onClick={() => runQueueTest('burst')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between"
                  >
                    <span>Simulate 20-Message Burst (Builds Consumer Lag)</span>
                    <Layers className="w-3.5 h-3.5 text-amber-500" />
                  </button>

                  <button
                    onClick={() => runQueueTest('poison')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-medium text-left flex items-center justify-between"
                  >
                    <span>Inject Poison Pill (Routes to Dead Letter Queue)</span>
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200">DLQ</span>
                  </button>

                  <button
                    onClick={() => runQueueTest('clear')}
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium text-left flex items-center justify-between text-slate-500"
                  >
                    <span>Purge Queue & Reset Workers</span>
                    <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'resilience' && (
              <div className="space-y-4 text-xs">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Resilience: Rate Limiting & Circuit Breaker</h4>
                  <p className="text-slate-500 mt-1">
                    Test fail-fast circuit breaker tripping and API Gateway token bucket exhaustion.
                  </p>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">Circuit Breaker Controls</span>
                    <button
                      onClick={() => runResilienceTest('trip')}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium flex items-center justify-between"
                    >
                      <span>Trip Circuit Breaker to OPEN (Fail Fast)</span>
                      <ShieldAlert className="w-3.5 h-3.5 text-white" />
                    </button>
                    <button
                      onClick={() => runResilienceTest('reset')}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-between"
                    >
                      <span>Reset Circuit Breaker to CLOSED</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block">Rate Limiter (Token Bucket)</span>
                    <button
                      onClick={() => runResilienceTest('exhaust')}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium flex items-center justify-between"
                    >
                      <span>Exhaust Tokens to 0 (Trigger HTTP 429)</span>
                      <span className="text-[10px] font-mono font-bold">429 DROP</span>
                    </button>
                    <button
                      onClick={() => runResilienceTest('refill')}
                      disabled={loading}
                      className="w-full py-2 px-3 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-medium flex items-center justify-between"
                    >
                      <span>Refill Token Bucket (100% Capacity)</span>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
