import React from 'react';
import { Network } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const GatewayNode: React.FC = () => {
  const { loadTestStatus } = useSystem();

  return (
    <BaseNode
      id="gateway"
      title="API Gateway"
      subtitle="Kong / Ingress"
      icon={Network}
      iconColor="bg-purple-500 text-purple-600 dark:text-purple-400"
      status="healthy"
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Rate Limiter', value: '1,000 req/m' },
        { label: 'Latency', value: '~1.5 ms' },
      ]}
    />
  );
};
