import React from 'react';
import { Layers } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const QueueNode: React.FC<{ data?: any }> = ({ data }) => {
  const { queueMetrics } = useSystem();

  const depth = queueMetrics?.queueDepth ?? (data?.queueDepth ?? 0);
  const lag = queueMetrics?.consumerLag ?? (data?.consumerLag ?? 0);
  const throughput = queueMetrics?.throughputMsgPerSec ?? 0;
  const dlqCount = queueMetrics?.deadLetterQueueCount ?? 0;

  const status = dlqCount > 0 ? 'degraded' : depth > 10 ? 'active' : 'healthy';

  return (
    <BaseNode
      id="queue-broker"
      title="Kafka / Msg Broker"
      subtitle="Pub/Sub Topic Stream"
      icon={Layers}
      iconColor="bg-amber-500 text-amber-600 dark:text-amber-400"
      status={status}
      loadPercent={Math.min(100, depth * 4 + (dlqCount > 0 ? 30 : 5))}
      loadLabel="Queue Depth"
      badgeText={dlqCount > 0 ? `DLQ: ${dlqCount} POISON PILL` : `3 Partitions`}
      badgeVariant={dlqCount > 0 ? 'danger' : 'warning'}
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Consumer Lag', value: `${lag} msgs` },
        { label: 'Throughput', value: `${throughput} msg/s` },
      ]}
    />
  );
};
