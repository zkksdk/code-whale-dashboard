import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Server, Brain, FolderOpen, HardDrive, Shield, Cpu, GitBranch,
  Activity, Zap, Wrench, Package, Database, Settings, AlertCircle,
  CheckCircle2, XCircle, Circle, Clock, BarChart3
} from "lucide-react";
import { getSystem, getThreadSummary, getAnalytics } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-md ${color || "bg-whale-600/20 text-whale-400"}`}>
          <Icon size={18} />
        </div>
        <div>
          <div className="text-xs text-gray-600">{label}</div>
          <div className="text-lg font-semibold text-gray-200">{value}</div>
          {sub && <div className="text-[10px] text-gray-700">{sub}</div>}
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-dark-900/30 border border-dark-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-dark-800 bg-dark-900/50">
        <Icon size={14} className="text-gray-500" />
        <h3 className="text-sm font-medium text-gray-300">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dark-800/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-300 font-mono flex items-center gap-1.5">
        {value || <span className="text-gray-700">—</span>}
        {ok !== undefined && (ok ? <CheckCircle2 size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />)}
      </span>
    </div>
  );
}

function FlagBadge({ name, enabled, stage }: { name: string; enabled: boolean; stage: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
      enabled ? "bg-green-900/30 text-green-400 border border-green-800/30" : "bg-dark-800 text-gray-600 border border-dark-700"
    }`}>
      {enabled ? <CheckCircle2 size={10} /> : <Circle size={10} />}
      {name}
      <span className="opacity-50">({stage})</span>
    </span>
  );
}

function SkillItem({ name, desc, enabled }: { name: string; desc: string; enabled: boolean }) {
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-dark-800/50 last:border-0">
      {enabled ? <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" /> : <XCircle size={12} className="text-red-500 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <span className="text-xs text-gray-300 font-medium">{name}</span>
        <p className="text-[10px] text-gray-600 leading-tight truncate">{desc}</p>
      </div>
    </div>
  );
}

export default function Overview() {
  const { wsConnected } = useStore();
  const { t } = useTranslation();

  const { data: system, isLoading: sysLoading } = useQuery({
    queryKey: ["system"],
    queryFn: () => getSystem(),
    refetchInterval: 30000,
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics", 30],
    queryFn: () => getAnalytics({ days: 30 }),
    refetchInterval: 60000,
  });

  const d = system?.data?.data;
  const a = analytics?.data?.data;

  const modelCount = d?.models?.length || d?.doctor?.models || 0;
  const skillCount = d?.skills?.length || d?.doctor?.skills?.global?.count || 0;
  const featureCount = d?.features?.filter((f: any) => f.enabled).length || 0;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">{t("overview.title")}</h1>
          <p className="text-sm text-gray-600 mt-0.5">
            CodeWhale {d?.doctor?.version} · {d?.doctor?.platform?.os} {d?.doctor?.platform?.arch}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1.5 text-xs ${wsConnected ? "text-green-500" : "text-red-500"}`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-green-500" : "bg-red-500"}`} />
            {wsConnected ? t("overview.connected") : t("overview.disconnected")}
          </span>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard icon={Brain} label={t("overview.provider")} value={d?.doctor?.capability?.resolved_provider || d?.doctor?.api_key?.source || "—"} color="bg-purple-600/20 text-purple-400" />
        <StatCard icon={Zap} label={t("overview.model")} value={d?.doctor?.default_text_model || "—"} color="bg-amber-600/20 text-amber-400" />
        <StatCard icon={BarChart3} label={t("overview.contextWindow")} value={(d?.doctor?.capability?.context_window || 0) >= 1000000 ? "1M" : String(d?.doctor?.capability?.context_window || "—")} sub={t("overview.tokens")} color="bg-blue-600/20 text-blue-400" />
        <StatCard icon={Activity} label={t("overview.turnsShort")} value={a?.sessionCount || analytics?.data?.data?.totalTurns || "—"} color="bg-green-600/20 text-green-400" />
        <StatCard icon={FolderOpen} label={t("overview.skillsShort")} value={skillCount} color="bg-cyan-600/20 text-cyan-400" />
        <StatCard icon={Database} label={t("overview.costShort")} value={`$${(a?.totalCost || 0).toFixed(4)}`} color="bg-rose-600/20 text-rose-400" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Config */}
        <Section title={t("overview.configSection")} icon={Settings}>
          <div className="space-y-0">
            <InfoRow label={t("overview.configFile")} value={d?.doctor?.config_path || "—"} ok={d?.doctor?.config_present} />
            <InfoRow label={t("overview.baseUrlLabel")} value={d?.doctor?.base_url || "—"} />
            <InfoRow label={t("overview.apiKeySource")} value={d?.doctor?.api_key?.source || "—"} />
            <InfoRow label={t("overview.strictToolMode")} value={d?.doctor?.strict_tool_mode?.status || "—"} ok={d?.doctor?.strict_tool_mode?.enabled} />
            <InfoRow label={t("overview.thinkingSupported")} value={d?.doctor?.capability?.thinking_supported ? t("overview.supported") : t("overview.no_label")} ok={d?.doctor?.capability?.thinking_supported} />
            <InfoRow label={t("overview.cacheTelemetry")} value={d?.doctor?.capability?.cache_telemetry_supported ? t("overview.yes") : t("overview.no_label")} ok={d?.doctor?.capability?.cache_telemetry_supported} />
            <InfoRow label={t("overview.maxOutput")} value={d?.doctor?.capability?.max_output?.toLocaleString() || "—"} />
          </div>
        </Section>

        {/* Workspace */}
        <Section title={t("workspace.title")} icon={GitBranch}>
          <div className="space-y-0">
            <InfoRow label={t("overview.pathShort")} value={d?.workspace?.workspace || d?.doctor?.workspace || "—"} />
            <InfoRow label={t("overview.gitRepo")} value={d?.workspace?.git_repo ? t("overview.yes") : t("overview.no_label")} ok={d?.workspace?.git_repo} />
            {d?.workspace?.branch && <InfoRow label={t("overview.branch")} value={d.workspace.branch} />}
            <InfoRow label={t("overview.staged")} value={String(d?.workspace?.staged || 0)} />
            <InfoRow label={t("overview.unstaged")} value={String(d?.workspace?.unstaged || 0)} />
            <InfoRow label={t("overview.untracked")} value={String(d?.workspace?.untracked || 0)} />
          </div>
        </Section>

        {/* Feature Flags */}
        <Section title={t("overview.featureFlags") || "Feature Flags"} icon={Zap}>
          <div className="flex flex-wrap gap-2">
            {(d?.features || []).map((f: any) => (
              <FlagBadge key={f.name} name={f.name} enabled={f.enabled} stage={f.stage} />
            ))}
            {(!d?.features || d.features.length === 0) && <span className="text-xs text-gray-700">{t("overview.noFeatureFlags")}</span>}
          </div>
        </Section>

        {/* Memory & Storage */}
        <Section title={t("overview.memoryStorage") || "Memory & Storage"} icon={HardDrive}>
          <div className="space-y-0">
            <InfoRow label={t("overview.memory")} value={d?.doctor?.memory?.enabled ? t("overview.enabled_label") : t("overview.disabled_label")} ok={d?.doctor?.memory?.enabled} />
            <InfoRow label={t("overview.memoryPath")} value={d?.doctor?.memory?.path || "—"} ok={d?.doctor?.memory?.file_present} />
            <InfoRow label={t("overview.spillover") || "Spillover"} value={`${d?.doctor?.storage?.spillover?.count || 0} files`} ok={(d?.doctor?.storage?.spillover?.count || 0) > 0} />
            <InfoRow label={t("overview.stash") || "Stash"} value={d?.doctor?.storage?.stash?.present ? t("overview.present") : t("overview.empty")} ok={d?.doctor?.storage?.stash?.present} />
            <InfoRow label="Sandbox" value={d?.doctor?.sandbox?.available ? (d.doctor.sandbox.kind || t("overview.available_label")) : t("overview.unavailable_label")} ok={d?.doctor?.sandbox?.available} />
          </div>
        </Section>

        {/* MCP & Plugins */}
        <Section title={t("overview.mcpPlugins") || "MCP & Plugins"} icon={Package}>
          <div className="space-y-0">
            <InfoRow label={t("overview.mcpConfig")} value={d?.doctor?.mcp?.config_path || "—"} ok={d?.doctor?.mcp?.present} />
            <InfoRow label={t("overview.mcpServersLabel")} value={String((d?.doctor?.mcp?.servers || []).length)} />
            <InfoRow label={t("overview.pluginsDir")} value={d?.doctor?.plugins?.path || "—"} ok={d?.doctor?.plugins?.present} />
            <InfoRow label={t("overview.pluginsCount")} value={String(d?.doctor?.plugins?.count || 0)} />
            <InfoRow label={t("overview.toolsDir")} value={d?.doctor?.tools?.path || "—"} ok={d?.doctor?.tools?.present} />
            <InfoRow label={t("overview.toolsCount")} value={String(d?.doctor?.tools?.count || 0)} />
          </div>
        </Section>

        {/* Models */}
        <Section title={t("models.title")} icon={Brain}>
          <div className="space-y-0">
            {(d?.models || []).map((m: any) => (
              <InfoRow key={m.name} label={m.provider} value={m.is_default ? `${m.name} ★` : m.name} ok={m.is_default} />
            ))}
            {(!d?.models || d.models.length === 0) && <span className="text-xs text-gray-700">{t("overview.loadingLabel")}</span>}
          </div>
        </Section>

        {/* Skills */}
        <Section title={`${t("skills.title")} (${skillCount})`} icon={FolderOpen}>
          <div className="max-h-64 overflow-y-auto space-y-0">
            {(d?.skills || []).slice(0, 20).map((s: any) => (
              <SkillItem key={s.name} name={s.name} desc={s.description || ""} enabled={s.enabled} />
            ))}
            {skillCount > 20 && <p className="text-[10px] text-gray-600 pt-2">+{skillCount - 20} {t("overview.more").replace("{count}", "")}</p>}
          </div>
        </Section>

        {/* Usage */}
        <Section title={t("overview.usageSummary") || "Usage Summary"} icon={BarChart3}>
          <div className="space-y-0">
            <InfoRow label={t("overview.totalInput")} value={a?.usage?.totals?.input_tokens?.toLocaleString() || "—"} />
            <InfoRow label={t("overview.totalOutput")} value={a?.usage?.totals?.output_tokens?.toLocaleString() || "—"} />
            <InfoRow label={t("overview.cached")} value={a?.usage?.totals?.cached_tokens?.toLocaleString() || "—"} />
            <InfoRow label={t("overview.reasoning")} value={a?.usage?.totals?.reasoning_tokens?.toLocaleString() || "—"} />
            <InfoRow label={t("overview.totalCost")} value={`$${(a?.usage?.totals?.cost_usd || a?.totalCost || 0).toFixed(6)}`} />
            <InfoRow label={t("overview.totalTurns")} value={String(a?.usage?.totals?.turns || a?.sessionCount || 0)} />
          </div>
        </Section>
      </div>
    </div>
  );
}