import React from 'react';
import { Monitor } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const ClientNode: React.FC<{ data?: any }> = ({ data }) => {
  const { loadTestStatus } = useSystem();
  const isRunning = loadTestStatus?.isRunning ?? (data?.isRunning || false);
  const activeWorkers = loadTestStatus?.activeWorkers ?? (data?.activeWorkers || 0);
  const currentRps = loadTestStatus?.currentRps ?? (data?.currentRps || 0);

  return (
    <BaseNode
      id="client"
      title="Client / User"
      subtitle="HTTP/2 Browser"
      icon={Monitor}
      iconColor="bg-sky-500 text-sky-600 dark:text-sky-400"
      status={isRunning ? 'active' : 'idle'}
      badgeText={isRunning ? `${activeWorkers} VU LOAD` : 'IDLE TRAFFIC'}
      badgeVariant={isRunning ? 'success' : 'default'}
      targetHandle={false}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Virtual Users', value: isRunning ? `${activeWorkers} VU` : '0 VU' },
        { label: 'Live RPS', value: `${currentRps} req/s` },
      ]}
    />
  );
};
