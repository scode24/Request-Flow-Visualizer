import React from 'react';
import { HardDrive } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const StorageNode: React.FC = () => {
  const { storageMetrics } = useSystem();

  return (
    <BaseNode
      id="storage"
      title="MinIO S3"
      subtitle="Object Storage"
      icon={HardDrive}
      iconColor="bg-amber-500 text-amber-600 dark:text-amber-400"
      status="healthy"
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Total Reads', value: storageMetrics?.totalReads || 0 },
        { label: 'Latency', value: `${storageMetrics?.avgLatencyMs || 12} ms` },
      ]}
    />
  );
};
