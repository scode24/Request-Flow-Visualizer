import React from 'react';
import { Cpu } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const WorkerNode: React.FC<{ data: { workerId: string; index: number; name?: string } }> = ({ data }) => {
  const { queueMetrics } = useSystem();

  const worker = queueMetrics?.workers?.find((w) => w.id === data.workerId);
  const name = worker?.name || data.name || `Async Worker #${data.index}`;
  const status = worker?.status || 'idle';
  const cpu = worker?.cpuPercent ?? 12;
  const processed = worker?.processedCount ?? 0;
  const latency = worker?.avgLatencyMs ?? 25;

  return (
    <BaseNode
      id={data.workerId}
      title={name}
      subtitle="Event Consumer"
      icon={Cpu}
      iconColor="bg-teal-500 text-teal-600 dark:text-teal-400"
      status={status === 'processing' ? 'active' : status === 'degraded' ? 'degraded' : 'healthy'}
      loadPercent={cpu}
      loadLabel="Worker CPU"
      badgeText={status === 'processing' ? 'CONSUMING' : 'IDLE WAIT'}
      badgeVariant={status === 'processing' ? 'success' : 'default'}
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Completed', value: `${processed} jobs` },
        { label: 'Avg Exec', value: `${latency} ms` },
      ]}
    />
  );
};
