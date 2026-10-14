import React from 'react';
import { Zap, Network } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

interface CacheNodeProps {
  data?: {
    nodeId?: string;
    name?: string;
    index?: number;
    hashRingSlot?: string;
  };
}

export const CacheNode: React.FC<CacheNodeProps> = ({ data }) => {
  const { cacheMetrics, config } = useSystem();
  const enabled = config?.redis?.enabled ?? cacheMetrics?.enabled ?? true;
  const isCluster = config?.redis?.clusterMode === 'cluster' || cacheMetrics?.clusterMode === 'cluster';

  const nodeId = data?.nodeId || 'cache-node-1';
  const nodeMetric = cacheMetrics?.nodes?.find((n) => n.id === nodeId);

  const title =
    nodeMetric?.name ||
    data?.name ||
    (isCluster ? `Redis Node #${data?.index || 1}` : 'Redis Cache');

  const subtitle = isCluster
    ? nodeMetric?.hashRingSlot || data?.hashRingSlot || 'Consistent Ring Arc'
    : 'In-Memory Key/Value';

  const cpuPercent =
    nodeMetric?.cpuPercent ??
    (enabled ? Math.min(100, Math.max(8, (cacheMetrics?.keysCount || 4) * 7)) : 0);

  const keysCount = nodeMetric?.keysCount ?? cacheMetrics?.keysCount ?? 0;
  const hits = nodeMetric?.hits ?? cacheMetrics?.totalHits ?? 0;
  const misses = nodeMetric?.misses ?? cacheMetrics?.totalMisses ?? 0;

  return (
    <BaseNode
      id={nodeId}
      title={title}
      subtitle={subtitle}
      icon={isCluster ? Network : Zap}
      iconColor="bg-red-500 text-red-600 dark:text-red-400"
      status={!enabled ? 'bypassed' : cpuPercent > 80 ? 'degraded' : 'healthy'}
      loadPercent={enabled ? cpuPercent : 0}
      loadLabel={isCluster ? 'Node Load' : 'Memory'}
      badgeText={!enabled ? 'DISABLED' : isCluster ? 'HASH RING' : 'STANDALONE'}
      badgeVariant={!enabled ? 'default' : isCluster ? 'warning' : 'danger'}
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Cached Keys', value: enabled ? keysCount : 'Disabled' },
        { label: 'Hits / Miss', value: enabled ? `${hits} / ${misses}` : '0 / 0' },
      ]}
    />
  );
};
