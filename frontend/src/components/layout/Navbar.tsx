import React from 'react';
import { Sun, Moon, Wifi, WifiOff, Workflow, Terminal, Wrench, Sliders } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSystem } from '../../context/SystemContext';

export type ActiveView = 'architecture' | 'testing' | 'api-console' | 'config';

interface NavbarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
  const { theme, toggleTheme } = useTheme();
  const { wsConnected, config } = useSystem();

  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none z-30">
      {/* Brand & Project Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20">
          <Workflow className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
              Request Flow Visualizer
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/60">
              v2.4
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block -mt-0.5">
            Distributed Systems & Load Lab
          </span>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <nav className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs">
        <button
          onClick={() => setActiveView('architecture')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeView === 'architecture'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>Live Topology</span>
        </button>

        <button
          onClick={() => setActiveView('testing')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeView === 'testing'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Component Testing</span>
        </button>

        <button
          onClick={() => setActiveView('api-console')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeView === 'api-console'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>API Console</span>
        </button>

        <button
          onClick={() => setActiveView('config')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
            activeView === 'config'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Config</span>
        </button>
      </nav>

      {/* Right Utility Actions */}
      <div className="flex items-center gap-3">
        {/* WebSocket Connection Status Badge */}
        <div className="flex items-center gap-1.5 text-xs">
          {wsConnected ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
              <Wifi className="w-3.5 h-3.5" />
              <span>LIVE</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-500 font-mono text-[11px]">
              <WifiOff className="w-3.5 h-3.5" />
              <span>RECONNECTING</span>
            </span>
          )}
        </div>

        {/* Environment Tag */}
        <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {config?.environment || 'development'}
        </span>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} theme`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
