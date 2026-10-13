import React, { useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import { ClientNode } from './nodes/ClientNode';
import { CdnNode } from './nodes/CdnNode';
import { GatewayNode } from './nodes/GatewayNode';
import { LoadBalancerNode } from './nodes/LoadBalancerNode';
import { BackendNode } from './nodes/BackendNode';
import { CacheNode } from './nodes/CacheNode';
import { DatabaseNode } from './nodes/DatabaseNode';
import { StorageNode } from './nodes/StorageNode';
import { AutoscalerNode } from './nodes/AutoscalerNode';
import { AnimatedEdge } from './edges/AnimatedEdge';
import { useSystem } from '../../context/SystemContext';
import { useTheme } from '../../context/ThemeContext';
import { RotateCcw, Sliders } from 'lucide-react';

const nodeTypes = {
  client: ClientNode,
  cdn: CdnNode,
  gateway: GatewayNode,
  loadbalancer: LoadBalancerNode,
  backend: BackendNode,
  cache: CacheNode,
  database: DatabaseNode,
  storage: StorageNode,
  autoscaler: AutoscalerNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

export const ArchitectureCanvas: React.FC = () => {
  const {
    config,
    loadBalancerMetrics,
    autoscalerMetrics,
  } = useSystem();
  const { theme } = useTheme();

  // Resolve active replica count: live instances reported by load balancer takes priority,
  // falling back to autoscaler metrics, config, or default 3.
  const replicaCount =
    loadBalancerMetrics?.instances?.length ||
    autoscalerMetrics?.currentReplicas ||
    config?.backend?.activeReplicas ||
    3;
  const cdnEnabled = config?.cdn?.enabled ?? true;
  const redisEnabled = config?.redis?.enabled ?? true;
  const autoscalingEnabled = config?.backend?.autoscalingEnabled ?? false;
  const lbAlgorithm = config?.loadBalancer?.algorithm ?? 'round-robin';
  const lbReplicas = config?.loadBalancer?.replicas ?? 1;

  // Stable replica instances metadata list based only on replicaCount
  const replicaList = useMemo(() => {
    return Array.from({ length: replicaCount }, (_, i) => ({
      id: `backend-instance-${i + 1}`,
      name: `Backend Pod #${i + 1}`,
      index: i + 1,
    }));
  }, [replicaCount]);

  // Build reactive graph representation - ONLY recomputed when structural topology changes
  const graphData = useMemo(() => {
    // 1. Build Nodes
    const nodes: Node[] = [
      {
        id: 'client',
        type: 'client',
        position: { x: 50, y: 240 },
        data: {},
      },
      {
        id: 'cdn',
        type: 'cdn',
        // In CDN bypass mode, shift CDN up slightly so direct bypass line is visually prominent
        position: cdnEnabled ? { x: 290, y: 240 } : { x: 290, y: 110 },
        data: {
          enabled: cdnEnabled,
        },
      },
      {
        id: 'gateway',
        type: 'gateway',
        position: { x: 530, y: 240 },
        data: {
          rateLimit: 1000,
        },
      },
      {
        id: 'loadbalancer',
        type: 'loadbalancer',
        position: { x: 770, y: 240 },
        data: {
          algorithm: lbAlgorithm,
          replicas: lbReplicas,
        },
      },
    ];

    // Position backend replicas vertically centered around y = 240
    // Keep startY at least 120 so Autoscaler at y = 20 has clean vertical clearance
    const startY =
      replicaCount <= 3
        ? 240 - ((replicaCount - 1) * 110) / 2
        : Math.max(120, 240 - ((replicaCount - 1) * 100) / 2);

    replicaList.forEach((rep, idx) => {
      nodes.push({
        id: rep.id,
        type: 'backend',
        position: { x: 1040, y: startY + idx * (replicaCount > 4 ? 98 : 110) },
        data: {
          instanceId: rep.id,
          index: rep.index,
          name: rep.name,
        },
      });
    });

    // Autoscaler node cleanly positioned above backend cluster
    nodes.push({
      id: 'autoscaler',
      type: 'autoscaler',
      position: { x: 1040, y: 20 },
      data: {
        enabled: autoscalingEnabled,
      },
    });

    // Redis Cache Tier (Standalone vs Consistent Hashing Cluster)
    const cacheClusterMode = config?.redis?.clusterMode || 'standalone';
    const cacheNodesCount = cacheClusterMode === 'cluster' ? Math.max(2, Math.min(4, config?.redis?.nodesCount || 2)) : 1;
    const cacheStrategy = config?.redis?.hashingStrategy || 'consistent-hashing';

    const cacheNodeList: Array<{
      id: string;
      name: string;
      hashRingSlot?: string;
      index: number;
      y: number;
    }> = [];

    const cacheStartY = 40;
    for (let i = 1; i <= cacheNodesCount; i++) {
      const id = cacheNodesCount === 1 ? 'cache-node-1' : `cache-node-${i}`;
      const slot =
        cacheClusterMode === 'cluster'
          ? cacheStrategy === 'consistent-hashing'
            ? `Ring [${Math.round(((i - 1) * 360) / cacheNodesCount)}°-${Math.round((i * 360) / cacheNodesCount)}°]`
            : `Hash Modulo #${i}`
          : 'Standalone Instance';

      cacheNodeList.push({
        id,
        name: cacheNodesCount === 1 ? 'Redis Cache' : `Redis Node #${i}`,
        hashRingSlot: slot,
        index: i,
        y: cacheStartY + (i - 1) * 110,
      });
    }

    cacheNodeList.forEach((cNode) => {
      nodes.push({
        id: cNode.id,
        type: 'cache',
        position: { x: 1350, y: cNode.y },
        data: {
          nodeId: cNode.id,
          name: cNode.name,
          index: cNode.index,
          hashRingSlot: cNode.hashRingSlot,
          enabled: redisEnabled,
        },
      });
    });

    const maxCacheY = cacheNodeList.reduce((max, n) => Math.max(max, n.y), cacheStartY);
    const dbBaseY = Math.max(220, maxCacheY + 115);

    // Dynamic Database Tier (Standalone, Read-Replicas, Sharded Cluster)
    const dbMode = config?.database?.mode || 'standalone';
    const dbReplicas = config?.database?.replicasCount || 2;
    const dbShards = config?.database?.shardsCount || 2;
    const dbShardingKey = config?.database?.shardingKey || 'hash';

    const dbNodeList: Array<{
      id: string;
      name: string;
      role: 'primary' | 'replica' | 'shard';
      shardKey?: string;
      index?: number;
      y: number;
    }> = [];

    if (dbMode === 'standalone') {
      dbNodeList.push({
        id: 'database-primary',
        name: 'PostgreSQL Primary',
        role: 'primary',
        y: dbBaseY,
      });
    } else if (dbMode === 'read-replicas') {
      dbNodeList.push({
        id: 'database-primary',
        name: 'PG Leader (RW)',
        role: 'primary',
        y: dbBaseY,
      });
      for (let i = 1; i <= dbReplicas; i++) {
        dbNodeList.push({
          id: `database-replica-${i}`,
          name: `PG Read Replica #${i}`,
          role: 'replica',
          index: i,
          y: dbBaseY + i * 110,
        });
      }
    } else {
      // sharded
      for (let i = 1; i <= dbShards; i++) {
        const shardRange =
          dbShardingKey === 'hash'
            ? `Hash [${Math.round(((i - 1) * 100) / dbShards)}%-${Math.round((i * 100) / dbShards)}%]`
            : `ID Range [${(i - 1) * 25000}-${i * 25000}]`;
        dbNodeList.push({
          id: `database-shard-${i}`,
          name: `DB Shard #${i}`,
          role: 'shard',
          shardKey: shardRange,
          index: i,
          y: dbBaseY + (i - 1) * 110,
        });
      }
    }

    dbNodeList.forEach((dbNode) => {
      nodes.push({
        id: dbNode.id,
        type: 'database',
        position: { x: 1350, y: dbNode.y },
        data: {
          nodeId: dbNode.id,
          name: dbNode.name,
          role: dbNode.role,
          shardKey: dbNode.shardKey,
          index: dbNode.index,
        },
      });
    });

    const maxDbY = dbNodeList.reduce((max, n) => Math.max(max, n.y), dbBaseY);
    const storageY = Math.max(380, maxDbY + 115);

    nodes.push({
      id: 'storage',
      type: 'storage',
      position: { x: 1350, y: storageY },
      data: {},
    });

    // 2. Build Edges
    const edges: Edge[] = [];

    if (cdnEnabled) {
      edges.push({ id: 'e-client-cdn', source: 'client', target: 'cdn', type: 'animated' });
      edges.push({ id: 'e-cdn-gateway', source: 'cdn', target: 'gateway', type: 'animated' });
    } else {
      // Direct CDN Bypass route from Client to API Gateway
      edges.push({
        id: 'e-client-gateway',
        source: 'client',
        target: 'gateway',
        type: 'animated',
        label: 'Direct Bypass',
        labelStyle: { fill: '#10b981', fontWeight: 600, fontSize: 10 },
      });
    }

    edges.push({ id: 'e-gateway-lb', source: 'gateway', target: 'loadbalancer', type: 'animated' });

    // Load Balancer to Backend Replicas
    replicaList.forEach((rep) => {
      edges.push({
        id: `e-lb-${rep.id}`,
        source: 'loadbalancer',
        target: rep.id,
        type: 'animated',
      });

      // Backend Replicas to Redis Cache Tier
      if (redisEnabled) {
        cacheNodeList.forEach((cNode) => {
          edges.push({
            id: `e-${rep.id}-${cNode.id}`,
            source: rep.id,
            target: cNode.id,
            type: 'animated',
          });
        });
      }

      // Backend Replicas to Database Tier
      if (dbMode === 'standalone') {
        edges.push({
          id: `e-${rep.id}-database-primary`,
          source: rep.id,
          target: 'database-primary',
          type: 'animated',
        });
      } else if (dbMode === 'read-replicas') {
        // Connect to primary (writes & reads)
        edges.push({
          id: `e-${rep.id}-database-primary`,
          source: rep.id,
          target: 'database-primary',
          type: 'animated',
        });
        // Connect to each read replica (read operations)
        for (let i = 1; i <= dbReplicas; i++) {
          edges.push({
            id: `e-${rep.id}-database-replica-${i}`,
            source: rep.id,
            target: `database-replica-${i}`,
            type: 'animated',
          });
        }
      } else {
        // Sharded: connect to each shard partition
        for (let i = 1; i <= dbShards; i++) {
          edges.push({
            id: `e-${rep.id}-database-shard-${i}`,
            source: rep.id,
            target: `database-shard-${i}`,
            type: 'animated',
          });
        }
      }

      edges.push({ id: `e-${rep.id}-storage`, source: rep.id, target: 'storage', type: 'animated' });
    });

    // Replication Sync Edges between Primary Leader and Read Replicas
    if (dbMode === 'read-replicas') {
      for (let i = 1; i <= dbReplicas; i++) {
        edges.push({
          id: `e-repl-database-primary-database-replica-${i}`,
          source: 'database-primary',
          target: `database-replica-${i}`,
          type: 'animated',
          style: { strokeDasharray: '4 4', stroke: '#38bdf8' },
        });
      }
    }

    // Autoscaler control connection
    if (autoscalingEnabled && replicaList.length > 0) {
      edges.push({
        id: 'e-autoscaler-backend',
        source: 'autoscaler',
        target: replicaList[0].id,
        type: 'animated',
        style: { strokeDasharray: '4 4' },
      });
    }

    return { nodes, edges };
  }, [
    replicaCount,
    replicaList,
    cdnEnabled,
    redisEnabled,
    autoscalingEnabled,
    lbAlgorithm,
    lbReplicas,
    config?.redis?.clusterMode,
    config?.redis?.nodesCount,
    config?.redis?.hashingStrategy,
    config?.database?.mode,
    config?.database?.replicasCount,
    config?.database?.shardsCount,
    config?.database?.shardingKey,
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);
  const prevReplicaCountRef = useRef(replicaCount);
  const prevDbSigRef = useRef(`${config?.database?.mode}-${config?.database?.replicasCount}-${config?.database?.shardsCount}`);
  const prevCacheSigRef = useRef(`${config?.redis?.clusterMode}-${config?.redis?.nodesCount}-${config?.redis?.hashingStrategy}`);

  // Sync nodes & edges whenever structural topology updates while preserving measured dimensions & positions
  useEffect(() => {
    const currentDbSig = `${config?.database?.mode}-${config?.database?.replicasCount}-${config?.database?.shardsCount}`;
    const currentCacheSig = `${config?.redis?.clusterMode}-${config?.redis?.nodesCount}-${config?.redis?.hashingStrategy}`;
    const replicaCountChanged = prevReplicaCountRef.current !== replicaCount;
    const dbTopologyChanged = prevDbSigRef.current !== currentDbSig;
    const cacheTopologyChanged = prevCacheSigRef.current !== currentCacheSig;

    prevReplicaCountRef.current = replicaCount;
    prevDbSigRef.current = currentDbSig;
    prevCacheSigRef.current = currentCacheSig;

    setNodes((currentNodes) => {
      const existingMap = new Map(currentNodes.map((n) => [n.id, n]));
      return graphData.nodes.map((newNode) => {
        const existing = existingMap.get(newNode.id);
        if (!existing) {
          return newNode;
        }
        const isBackendPod = newNode.id.startsWith('backend-instance-');
        const isInfraTier =
          newNode.id.startsWith('cache-node-') ||
          newNode.id.startsWith('database-') ||
          newNode.id === 'storage';

        const shouldResetPos =
          (replicaCountChanged && isBackendPod) ||
          ((dbTopologyChanged || cacheTopologyChanged) && isInfraTier);

        return {
          ...existing,
          ...newNode,
          // Preserve measured dimensions and internal flags so React Flow never unmounts or hides nodes
          measured: existing.measured,
          width: existing.width,
          height: existing.height,
          selected: existing.selected,
          // When topology changes, reposition relevant pods/shards smoothly
          position: shouldResetPos ? newNode.position : (existing.position || newNode.position),
          data: {
            ...existing.data,
            ...newNode.data,
          },
        };
      });
    });
    setEdges(graphData.edges);
  }, [
    graphData,
    replicaCount,
    config?.redis?.clusterMode,
    config?.redis?.nodesCount,
    config?.redis?.hashingStrategy,
    config?.database?.mode,
    config?.database?.replicasCount,
    config?.database?.shardsCount,
    setNodes,
    setEdges,
  ]);

  const handleResetLayout = () => {
    setNodes((currentNodes) => {
      const existingMap = new Map(currentNodes.map((n) => [n.id, n]));
      return graphData.nodes.map((newNode) => {
        const existing = existingMap.get(newNode.id);
        return {
          ...newNode,
          measured: existing?.measured,
          width: existing?.width,
          height: existing?.height,
        };
      });
    });
    setEdges(graphData.edges);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
        onlyRenderVisibleElements={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.5}
          color={theme === 'dark' ? '#334155' : '#cbd5e1'}
        />
        <Controls showInteractive={false} position="top-right" />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          position="bottom-left"
          className="!bg-white/80 dark:!bg-slate-900/80 !border !border-slate-200 dark:!border-slate-800 !rounded-lg !overflow-hidden"
          maskColor={theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(241, 245, 249, 0.6)'}
        />
      </ReactFlow>

      {/* Floating Status & Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-emerald-500" />
          <span>Topology:</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 uppercase font-bold text-[11px]">
            {config?.infrastructureMode || 'STANDARD'}
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span className="text-slate-500 font-mono text-[11px]">
          {replicaCount} Pod{replicaCount > 1 ? 's' : ''}
          {cdnEnabled ? ' • CDN On' : ' • CDN Bypassed'}
          {autoscalingEnabled ? ' • HPA On' : ''}
        </span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <button
          onClick={handleResetLayout}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          title="Reset node positions to default"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Layout</span>
        </button>
      </div>
    </div>
  );
};
