import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastProps {
  toast: {
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
  };
  onDismiss: () => void;
}

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'border-green-800 bg-green-900/50 text-green-400',
  error: 'border-red-800 bg-red-900/50 text-red-400',
  warning: 'border-yellow-800 bg-yellow-900/50 text-yellow-400',
  info: 'border-blue-800 bg-blue-900/50 text-blue-400',
};

export default function Toast({ toast, onDismiss }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const Icon = iconMap[toast.type];

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-[400px] ${
        colorMap[toast.type]
      } ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      <Icon size={18} className="flex-shrink-0" />
      <p className="text-sm flex-1">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="p-0.5 hover:bg-white/10 rounded transition-colors flex-shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}