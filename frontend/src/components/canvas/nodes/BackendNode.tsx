import React from 'react';
import { Server } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const BackendNode: React.FC<{ data: { instanceId: string; index: number; name?: string; instance?: any; cpu?: number; connections?: number; status?: any } }> = ({ data }) => {
  const { loadBalancerMetrics } = useSystem();
  const inst = loadBalancerMetrics?.instances?.find((i) => i.id === data.instanceId) || data.instance;

  const cpu = inst?.cpuPercent ?? (data.cpu || 15);
  const conns = inst?.activeConnections ?? (data.connections || 0);
  const status = inst?.status || (cpu > 85 ? 'degraded' : conns > 0 ? 'active' : 'healthy');

  return (
    <BaseNode
      id={data.instanceId}
      title={data.name || `Backend Pod #${data.index}`}
      subtitle="Node.js Express"
      icon={Server}
      iconColor="bg-emerald-500 text-emerald-600 dark:text-emerald-400"
      status={status}
      loadPercent={cpu}
      loadLabel="Pod CPU"
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'CPU Usage', value: `${cpu}%` },
        { label: 'Active Conns', value: conns },
      ]}
    />
  );
};
