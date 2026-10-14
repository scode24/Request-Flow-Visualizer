import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LucideIcon } from 'lucide-react';
import { useSystem } from '../../../context/SystemContext';

export interface BaseNodeProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  status?: 'healthy' | 'active' | 'degraded' | 'idle' | 'bypassed';
  metrics?: Array<{ label: string; value: string | number; badge?: string }>;
  loadPercent?: number;
  loadLabel?: string;
  badgeText?: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
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
  loadPercent,
  loadLabel,
  badgeText,
  badgeVariant = 'default',
  targetHandle = Position.Left,
  sourceHandle = Position.Right,
  additionalHandles = [],
}) => {
  const { activeNodeHighlights, selectedNodeId, setSelectedNodeId } = useSystem();
  const isActive = !!activeNodeHighlights[id];
  const isSelected = selectedNodeId === id;
  const isBypassed = status === 'bypassed';
  const isHeavyLoad = typeof loadPercent === 'number' && loadPercent > 80;

  const getStatusDot = () => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500 ring-2 ring-emerald-400/40 animate-pulse';
      case 'degraded':
        return 'bg-amber-500 ring-2 ring-amber-400/40';
      case 'bypassed':
      case 'idle':
        return 'bg-slate-400';
      case 'healthy':
      default:
        return 'bg-emerald-500';
    }
  };

  const getBadgeStyle = () => {
    switch (badgeVariant) {
      case 'danger':
        return 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800/80';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/80';
      case 'success':
        return 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80';
      case 'info':
        return 'bg-sky-50 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/80';
      default:
        return 'bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700/80';
    }
  };

  const getIconContainerStyles = (colorStr: string) => {
    if (colorStr.includes('emerald') || colorStr.includes('green')) {
      return 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400';
    }
    if (colorStr.includes('sky')) {
      return 'bg-sky-50 dark:bg-sky-950/80 border border-sky-200/80 dark:border-sky-800/80 text-sky-600 dark:text-sky-400';
    }
    if (colorStr.includes('cyan')) {
      return 'bg-cyan-50 dark:bg-cyan-950/80 border border-cyan-200/80 dark:border-cyan-800/80 text-cyan-600 dark:text-cyan-400';
    }
    if (colorStr.includes('purple')) {
      return 'bg-purple-50 dark:bg-purple-950/80 border border-purple-200/80 dark:border-purple-800/80 text-purple-600 dark:text-purple-400';
    }
    if (colorStr.includes('blue')) {
      return 'bg-blue-50 dark:bg-blue-950/80 border border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400';
    }
    if (colorStr.includes('red') || colorStr.includes('rose')) {
      return 'bg-rose-50 dark:bg-rose-950/80 border border-rose-200/80 dark:border-rose-800/80 text-rose-600 dark:text-rose-400';
    }
    if (colorStr.includes('indigo')) {
      return 'bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-600 dark:text-indigo-400';
    }
    if (colorStr.includes('amber') || colorStr.includes('yellow') || colorStr.includes('orange')) {
      return 'bg-amber-50 dark:bg-amber-950/80 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400';
    }
    if (colorStr.includes('teal')) {
      return 'bg-teal-50 dark:bg-teal-950/80 border border-teal-200/80 dark:border-teal-800/80 text-teal-600 dark:text-teal-400';
    }
    return 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200';
  };

  return (
    <div
      onClick={() => setSelectedNodeId(id)}
      className={`relative w-[184px] rounded-xl border p-2.5 shadow-sm transition-all duration-200 cursor-pointer select-none hover:shadow-md ${
        isBypassed
          ? 'opacity-60 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50'
          : 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      } ${
        isActive
          ? 'ring-2 ring-emerald-500 shadow-emerald-500/20 shadow-md scale-[1.02] opacity-100 !border-solid'
          : isHeavyLoad
          ? 'ring-1 ring-rose-400 dark:ring-rose-500/80 shadow-rose-500/10'
          : isSelected
          ? 'ring-2 ring-indigo-500 border-indigo-400 opacity-100 shadow-sm'
          : ''
      }`}
    >
      {/* Target Handle */}
      {targetHandle && (
        <Handle
          type="target"
          position={typeof targetHandle === 'string' ? targetHandle : Position.Left}
          className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-900"
        />
      )}

      {/* Additional custom handles */}
      {additionalHandles.map((h, i) => (
        <Handle
          key={i}
          id={h.id}
          type={h.type}
          position={h.position}
          className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-900"
        />
      ))}

      {/* Compact Header */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg ${getIconContainerStyles(iconColor)} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[11.5px] font-semibold text-slate-900 dark:text-slate-100 leading-tight truncate">
              {title}
            </h4>
            {subtitle && (
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-mono block truncate leading-none mt-0.5">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Status Indicator / Badge */}
        <div className="flex items-center gap-1 shrink-0" title={`Status: ${status}`}>
          {isBypassed ? (
            <span className="text-[8px] font-mono uppercase font-bold px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500">
              Bypassed
            </span>
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot()}`} />
          )}
        </div>
      </div>

      {/* Contextual Custom Badge (e.g. Rate Limiting, DLQ, Circuit Breaker) */}
      {badgeText && (
        <div className="mb-1.5">
          <span className={`inline-block text-[8.5px] font-mono font-medium px-1.5 py-0.5 rounded border ${getBadgeStyle()}`}>
            {badgeText}
          </span>
        </div>
      )}

      {/* Compact Micro Load Bar */}
      {typeof loadPercent === 'number' && (
        <div className="my-1.5 py-0.5">
          <div className="flex items-center justify-between text-[9px] mb-1 font-mono">
            <span className="text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${loadPercent > 80 ? 'bg-rose-500 animate-ping' : loadPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              {loadLabel || 'Load'}
            </span>
            <span className={`font-bold text-[9px] ${
              loadPercent > 80
                ? 'text-rose-600 dark:text-rose-400'
                : loadPercent > 50
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {Math.round(loadPercent)}%
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                loadPercent > 80
                  ? 'bg-rose-500'
                  : loadPercent > 50
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, loadPercent))}%` }}
            />
          </div>
        </div>
      )}

      {/* Compact Metrics Grid */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 pt-1.5 mt-1 border-t border-slate-100 dark:border-slate-800/80">
          {metrics.map((m, idx) => (
            <div key={idx} className="flex flex-col min-w-0">
              <span className="text-[8.5px] font-medium text-slate-400 dark:text-slate-500 truncate uppercase tracking-wider">
                {m.label}
              </span>
              <span className="text-[10.5px] font-semibold font-mono text-slate-800 dark:text-slate-200 truncate">
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
          className="!w-2 !h-2 !bg-slate-400 dark:!bg-slate-500 !border-[1.5px] !border-white dark:!border-slate-900"
        />
      )}
    </div>
  );
};
