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
      badgeText="S3 BUCKET"
      badgeVariant="warning"
      loadPercent={Math.min(100, Math.max(8, (((storageMetrics?.totalReads || 0) + (storageMetrics?.totalWrites || 0)) * 2) % 100))}
      loadLabel="I/O Bandwidth"
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Total Reads', value: storageMetrics?.totalReads || 0 },
        { label: 'Latency', value: `${storageMetrics?.avgLatencyMs || 12} ms` },
      ]}
    />
  );
};
