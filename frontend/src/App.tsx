import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { SystemProvider } from './context/SystemContext';
import { Navbar, ActiveView } from './components/layout/Navbar';
import { ArchitectureView } from './components/views/ArchitectureView';
import { ComponentTestingView } from './components/views/ComponentTestingView';
import { ApiConsoleView } from './components/views/ApiConsoleView';
import { ConfigManagementView } from './components/views/ConfigManagementView';

export const AppContent: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('architecture');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar activeView={activeView} setActiveView={setActiveView} />

      {/* Main View Area */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeView === 'architecture' && <ArchitectureView />}
        {activeView === 'testing' && <ComponentTestingView />}
        {activeView === 'api-console' && <ApiConsoleView />}
        {activeView === 'config' && <ConfigManagementView />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <SystemProvider>
        <AppContent />
      </SystemProvider>
    </ThemeProvider>
  );
};

export default App;
