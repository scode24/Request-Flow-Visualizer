import React from 'react';
import { Zap } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const CacheNode: React.FC = () => {
  const { cacheMetrics } = useSystem();
  const enabled = cacheMetrics?.enabled ?? true;

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
        { label: 'Hit Ratio', value: `${cacheMetrics?.hitRatioPercent || 0}%` },
        { label: 'Hits / Misses', value: `${cacheMetrics?.totalHits || 0} / ${cacheMetrics?.totalMisses || 0}` },
      ]}
    />
  );
};
