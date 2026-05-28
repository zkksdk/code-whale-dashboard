import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Server, RefreshCw, CheckCircle, XCircle, AlertTriangle, Zap, Plug } from "lucide-react";
import { getMcpServers, reloadMcp } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";

interface McpServerInfo {
  name: string;
  enabled: boolean;
  status: string;
  detail?: string;
  transport?: string;
  command?: string;
  tools?: string[];
}

export default function McpPage() {
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();

  const { data: serversData, isLoading } = useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => getMcpServers().then(r => r.data),
    refetchInterval: 15000,
  });

  const reloadMutation = useMutation({
    mutationFn: reloadMcp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp-servers"] });
      addToast({ type: "success", message: t("mcp.reload") + " OK" });
    },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });

  const servers: McpServerInfo[] = Array.isArray(serversData?.data)
    ? serversData.data
    : Array.isArray(serversData?.servers)
      ? serversData.servers
      : [];

  const statusIcon = (s: McpServerInfo) => {
    switch (s.status) {
      case "ok": case "ready": return <CheckCircle size={14} className="text-green-400" />;
      case "error": case "failed": return <XCircle size={14} className="text-red-400" />;
      case "connecting": return <Zap size={14} className="text-yellow-400" />;
      default: return <AlertTriangle size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">{t("mcp.title")}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{t('mcp.subtitle')}</p>
        </div>
        <button
          onClick={() => reloadMutation.mutate()}
          disabled={reloadMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 rounded text-xs text-gray-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={reloadMutation.isPending ? "animate-spin" : ""} />
          {t("mcp.reload")}
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600 text-sm">{t("common.loading")}</div>
      ) : servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <Plug size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{t("mcp.noServers")}</p>
          <p className="text-xs mt-1 text-gray-700">Run <code className="text-whale-400">codewhale-tui mcp init</code> to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div
              key={server.name}
              className={`bg-dark-950 border rounded-lg p-4 transition-colors ${server.enabled ? "border-dark-700" : "border-dark-800 opacity-50"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded flex items-center justify-center ${server.enabled ? "bg-whale-600/20" : "bg-dark-800"}`}>
                    <Server size={16} className={server.enabled ? "text-whale-400" : "text-gray-600"} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">{server.name}</span>
                      {statusIcon(server)}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${server.enabled ? "bg-green-900/30 text-green-400" : "bg-dark-800 text-gray-600"}`}>
                        {server.enabled ? t("common.enabled") : t("common.disabled")}
                      </span>
                    </div>
                    {server.detail && <p className="text-[11px] text-gray-600 mt-0.5">{server.detail}</p>}
                    {server.transport && (
                      <span className="text-[10px] text-gray-700 mt-0.5 block">
                        {server.transport}{server.command ? ` \u00b7 ${server.command}` : ""}
                      </span>
                    )}
                  </div>
                </div>
                {server.tools && server.tools.length > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-gray-600">{server.tools.length} {t("mcp.tools")}</span>
                    <div className="flex flex-wrap gap-1 mt-1 justify-end max-w-[200px]">
                      {server.tools.slice(0, 4).map((tool) => (
                        <span key={tool} className="text-[9px] bg-dark-800 text-gray-500 px-1 py-0.5 rounded font-mono">{tool}</span>
                      ))}
                      {server.tools.length > 4 && (
                        <span className="text-[9px] text-gray-700">+{server.tools.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
