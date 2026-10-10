import React from 'react';
import { LoadControlPanel } from '../sidebar/LoadControlPanel';
import { ArchitectureCanvas } from '../canvas/ArchitectureCanvas';
import { NodeDetailDrawer } from '../sidebar/NodeDetailDrawer';
import { ObservabilityDrawer } from '../bottompanel/ObservabilityDrawer';

export const ArchitectureView: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Load & Topology Control Sidebar */}
        <LoadControlPanel />

        {/* Central Architecture React Flow Canvas */}
        <div className="flex-1 relative h-full">
          <ArchitectureCanvas />
          {/* Node Diagnostics Drawer */}
          <NodeDetailDrawer />
        </div>
      </div>

      {/* Bottom Collapsible Observability Panel */}
      <ObservabilityDrawer />
    </div>
  );
};
