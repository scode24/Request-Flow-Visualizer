import React from 'react';
import { Zap } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const CacheNode: React.FC<{ data?: any }> = ({ data }) => {
  const { cacheMetrics, config } = useSystem();
  const enabled = data?.enabled !== undefined ? data.enabled : (config?.redis.enabled ?? cacheMetrics?.enabled ?? true);
  const hitRatio = data?.hitRatioPercent ?? (cacheMetrics?.hitRatioPercent || 0);
  const totalHits = data?.totalHits ?? (cacheMetrics?.totalHits || 0);
  const totalMisses = data?.totalMisses ?? (cacheMetrics?.totalMisses || 0);

  return (
    <BaseNode
      id="cache"
      title="Redis Cache"
      subtitle="In-Memory Key/Value"
      icon={Zap}
      iconColor="bg-red-500 text-red-600 dark:text-red-400"
      status={!enabled ? 'bypassed' : 'healthy'}
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Cache State', value: enabled ? 'Active' : 'Bypassed' },
        { label: 'Hit Ratio', value: enabled ? `${hitRatio}%` : 'Disabled' },
      ]}
    />
  );
};
