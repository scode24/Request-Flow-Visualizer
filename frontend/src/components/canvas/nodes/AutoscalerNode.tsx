import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const AutoscalerNode: React.FC<{ data?: any }> = ({ data }) => {
  const { autoscalerMetrics, config } = useSystem();
  const enabled = config?.backend?.autoscalingEnabled ?? (data?.enabled !== undefined ? data.enabled : false);
  const currentCpu = autoscalerMetrics?.currentCpuPercent ?? (data?.currentCpu || 15);
  const targetCpu = config?.backend?.targetCpuPercent ?? (data?.targetCpu || 65);

  return (
    <BaseNode
      id="autoscaler"
      title="Kubernetes HPA"
      subtitle="Horizontal Pod Autoscaler"
      icon={ArrowUpRight}
      iconColor="bg-teal-500 text-teal-600 dark:text-teal-400"
      status={!enabled ? 'idle' : currentCpu > targetCpu ? 'active' : 'healthy'}
      targetHandle={Position.Top}
      sourceHandle={Position.Bottom}
      metrics={[
        { label: 'HPA Policy', value: enabled ? 'Active' : 'Disabled' },
        { label: 'CPU / Target', value: enabled ? `${currentCpu}% / ${targetCpu}%` : 'Off' },
      ]}
    />
  );
};
