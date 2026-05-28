import React from 'react';
import { WifiOff, Cpu, Activity } from 'lucide-react';
import { useStore } from '../../store';
import { formatTimestamp } from '../../utils/format';

export default function StatusBar() {
  const { wsConnected, systemStatus } = useStore();

  return (
    <footer className="h-7 border-t border-dark-800 bg-dark-950 flex items-center justify-between px-3 text-[11px] text-gray-600">
      <div className="flex items-center gap-3">
        {/* Connection */}
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{wsConnected ? 'Connected' : 'Offline'}</span>
        </div>
        {/* Provider */}
        <div className="flex items-center gap-1.5">
          <Activity size={11} className="text-gray-600" />
          <span>{systemStatus.provider || 'N/A'}</span>
        </div>
        {/* Config */}
        <div className="flex items-center gap-1.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${systemStatus.configValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
          <span>Config</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Version */}
        <div className="flex items-center gap-1">
          <Cpu size={11} />
          <span>v{systemStatus.version || '?'}</span>
        </div>
        {/* Timestamp */}
        <span className="font-mono">{formatTimestamp(Date.now())}</span>
      </div>
    </footer>
  );
}
