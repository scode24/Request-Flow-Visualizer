import React from 'react';
import { Network } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const GatewayNode: React.FC = () => {
  const { resilienceMetrics } = useSystem();
  const rl = resilienceMetrics?.rateLimiter;

  const tokens = rl ? rl.tokensAvailable : 100;
  const capacity = rl ? rl.capacity : 100;
  const isThrottling = rl ? rl.isThrottling : false;

  return (
    <BaseNode
      id="gateway"
      title="API Gateway"
      subtitle="Kong / Ingress"
      icon={Network}
      iconColor="bg-purple-500 text-purple-600 dark:text-purple-400"
      status={isThrottling ? 'degraded' : 'healthy'}
      loadPercent={Math.max(0, 100 - (tokens / capacity) * 100)}
      loadLabel="Bucket Used"
      badgeText={isThrottling ? '429 THROTTLED' : 'TOKEN BUCKET'}
      badgeVariant={isThrottling ? 'danger' : 'info'}
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Token Bucket', value: `${tokens} / ${capacity}` },
        { label: 'Throttled', value: `${rl?.totalThrottled || 0} reqs` },
      ]}
    />
  );
};
