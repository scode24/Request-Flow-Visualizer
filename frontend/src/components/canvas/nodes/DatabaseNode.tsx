import React from 'react';
import { Database, Split, Copy } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

interface DatabaseNodeProps {
  data?: {
    nodeId?: string;
    name?: string;
    role?: 'primary' | 'replica' | 'shard';
    shardKey?: string;
    index?: number;
  };
}

export const DatabaseNode: React.FC<DatabaseNodeProps> = ({ data }) => {
  const { databaseMetrics } = useSystem();

  const nodeId = data?.nodeId || 'database-primary';
  const nodeMetric = databaseMetrics?.nodes?.find((n) => n.id === nodeId);

  const role = nodeMetric?.role || data?.role || 'primary';
  const shardKey = nodeMetric?.shardKey || data?.shardKey;
  const name = nodeMetric?.name || data?.name || (role === 'shard' ? `DB Shard #${data?.index || 1}` : role === 'replica' ? `Read Replica #${data?.index || 1}` : 'PostgreSQL Primary');

  const queries = nodeMetric?.totalQueries ?? databaseMetrics?.totalQueries ?? 0;
  const conns = nodeMetric?.activeConnections ?? databaseMetrics?.activeConnections ?? 1;
  const cpuPercent = nodeMetric?.cpuPercent ?? Math.min(100, Math.max(5, conns * 12));
  const status = nodeMetric?.status || (cpuPercent > 80 ? 'degraded' : queries > 0 ? 'active' : 'healthy');

  let subtitle = 'Relational Storage';
  let icon = Database;
  let iconColor = 'bg-blue-600 text-blue-700 dark:text-blue-300';

  if (role === 'replica') {
    subtitle = 'Read Replica (Async)';
    icon = Copy;
    iconColor = 'bg-sky-500 text-sky-600 dark:text-sky-300';
  } else if (role === 'shard') {
    subtitle = shardKey ? `Shard [${shardKey}]` : 'Horizontal Partition';
    icon = Split;
    iconColor = 'bg-indigo-600 text-indigo-600 dark:text-indigo-300';
  } else if (databaseMetrics?.mode === 'read-replicas') {
    subtitle = 'Primary Leader (RW)';
  }

  return (
    <BaseNode
      id={nodeId}
      title={name}
      subtitle={subtitle}
      icon={icon}
      iconColor={iconColor}
      status={status}
      loadPercent={cpuPercent}
      loadLabel="Engine Load"
      targetHandle={Position.Left}
      sourceHandle={role === 'primary' && databaseMetrics?.mode === 'read-replicas' ? Position.Right : false}
      metrics={[
        { label: 'Queries', value: queries },
        { label: 'Active Pool', value: `${conns} / 10` },
      ]}
    />
  );
};

