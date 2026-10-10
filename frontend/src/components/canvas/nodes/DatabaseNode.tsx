import React from 'react';
import { Database } from 'lucide-react';
import { Position } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useSystem } from '../../../context/SystemContext';

export const DatabaseNode: React.FC = () => {
  const { databaseMetrics } = useSystem();

  return (
    <BaseNode
      id="database"
      title="PostgreSQL"
      subtitle="Relational Storage"
      icon={Database}
      iconColor="bg-blue-600 text-blue-700 dark:text-blue-300"
      status="healthy"
      targetHandle={Position.Left}
      sourceHandle={false}
      metrics={[
        { label: 'Total Queries', value: databaseMetrics?.totalQueries || 0 },
        { label: 'Active Pool', value: `${databaseMetrics?.activeConnections || 1} / 10` },
      ]}
    />
  );
};
