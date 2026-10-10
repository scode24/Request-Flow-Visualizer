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
  } = useSystem();
  const { theme } = useTheme();

  // Resolve active replica count
  const replicaCount = config?.backend?.activeReplicas ?? (loadBalancerMetrics?.instances?.length || 3);
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
    const startY = replicaCount === 1 ? 240 : Math.max(80, 240 - ((replicaCount - 1) * 110) / 2);
    replicaList.forEach((rep, idx) => {
      nodes.push({
        id: rep.id,
        type: 'backend',
        position: { x: 1040, y: startY + idx * 110 },
        data: {
          instanceId: rep.id,
          index: rep.index,
          name: rep.name,
        },
      });
    });

    // Autoscaler node
    nodes.push({
      id: 'autoscaler',
      type: 'autoscaler',
      position: { x: 1040, y: Math.min(20, startY - 95) },
      data: {
        enabled: autoscalingEnabled,
      },
    });

    // Infrastructure storage tier nodes on the right
    nodes.push({
      id: 'cache',
      type: 'cache',
      position: { x: 1350, y: 110 },
      data: {
        enabled: redisEnabled,
      },
    });

    nodes.push({
      id: 'database',
      type: 'database',
      position: { x: 1350, y: 240 },
      data: {},
    });

    nodes.push({
      id: 'storage',
      type: 'storage',
      position: { x: 1350, y: 370 },
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

      // Backend Replicas to Storage Tier
      if (redisEnabled) {
        edges.push({ id: `e-${rep.id}-cache`, source: rep.id, target: 'cache', type: 'animated' });
      }
      edges.push({ id: `e-${rep.id}-database`, source: rep.id, target: 'database', type: 'animated' });
      edges.push({ id: `e-${rep.id}-storage`, source: rep.id, target: 'storage', type: 'animated' });
    });

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
  ]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphData.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphData.edges);

  // Sync nodes & edges whenever structural topology updates while preserving measured dimensions & positions
  useEffect(() => {
    setNodes((currentNodes) => {
      const existingMap = new Map(currentNodes.map((n) => [n.id, n]));
      return graphData.nodes.map((newNode) => {
        const existing = existingMap.get(newNode.id);
        if (!existing) {
          return newNode;
        }
        return {
          ...existing,
          ...newNode,
          // Preserve measured dimensions and internal flags so React Flow never unmounts or hides nodes
          measured: existing.measured,
          width: existing.width,
          height: existing.height,
          selected: existing.selected,
          position: existing.position || newNode.position,
          data: {
            ...existing.data,
            ...newNode.data,
          },
        };
      });
    });
    setEdges(graphData.edges);
  }, [graphData, setNodes, setEdges]);

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
