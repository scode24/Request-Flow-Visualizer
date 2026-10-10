import React from 'react';
import { Monitor } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const ClientNode: React.FC<{ data?: any }> = ({ data }) => {
  const { loadTestStatus } = useSystem();
  const isRunning = data?.isRunning ?? loadTestStatus?.isRunning;
  const activeWorkers = data?.activeWorkers ?? (loadTestStatus?.activeWorkers || 0);
  const currentRps = data?.currentRps ?? (loadTestStatus?.currentRps || 0);

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
        { label: 'Active Users', value: isRunning ? `${activeWorkers} VU` : 'Idle' },
        { label: 'Live RPS', value: `${currentRps} req/s` },
      ]}
    />
  );
};
