import React from 'react';
import { BaseEdge, EdgeProps, getBezierPath } from '@xyflow/react';
import { useSystem } from '../../../context/SystemContext';

export const AnimatedEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) => {
  const { activeEdgeHighlights, loadTestStatus } = useSystem();
  const isActive = !!activeEdgeHighlights[id];
  const isTrafficFlowing = !!loadTestStatus?.isRunning;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      {/* Background line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: isActive ? 2.5 : 1.5,
          stroke: isActive
            ? '#10b981'
            : '#94a3b8',
          opacity: isActive ? 1 : 0.6,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Animated active packet flow */}
      {(isActive || isTrafficFlowing) && (
        <path
          d={edgePath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          className={isActive ? 'animate-flow-dash-fast' : 'animate-flow-dash'}
          style={{
            filter: isActive ? 'drop-shadow(0 0 4px #10b981)' : undefined,
          }}
        />
      )}
    </>
  );
};
