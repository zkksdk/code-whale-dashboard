import React from 'react';
import { Menu, Bell, Command } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenCmdPalette: () => void;
}

export default function Header({ onToggleSidebar, onOpenCmdPalette }: HeaderProps) {
  return (
    <header className="h-12 border-b border-dark-800 flex items-center justify-between px-3 bg-dark-950">
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 hover:bg-dark-800 rounded transition-colors text-gray-600 hover:text-gray-300"
        >
          <Menu size={16} />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onOpenCmdPalette}
          className="flex items-center gap-1 px-2.5 py-1 bg-dark-900 border border-dark-700 hover:border-dark-600 rounded text-[11px] text-gray-600 transition-colors"
        >
          <Command size={12} />
          <span>K</span>
        </button>

        <button className="p-1.5 hover:bg-dark-800 rounded transition-colors text-gray-600 hover:text-gray-300 relative">
          <Bell size={16} />
          <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
