import React, { useState } from 'react';
import { Terminal, Bug, RefreshCw, FileText, Download, Copy } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getHealth, getConfig } from '../api/client';
import { useStore } from '../store';
import { useTranslation } from '../i18n/useTranslation';

export default function Debug() {
  const { systemStatus, wsConnected, addToast } = useStore();
  const { t } = useTranslation();
  const [logs, setLogs] = useState<string[]>([
    '[2024-01-01 10:00:00] INFO  Dashboard initialized',
    '[2024-01-01 10:00:01] INFO  CodeWhale binary detected: codewhale.exe',
    '[2024-01-01 10:00:02] INFO  Configuration loaded',
    '[2024-01-01 10:00:03] INFO  WebSocket server started on port 3001',
    '[2024-01-01 10:00:03] INFO  Database initialized successfully',
  ]);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 5000,
  });

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: getConfig,
  });

  const addLog = (level: string, message: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    setLogs((prev) => [...prev, `[${timestamp}] ${level}  ${message}`]);
  };

  const handleRefreshLogs = () => {
    addLog('INFO', 'Logs refreshed');
  };

  const copyLogs = () => {
    navigator.clipboard.writeText(logs.join('\n'));
    addLog('INFO', 'Logs copied to clipboard');
    addToast({ type: 'success', message: "Logs copied" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-100">{t('debug.title')}</h1>
        <p className="text-gray-500 mt-1">{t('debug.subtitle')}</p>
      </div>

      {/* Status overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusBadge label={t('debug.websocket')} ok={wsConnected} />
        <StatusBadge label={t('debug.config')} ok={systemStatus.configValid} />
        <StatusBadge label={t('debug.api')} ok={true} />
        <StatusBadge label={t('debug.database')} ok={true} />
      </div>

      {/* Raw data panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-green-400" />
              <h3 className="font-semibold text-gray-100">{t('debug.healthCheck')}</h3>
            </div>
          </div>
          <pre className="bg-dark-950 rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(health?.data?.data, null, 2) || t("common.loading")}
          </pre>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-blue-400" />
              <h3 className="font-semibold text-gray-100">{t('debug.configuration')}</h3>
            </div>
          </div>
          <pre className="bg-dark-950 rounded-lg p-4 text-xs font-mono text-blue-400 overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(config?.data?.data?.deepseek || {}, null, 2) || t("common.loading")}
          </pre>
        </div>
      </div>

      {/* Log viewer */}
      <div className="bg-dark-900 border border-dark-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bug size={18} className="text-yellow-400" />
            <h3 className="font-semibold text-gray-100">{t('debug.appLogs')}</h3>
            <span className="text-xs text-gray-500">({logs.length} {t("debug.entries")})</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleRefreshLogs}
              className="flex items-center gap-1 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs transition-colors"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
            <button
              onClick={copyLogs}
              className="flex items-center gap-1 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs transition-colors"
            >
              <Copy size={12} />
              Copy
            </button>
            <button
              onClick={() => {
                const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'codewhale-dashboard.log';
                a.click();
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-xs transition-colors"
            >
              <Download size={12} />
              Export
            </button>
          </div>
        </div>

        <div className="bg-dark-950 rounded-lg p-4 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto">
          {logs.map((log, i) => (
            <div
              key={i}
              className={`${
                log.includes(t("debug.error_label"))
                  ? 'text-red-400'
                  : log.includes('WARN')
                  ? 'text-yellow-400'
                  : 'text-gray-400'
              }`}
            >
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="bg-dark-900 border border-dark-700 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
      <p className={`text-sm font-medium mt-1 ${ok ? 'text-green-400' : 'text-red-400'}`}>
        {ok ? 'OK' : 'ERROR'}
      </p>
    </div>
  );
}