import React from 'react';
import { Globe } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const CdnNode: React.FC<{ data?: any }> = ({ data }) => {
  const { cdnMetrics, config } = useSystem();
  const enabled = config?.cdn?.enabled ?? (data?.enabled !== undefined ? data.enabled : true);
  const hitRatio = cdnMetrics?.hitRatioPercent ?? (data?.hitRatioPercent || 0);

  return (
    <BaseNode
      id="cdn"
      title="CDN Edge Network"
      subtitle="CloudFront / Anycast"
      icon={Globe}
      iconColor="bg-cyan-500 text-cyan-600 dark:text-cyan-400"
      status={!enabled ? 'bypassed' : 'healthy'}
      targetHandle={Position.Left}
      sourceHandle={Position.Right}
      metrics={[
        { label: 'Edge Status', value: enabled ? 'Active' : 'Bypassed' },
        { label: 'Hit Ratio', value: enabled ? `${hitRatio}%` : 'Bypassed' },
      ]}
    />
  );
};
