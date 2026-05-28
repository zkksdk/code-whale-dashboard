import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, Users, Activity, Clock, CheckCircle, XCircle, Loader2, Zap, Settings, Play, Pause } from "lucide-react";
import { getSystem, updateConfig, getConfig } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { formatRelativeTime } from "../utils/format";

interface SubAgentEvent {
  id: string;
  timestamp: string;
  agentName: string;
  status: "running" | "completed" | "failed";
  summary: string;
  duration?: number;
}

export default function SubAgentsPage() {
  const { t } = useTranslation();
  const { addToast } = useStore();
  
  const { data: sysData } = useQuery({
    queryKey: ["system"],
    queryFn: () => getSystem().then((r: any) => r.data?.data || {}),
    refetchInterval: 15000,
  });

  const { data: configData } = useQuery({
    queryKey: ["config"],
    queryFn: () => getConfig().then((r: any) => r.data?.data || {}),
  });

  const features = sysData?.features || [];
  const subAgentFeature = features.find((f: any) => f.name === "subagents");
  const enabled = subAgentFeature?.enabled ?? true;
  const maxSubAgents = configData?.max_subagents || 4;

  // Listen for sub-agent events from SSE
  const [events, setEvents] = useState<SubAgentEvent[]>([]);
  
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.type === "subagent") {
        setEvents(prev => {
          const idx = prev.findIndex(ev => ev.id === e.detail.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...e.detail.data };
            return updated;
          }
          return [{ id: e.detail.id, timestamp: new Date().toISOString(), ...e.detail.data }, ...prev].slice(0, 50);
        });
      }
    };
    window.addEventListener("ws-message", handler);
    return () => window.removeEventListener("ws-message", handler);
  }, []);

  const toggleFeature = async () => {
    try {
      await updateConfig({ features: { subagents: !enabled } });
      addToast({ type: "success", message: enabled ? "Sub-agents disabled" : "Sub-agents enabled" });
    } catch {
      addToast({ type: "error", message: "Failed to toggle" });
    }
  };

  const runningCount = events.filter(e => e.status === "running").length;
  const completedCount = events.filter(e => e.status === "completed").length;
  const failedCount = events.filter(e => e.status === "failed").length;

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Users size={20} className="text-purple-400" />
          {t("subagents.title") || "Sub-Agents"}
        </h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {t("subagents.subtitle") || "Monitor and manage parallel AI sub-agents"}
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-gray-500">{t("subagents.status") || "Status"}</span>
          </div>
          <div className={`text-lg font-bold ${enabled ? "text-green-400" : "text-red-400"}`}>
            {enabled ? t("subagents.enabled") || "Enabled" : t("subagents.disabled") || "Disabled"}
          </div>
          <div className="text-[10px] text-gray-600 mt-0.5">{subAgentFeature?.stage || "experimental"}</div>
        </div>

        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-purple-400" />
            <span className="text-xs text-gray-500">{t("subagents.maxConcurrent") || "Max Concurrent"}</span>
          </div>
          <div className="text-lg font-bold text-purple-400">{maxSubAgents}</div>
          <div className="text-[10px] text-gray-600 mt-0.5">agents</div>
        </div>

        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-amber-400" />
            <span className="text-xs text-gray-500">{t("subagents.running") || "Running"}</span>
          </div>
          <div className="text-lg font-bold text-amber-400">{runningCount}</div>
        </div>

        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">{t("subagents.completed") || "Completed"}</span>
          </div>
          <div className="text-lg font-bold text-green-400">{completedCount}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={toggleFeature}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${
            enabled ? "bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-800/30"
                    : "bg-green-900/20 hover:bg-green-900/30 text-green-400 border border-green-800/30"
          }`}>
          {enabled ? <Pause size={12} /> : <Play size={12} />}
          {enabled ? t("subagents.disable") || "Disable" : t("subagents.enable") || "Enable"}
        </button>
        <span className="text-[10px] text-gray-600">
          {t("subagents.maxSubagentsHint") || "Configure via config.toml or --max-subagents flag"}
        </span>
      </div>

      {/* Activity Log */}
      <div className="bg-dark-900/50 border border-dark-800 rounded-lg">
        <div className="px-4 py-3 border-b border-dark-800 flex items-center gap-2">
          <Activity size={14} className="text-gray-500" />
          <h3 className="text-sm font-medium text-gray-200">{t("subagents.recentActivity") || "Recent Activity"}</h3>
          <span className="text-[10px] text-gray-700 ml-auto">{events.length} events</span>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Bot size={36} className="mb-3 opacity-20" />
              <p className="text-sm">{t("subagents.noActivity") || "No sub-agent activity yet"}</p>
              <p className="text-[11px] mt-1">{t("subagents.noActivityHint") || "Start a conversation in Agent mode to see sub-agents in action"}</p>
            </div>
          ) : (
            events.map((ev, i) => (
              <div key={ev.id || i} className="flex items-center gap-3 px-4 py-2.5 border-b border-dark-800/50 last:border-0 hover:bg-dark-800/30 transition-colors">
                <div className="flex-shrink-0">
                  {ev.status === "running" ? (
                    <Loader2 size={14} className="text-amber-400 animate-spin" />
                  ) : ev.status === "completed" ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    <XCircle size={14} className="text-red-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-300 truncate">{ev.agentName || "Sub-agent"}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      ev.status === "running" ? "bg-amber-900/20 text-amber-400"
                      : ev.status === "completed" ? "bg-green-900/20 text-green-400"
                      : "bg-red-900/20 text-red-400"
                    }`}>{ev.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 truncate mt-0.5">{ev.summary || "—"}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[10px] text-gray-600">{formatRelativeTime(ev.timestamp)}</div>
                  {ev.duration && <div className="text-[9px] text-gray-700">{ev.duration}ms</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-dark-900/30 border border-dark-800/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={13} className="text-amber-400" />
          <span className="text-xs font-medium text-gray-400">{t("subagents.howItWorks") || "How Sub-Agents Work"}</span>
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          {t("subagents.description") || "Sub-agents are parallel AI workers spawned by the main agent during conversations. They handle independent subtasks simultaneously, speeding up complex operations. Configure max concurrent agents via --max-subagents flag or config.toml. Monitor their activity in real-time on this page."}
        </p>
      </div>
    </div>
  );
}
