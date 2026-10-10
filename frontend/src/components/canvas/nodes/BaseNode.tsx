import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LucideIcon } from 'lucide-react';
import { useSystem } from '../../../context/SystemContext';

interface BaseNodeProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  status?: 'healthy' | 'active' | 'degraded' | 'idle' | 'bypassed';
  metrics?: Array<{ label: string; value: string | number; badge?: string }>;
  targetHandle?: boolean | Position;
  sourceHandle?: boolean | Position;
  additionalHandles?: Array<{ type: 'target' | 'source'; position: Position; id?: string }>;
}

export const BaseNode: React.FC<BaseNodeProps> = ({
  id,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  status = 'healthy',
  metrics = [],
  targetHandle = Position.Left,
  sourceHandle = Position.Right,
  additionalHandles = [],
}) => {
  const { activeNodeHighlights, selectedNodeId, setSelectedNodeId } = useSystem();
  const isActive = !!activeNodeHighlights[id];
  const isSelected = selectedNodeId === id;
  const isBypassed = status === 'bypassed';

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 animate-pulse';
      case 'degraded':
        return 'bg-amber-500';
      case 'bypassed':
        return 'bg-slate-400';
      case 'idle':
        return 'bg-slate-400';
      case 'healthy':
      default:
        return 'bg-emerald-500';
    }
  };

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative min-w-[210px] rounded-xl border p-3.5 shadow-sm transition-all duration-200 cursor-pointer select-none hover:shadow-md ${
        isBypassed
          ? 'opacity-65 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${
        isActive
          ? 'ring-2 ring-emerald-500 shadow-emerald-500/20 shadow-lg scale-[1.02] opacity-100 !border-solid'
          : isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-400 opacity-100'
          : ''
      }`}
    >
      {/* Target Handle */}
      {targetHandle && (
        <Handle
          type="target"
          position={typeof targetHandle === 'string' ? targetHandle : Position.Left}
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-900"
        />
      )}

      {/* Additional custom handles */}
      {additionalHandles.map((h, i) => (
        <Handle
          key={i}
          id={h.id}
          type={h.type}
          position={h.position}
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-900"
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${iconColor} bg-opacity-10 text-opacity-100 flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-tight">
              {title}
            </h4>
            {subtitle && (
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Status Indicator & Badge */}
        <div className="flex items-center gap-1.5" title={`Status: ${status}`}>
          {isBypassed ? (
            <span className="text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              Bypassed
            </span>
          ) : (
            <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          )}
        </div>
      </div>

      {/* Metrics Section */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
          {metrics.map((m, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">
                {m.label}
              </span>
              <span className="text-xs font-semibold font-mono text-slate-800 dark:text-slate-200">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Source Handle */}
      {sourceHandle && (
        <Handle
          type="source"
          position={typeof sourceHandle === 'string' ? sourceHandle : Position.Right}
          className="!w-2.5 !h-2.5 !bg-slate-400 dark:!bg-slate-600 !border-2 !border-white dark:!border-slate-900"
        />
      )}
    </div>
  );
};
