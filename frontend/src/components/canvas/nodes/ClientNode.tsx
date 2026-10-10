import React from 'react';
import { Monitor } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const ClientNode: React.FC = () => {
  const { loadTestStatus } = useSystem();
  const isRunning = loadTestStatus?.isRunning;

  return (
    <BaseNode
      id="client"
      title="Client / Frontend"
      subtitle="HTTP/2 Browser"
      icon={Monitor}
      iconColor="bg-sky-500 text-sky-600 dark:text-sky-400"
      status={isRunning ? 'active' : 'idle'}
      targetHandle={false}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Active Users', value: isRunning ? `${loadTestStatus.activeWorkers} VU` : 'Idle' },
        { label: 'Live RPS', value: `${loadTestStatus?.currentRps || 0} req/s` },
      ]}
    />
  );
};
