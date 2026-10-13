import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Terminal, ListFilter, FileCode2, History } from 'lucide-react';
import { LiveTraceList } from './LiveTraceList';
import { InteractiveTerminal } from './InteractiveTerminal';
import { ResponseInspector } from './ResponseInspector';
import { useSystem } from '../../context/SystemContext';

type Tab = 'terminal' | 'traces' | 'response' | 'events';

export const ObservabilityDrawer: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('terminal');
  const { autoscalerMetrics, recentTraces } = useSystem();

  return (
    <div
      className={`border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-200 flex flex-col shrink-0 select-none ${
        isExpanded ? 'h-72' : 'h-10'
      }`}
    >
      {/* Drawer Header & Tabs */}
      <div className="h-10 px-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setActiveTab('terminal'); setIsExpanded(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'terminal' && isExpanded
                ? 'bg-emerald-600 text-white shadow-sm border border-emerald-500'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive Terminal</span>
          </button>

          <button
            onClick={() => { setActiveTab('traces'); setIsExpanded(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'traces' && isExpanded
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Distributed Traces ({recentTraces.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('response'); setIsExpanded(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'response' && isExpanded
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            <span>HTTP Response</span>
          </button>

          <button
            onClick={() => { setActiveTab('events'); setIsExpanded(true); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'events' && isExpanded
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Scaling Events ({autoscalerMetrics?.recentEvents.length || 0})</span>
          </button>
        </div>

        {/* Expand / Collapse Toggle Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          title={isExpanded ? 'Collapse Drawer' : 'Expand Drawer'}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Drawer Content */}
      {isExpanded && (
        <div className="flex-1 overflow-hidden">
          {activeTab === 'terminal' && <InteractiveTerminal />}
          {activeTab === 'traces' && <LiveTraceList />}
          {activeTab === 'response' && <ResponseInspector />}
          {activeTab === 'events' && (
            <div className="h-full overflow-y-auto p-4 space-y-2 text-xs font-mono">
              {autoscalerMetrics?.recentEvents && autoscalerMetrics.recentEvents.length > 0 ? (
                autoscalerMetrics.recentEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          evt.type === 'scale-up'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {evt.type}
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {evt.previousReplicas} ➔ {evt.newReplicas} Pods
                        </span>
                      </div>
                      <span className="text-slate-500 block mt-1">{evt.reason}</span>
                    </div>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 p-8">
                  No scaling events recorded yet. Enable HPA and generate high traffic to trigger scaling.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
