import React, { useMemo, useEffect } from 'react';
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
import { RotateCcw } from 'lucide-react';

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
  const { config, loadBalancerMetrics } = useSystem();
  const { theme } = useTheme();

  const replicas = loadBalancerMetrics?.instances || [
    { id: 'backend-instance-1', name: 'Backend Pod #1' },
    { id: 'backend-instance-2', name: 'Backend Pod #2' },
    { id: 'backend-instance-3', name: 'Backend Pod #3' },
  ];

  const cdnEnabled = config?.cdn.enabled ?? true;

  // Build default layout
  const buildInitialGraph = useMemo(() => {
    const nodes: Node[] = [
      { id: 'client', type: 'client', position: { x: 50, y: 220 }, data: {} },
      { id: 'cdn', type: 'cdn', position: { x: 300, y: 220 }, data: {} },
      { id: 'gateway', type: 'gateway', position: { x: 550, y: 220 }, data: {} },
      { id: 'loadbalancer', type: 'loadbalancer', position: { x: 800, y: 220 }, data: {} },
      { id: 'autoscaler', type: 'autoscaler', position: { x: 1060, y: 30 }, data: {} },
    ];

    // Position backend replicas vertically
    const startY = Math.max(120, 240 - ((replicas.length - 1) * 85) / 2);
    replicas.forEach((rep, idx) => {
      nodes.push({
        id: rep.id,
        type: 'backend',
        position: { x: 1060, y: startY + idx * 105 },
        data: { instanceId: rep.id, index: idx + 1, name: rep.name },
      });
    });

    // Infrastructure services on the right
    nodes.push({ id: 'cache', type: 'cache', position: { x: 1340, y: 110 }, data: {} });
    nodes.push({ id: 'database', type: 'database', position: { x: 1340, y: 240 }, data: {} });
    nodes.push({ id: 'storage', type: 'storage', position: { x: 1340, y: 370 }, data: {} });

    // Build Edges
    const edges: Edge[] = [];

    if (cdnEnabled) {
      edges.push({ id: 'e-client-cdn', source: 'client', target: 'cdn', type: 'animated' });
      edges.push({ id: 'e-cdn-gateway', source: 'cdn', target: 'gateway', type: 'animated' });
    } else {
      // CDN Bypassed - direct client to gateway
      edges.push({ id: 'e-client-gateway', source: 'client', target: 'gateway', type: 'animated' });
    }

    edges.push({ id: 'e-gateway-lb', source: 'gateway', target: 'loadbalancer', type: 'animated' });

    // Load Balancer to Backend Replicas
    replicas.forEach((rep) => {
      edges.push({
        id: `e-lb-${rep.id}`,
        source: 'loadbalancer',
        target: rep.id,
        type: 'animated',
      });
      // Backend Replicas to Cache, DB, and MinIO
      edges.push({ id: `e-${rep.id}-cache`, source: rep.id, target: 'cache', type: 'animated' });
      edges.push({ id: `e-${rep.id}-database`, source: rep.id, target: 'database', type: 'animated' });
      edges.push({ id: `e-${rep.id}-storage`, source: rep.id, target: 'storage', type: 'animated' });
    });

    // Autoscaler connected to backend
    if (replicas.length > 0) {
      edges.push({
        id: 'e-autoscaler-backend',
        source: 'autoscaler',
        target: replicas[0].id,
        type: 'animated',
        style: { strokeDasharray: '4 4' },
      });
    }

    return { nodes, edges };
  }, [replicas, cdnEnabled]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildInitialGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildInitialGraph.edges);

  // Sync nodes & edges when replicas or CDN status change
  useEffect(() => {
    setNodes(buildInitialGraph.nodes);
    setEdges(buildInitialGraph.edges);
  }, [buildInitialGraph, setNodes, setEdges]);

  const handleResetLayout = () => {
    setNodes(buildInitialGraph.nodes);
    setEdges(buildInitialGraph.edges);
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
        minZoom={0.3}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
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

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Architecture Canvas</span>
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
