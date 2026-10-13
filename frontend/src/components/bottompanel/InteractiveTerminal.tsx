import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, Trash2, HelpCircle, Activity, Server, Database } from 'lucide-react';
import { useSystem } from '../../context/SystemContext';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  text: string;
  timestamp: string;
}

export const InteractiveTerminal: React.FC = () => {
  const {
    config,
    updateConfig,
    loadTestStatus,
    startLoadTest,
    stopLoadTest,
    loadBalancerMetrics,
    databaseMetrics,
    cacheMetrics,
    cdnMetrics,
  } = useSystem();

  const [input, setInput] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'init-1',
      type: 'info',
      text: '⚡ Request Flow Visualizer Interactive Mesh Terminal v2.4.0',
      timestamp: new Date().toLocaleTimeString(),
    },
    {
      id: 'init-2',
      type: 'info',
      text: "Connected to cluster: 'mesh-east-1'. Type 'help' for commands or click chips below.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const addLine = (type: TerminalLine['type'], text: string) => {
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        type,
        text,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    // Save into history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Print command input line
    addLine('input', `$ ${trimmed}`);

    const parts = trimmed.split(' ').filter(Boolean);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'clear':
      case 'cls': {
        setLines([]);
        break;
      }

      case 'help': {
        addLine(
          'output',
          `Available Cluster CLI Commands:
  • help                                    - Show this help manual
  • top / ps                                - Real-time process & service loads table
  • status                                  - Overview of cluster infrastructure & nodes
  • scale backend <1-8>                     - Scale backend Express pods count
  • scale db <1-4>                          - Configure DB with 1 Leader + N Read Replicas
  • shard db <2-4> [hash|range]             - Shard DB across N partitions
  • db standalone                           - Revert database to standalone primary
  • curl <path>                             - Execute HTTP request to backend (e.g. curl /api/products)
  • load <profile> [users] [sec]            - Run load test (e.g. load spike 40 20)
  • stop                                    - Abort running load test
  • cache <enable|disable>                  - Toggle Redis caching layer
  • cdn <enable|disable>                    - Toggle Edge CDN caching layer
  • algo <round-robin|least-connections>    - Switch NGINX load balancer algorithm
  • clear                                   - Clear terminal buffer`
        );
        break;
      }

      case 'top':
      case 'ps':
      case 'htop': {
        const pods = loadBalancerMetrics?.instances || [];
        const dbNodes = databaseMetrics?.nodes || [];

        let out = 'CLUSTER PROCESS TOPOLOGY:\n';
        out += 'ROLE          ID                   CPU%   CONNS   QUERIES/REQS   STATUS\n';
        out += '-----------------------------------------------------------------------\n';
        pods.forEach((p) => {
          const role = 'BackendPod   ';
          const id = (p.id + '                   ').slice(0, 21);
          const cpu = ((p.cpuPercent || 15) + '%     ').slice(0, 7);
          const conns = ((p.activeConnections || 0) + '      ').slice(0, 8);
          const reqs = ((p.totalRequests || 0) + '               ').slice(0, 15);
          out += `${role} ${id} ${cpu} ${conns} ${reqs} ${p.status}\n`;
        });

        dbNodes.forEach((d) => {
          const role = (d.role.toUpperCase() + '         ').slice(0, 13);
          const id = (d.id + '                   ').slice(0, 21);
          const cpu = ((d.cpuPercent || 10) + '%     ').slice(0, 7);
          const conns = ((d.activeConnections || 1) + '      ').slice(0, 8);
          const q = ((d.totalQueries || 0) + '               ').slice(0, 15);
          out += `${role} ${id} ${cpu} ${conns} ${q} ${d.status}\n`;
        });
        addLine('output', out);
        break;
      }

      case 'status': {
        const dbMode = databaseMetrics?.mode || config?.database?.mode || 'standalone';
        const podsCount = loadBalancerMetrics?.instances?.length || 1;
        const out = `SYSTEM INFRASTRUCTURE REPORT:
  Infrastructure Mode : ${config?.infrastructureMode || 'standard'}
  Edge CDN            : ${config?.cdn?.enabled ? 'ENABLED (95%+ Edge Hit)' : 'DISABLED (Direct Bypass)'}
  Load Balancer       : NGINX (${config?.loadBalancer?.algorithm || 'round-robin'})
  Backend Pods        : ${podsCount} active Express replica(s)
  Redis Cache         : ${config?.redis?.enabled ? `ONLINE (${cacheMetrics?.hitRatioPercent || 0}% hit rate)` : 'BYPASSED'}
  Database Tier       : PostgreSQL [Mode: ${dbMode.toUpperCase()}]
  Database Nodes      : ${databaseMetrics?.nodes?.length || 1} node(s) configured
  MinIO S3 Storage    : CONNECTED (Bucket: system-assets)
  Active Traffic Test : ${loadTestStatus?.isRunning ? `RUNNING (${loadTestStatus.currentRps} RPS)` : 'IDLE'}`;
        addLine('info', out);
        break;
      }

      case 'scale': {
        if (args[0] === 'backend' && args[1]) {
          const count = parseInt(args[1], 10);
          if (isNaN(count) || count < 1 || count > 8) {
            addLine('error', 'Error: Backend replicas must be an integer between 1 and 8.');
            return;
          }
          await updateConfig({ backend: { activeReplicas: count } });
          addLine('success', `[K8S] Scaled deployment 'backend-service' to ${count} replica pods.`);
        } else if (args[0] === 'db' && args[1]) {
          const count = parseInt(args[1], 10);
          if (isNaN(count) || count < 1 || count > 4) {
            addLine('error', 'Error: Database replicas must be an integer between 1 and 4.');
            return;
          }
          await updateConfig({
            database: {
              mode: 'read-replicas',
              replicasCount: count,
            },
          });
          addLine(
            'success',
            `[DB-ENGINE] Database scaled to Primary Leader + ${count} Read Replicas with streaming replication.`
          );
        } else if (args[0] === 'cache' && args[1]) {
          const count = parseInt(args[1], 10);
          if (isNaN(count) || count < 1 || count > 4) {
            addLine('error', 'Error: Cache nodes count must be between 1 and 4.');
            return;
          }
          const strategy = args[2] === 'modulo' ? 'modulo' : 'consistent-hashing';
          const mode = count === 1 ? 'standalone' : 'cluster';
          await updateConfig({
            redis: {
              clusterMode: mode,
              nodesCount: count,
              hashingStrategy: strategy,
            },
          });
          addLine(
            'success',
            `[CACHE] Scaled Redis to ${count} ${mode} node(s) using '${strategy}' distribution.`
          );
        } else {
          addLine('error', "Usage: 'scale backend <1-8>', 'scale db <1-4>', or 'scale cache <1-4> [consistent|modulo]'");
        }
        break;
      }

      case 'shard': {
        if (args[0] === 'db' && args[1]) {
          const count = parseInt(args[1], 10);
          const keyType = args[2] === 'range' ? 'range' : 'hash';
          if (isNaN(count) || count < 2 || count > 4) {
            addLine('error', 'Error: Shards count must be between 2 and 4.');
            return;
          }
          await updateConfig({
            database: {
              mode: 'sharded',
              shardsCount: count,
              shardingKey: keyType,
            },
          });
          addLine(
            'success',
            `[DB-ENGINE] Sharded PostgreSQL cluster configured with ${count} partitions using '${keyType}' key routing.`
          );
        } else {
          addLine('error', "Usage: 'shard db <2-4> [hash|range]'");
        }
        break;
      }

      case 'db': {
        if (args[0] === 'standalone') {
          await updateConfig({
            database: {
              mode: 'standalone',
            },
          });
          addLine('success', '[DB-ENGINE] Database reconfigured to Standalone Single Primary instance.');
        } else {
          addLine('error', "Usage: 'db standalone' or 'scale db <n>' or 'shard db <n>'");
        }
        break;
      }

      case 'curl': {
        const path = args[0] || '/api/products';
        const targetUrl = path.startsWith('/') ? path : `/${path}`;
        addLine('info', `Connecting to mesh proxy: GET ${targetUrl}...`);
        try {
          const startTime = performance.now();
          const res = await fetch(targetUrl);
          const duration = Math.round(performance.now() - startTime);
          const data = await res.json();
          const formatted = JSON.stringify(data, null, 2).slice(0, 600);
          addLine(
            'success',
            `HTTP/1.1 ${res.status} ${res.statusText} (${duration}ms)\nContent-Type: application/json\n\n${formatted}${
              formatted.length >= 600 ? '\n...[truncated]' : ''
            }`
          );
        } catch (e: any) {
          addLine('error', `Failed to execute request: ${e?.message || e}`);
        }
        break;
      }

      case 'load': {
        const profile = (args[0] || 'get_product_cached') as any;
        const users = parseInt(args[1] || '20', 10);
        const duration = parseInt(args[2] || '30', 10);
        addLine('info', `[LOADGEN] Launching scenario '${profile}' with ${users} concurrent virtual users for ${duration}s...`);
        try {
          await startLoadTest({
            scenario: profile,
            concurrentUsers: users,
            durationSeconds: duration,
          });
          addLine('success', '[LOADGEN] Traffic generation started. Watch the topology canvas and Load Matrix HUD.');
        } catch (e: any) {
          addLine('error', `Failed to start load test: ${e?.message || e}`);
        }
        break;
      }

      case 'stop': {
        await stopLoadTest();
        addLine('info', '[LOADGEN] Traffic generation terminated.');
        break;
      }

      case 'cache': {
        const toggle = args[0]?.toLowerCase();
        if (toggle === 'enable' || toggle === 'on' || toggle === '1') {
          await updateConfig({ redis: { enabled: true } });
          addLine('success', '[CACHE] Redis caching enabled.');
        } else if (toggle === 'disable' || toggle === 'off' || toggle === '0') {
          await updateConfig({ redis: { enabled: false } });
          addLine('info', '[CACHE] Redis caching bypassed (direct queries to DB).');
        } else {
          addLine('error', "Usage: 'cache enable' or 'cache disable'");
        }
        break;
      }

      case 'cdn': {
        const toggle = args[0]?.toLowerCase();
        if (toggle === 'enable' || toggle === 'on' || toggle === '1') {
          await updateConfig({ cdn: { enabled: true } });
          addLine('success', '[CDN] Edge CDN acceleration enabled.');
        } else if (toggle === 'disable' || toggle === 'off' || toggle === '0') {
          await updateConfig({ cdn: { enabled: false } });
          addLine('info', '[CDN] Edge CDN bypassed (Direct traffic to API Gateway).');
        } else {
          addLine('error', "Usage: 'cdn enable' or 'cdn disable'");
        }
        break;
      }

      case 'algo': {
        const algo = args[0]?.toLowerCase();
        if (['round-robin', 'least-connections', 'random'].includes(algo)) {
          await updateConfig({ loadBalancer: { algorithm: algo } });
          addLine('success', `[NGINX] Load balancing algorithm updated to '${algo}'.`);
        } else {
          addLine('error', "Usage: 'algo <round-robin|least-connections|random>'");
        }
        break;
      }

      default: {
        addLine(
          'error',
          `Unknown command: '${command}'. Type 'help' to see list of valid commands.`
        );
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (history.length > 0 && historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setInput('');
        } else {
          setHistoryIndex(nextIdx);
          setInput(history[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-mono text-xs overflow-hidden select-text">
      {/* Quick Action Chips Bar */}
      <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mr-1 flex items-center gap-1">
          <Terminal className="w-3 h-3 text-emerald-400" />
          Quick:
        </span>
        {[
          { label: 'help', cmd: 'help' },
          { label: 'top', cmd: 'top' },
          { label: 'status', cmd: 'status' },
          { label: 'scale backend 4', cmd: 'scale backend 4' },
          { label: 'scale cache 3', cmd: 'scale cache 3 consistent' },
          { label: 'cache standalone', cmd: 'scale cache 1' },
          { label: 'scale db 3', cmd: 'scale db 3' },
          { label: 'shard db 4', cmd: 'shard db 4' },
          { label: 'db standalone', cmd: 'db standalone' },
          { label: 'curl /api/products', cmd: 'curl /api/products' },
          { label: 'load spike', cmd: 'load post_product 30 20' },
          { label: 'clear', cmd: 'clear' },
        ].map((chip) => (
          <button
            key={chip.label}
            onClick={() => executeCommand(chip.cmd)}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 transition-colors whitespace-nowrap text-[10px]"
          >
            {chip.label}
          </button>
        ))}

        <button
          onClick={() => setLines([])}
          title="Clear screen"
          className="ml-auto p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Output Log Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {lines.map((line) => (
          <div key={line.id} className="leading-relaxed whitespace-pre-wrap font-mono">
            {line.type === 'input' && (
              <span className="text-emerald-400 font-bold">{line.text}</span>
            )}
            {line.type === 'output' && (
              <span className="text-slate-300">{line.text}</span>
            )}
            {line.type === 'error' && (
              <span className="text-rose-400 font-semibold">{line.text}</span>
            )}
            {line.type === 'success' && (
              <span className="text-emerald-300 font-semibold">{line.text}</span>
            )}
            {line.type === 'info' && (
              <span className="text-sky-300">{line.text}</span>
            )}
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      {/* Interactive Command Input Prompt */}
      <div className="p-2 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <span className="text-emerald-400 font-bold text-xs select-none">
          rfv-mesh:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g. 'help', 'top', 'scale db 3', 'curl /api/products')..."
          className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-xs focus:outline-none font-mono"
          autoFocus
        />
        <button
          onClick={() => {
            executeCommand(input);
            setInput('');
          }}
          disabled={!input.trim()}
          className="p-1 px-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs flex items-center gap-1 transition-colors"
        >
          <Send className="w-3 h-3" />
          <span>Run</span>
        </button>
      </div>
    </div>
  );
};
