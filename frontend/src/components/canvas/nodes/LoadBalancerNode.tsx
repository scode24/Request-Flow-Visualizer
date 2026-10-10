import React from 'react';
import { Split } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const LoadBalancerNode: React.FC = () => {
  const { loadBalancerMetrics } = useSystem();
  const algo = loadBalancerMetrics?.algorithm === 'least-connections' ? 'Least Conn' : 'Round Robin';

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
        { label: 'LB Replicas', value: `${loadBalancerMetrics?.replicas || 1} Pod(s)` },
        { label: 'Active Conns', value: loadBalancerMetrics?.activeConnections || 0 },
      ]}
    />
  );
};
