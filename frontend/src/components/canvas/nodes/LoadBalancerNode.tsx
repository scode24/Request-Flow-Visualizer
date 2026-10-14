import React from 'react';
import { Split } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const LoadBalancerNode: React.FC<{ data?: any }> = ({ data }) => {
  const { loadBalancerMetrics, config } = useSystem();
  const rawAlgo = config?.loadBalancer?.algorithm || data?.algorithm || loadBalancerMetrics?.algorithm || 'round-robin';
  const algo = rawAlgo === 'least-connections' ? 'Least Conn' : rawAlgo === 'random' ? 'Random' : 'Round Robin';
  const replicasCount = config?.loadBalancer?.replicas || data?.replicas || loadBalancerMetrics?.replicas || 1;
  const activeConns = loadBalancerMetrics?.activeConnections ?? (data?.activeConnections || 0);

  const nodeId = data?.instanceId || 'loadbalancer';
  const title = data?.name || (data?.index ? `LB Pod #${data.index}` : 'Load Balancer');
  const isMultiPod = replicasCount > 1;
  const subtitle = isMultiPod ? (data?.index === 1 ? 'NGINX Leader Ingress' : 'NGINX Active Worker') : 'NGINX Ingress';
  const podConns = isMultiPod ? Math.floor(activeConns / replicasCount) : activeConns;

  return (
    <BaseNode
      id={nodeId}
      title={title}
      subtitle={subtitle}
      icon={Split}
      iconColor="bg-blue-500 text-blue-600 dark:text-blue-400"
      status={activeConns > 20 ? 'degraded' : 'healthy'}
      loadPercent={Math.min(100, Math.max(5, podConns * 3 + (isMultiPod ? 10 : 0)))}
      loadLabel="Ingress Traffic"
      badgeText={isMultiPod ? `POD #${data?.index || 1} • ${algo.toUpperCase()}` : algo.toUpperCase()}
      badgeVariant="info"
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Cluster', value: `${replicasCount} Pods` },
        { label: 'Active Conns', value: podConns },
      ]}
    />
  );
};
