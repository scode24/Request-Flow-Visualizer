import React from 'react';
import { Split } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const LoadBalancerNode: React.FC<{ data?: any }> = ({ data }) => {
  const { loadBalancerMetrics, config } = useSystem();
  const rawAlgo = data?.algorithm || config?.loadBalancer.algorithm || loadBalancerMetrics?.algorithm || 'round-robin';
  const algo = rawAlgo === 'least-connections' ? 'Least Conn' : rawAlgo === 'random' ? 'Random' : 'Round Robin';
  const replicasCount = data?.replicas || config?.loadBalancer.replicas || loadBalancerMetrics?.replicas || 1;
  const activeConns = data?.activeConnections ?? (loadBalancerMetrics?.activeConnections || 0);

  return (
    <BaseNode
      id="loadbalancer"
      title="Load Balancer"
      subtitle={`NGINX (${algo})`}
      icon={Split}
      iconColor="bg-blue-500 text-blue-600 dark:text-blue-400"
      status="healthy"
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'LB Replicas', value: `${replicasCount} Pod(s)` },
        { label: 'Active Conns', value: activeConns },
      ]}
    />
  );
};
