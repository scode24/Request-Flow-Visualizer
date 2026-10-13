import React from 'react';
import { Zap } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const CacheNode: React.FC<{ data?: any }> = ({ data }) => {
  const { cacheMetrics, config } = useSystem();
  const enabled = config?.redis?.enabled ?? cacheMetrics?.enabled ?? (data?.enabled !== undefined ? data.enabled : true);
  const hitRatio = cacheMetrics?.hitRatioPercent ?? (data?.hitRatioPercent || 0);

  return (
    <BaseNode
      id="cache"
      title="Redis Cache"
      subtitle="In-Memory Key/Value"
      icon={Zap}
      iconColor="bg-red-500 text-red-600 dark:text-red-400"
      status={!enabled ? 'bypassed' : 'healthy'}
      loadPercent={enabled ? Math.min(100, Math.max(5, (cacheMetrics?.keysCount || 4) * 8)) : 0}
      loadLabel="Memory Usage"
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Cache State', value: enabled ? 'Active' : 'Bypassed' },
        { label: 'Hit Ratio', value: enabled ? `${hitRatio}%` : 'Disabled' },
      ]}
    />
  );
};
