import React from "react";
import { useQuery } from "@tanstack/react-query";
import { FolderOpen, GitBranch, HardDrive, AlertCircle, Cpu, Box, Wrench, Monitor, Key, Zap, CheckCircle, XCircle, Server, Database, FileText } from "lucide-react";
import { getSystem } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";

function StatPill({ label, value, color = "text-gray-200", sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div className="bg-dark-900 rounded-lg p-3 text-center border border-dark-800">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-600">{label}</div>
      {sub && <div className="text-[9px] text-gray-700 mt-0.5 font-mono truncate">{sub}</div>}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dark-800/50 last:border-0">
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className={`text-[11px] text-gray-300 text-right max-w-[60%] truncate ${mono ? "font-mono" : ""}`}>{value || "\u2014"}</span>
    </div>
  );
}

function FeatureBadge({ enabled, name }: { enabled: boolean; name: string }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${enabled ? "bg-green-900/20 text-green-400 border border-green-900/30" : "bg-dark-800 text-gray-600 border border-dark-700"}`}>
      {enabled ? <CheckCircle size={9} /> : <XCircle size={9} />}
      {name}
    </span>
  );
}

export default function WorkspacePage() {
  const { t } = useTranslation();
  const { data: sysData, isLoading } = useQuery({
    queryKey: ["system"],
    queryFn: () => getSystem().then((r: any) => r.data?.data || r.data || {}),
    refetchInterval: 30000,
  });

  const d = sysData?.doctor || {};
  const ws = sysData?.workspace || {};
  const features = sysData?.features || [];
  const models = sysData?.models || [];
  const skills = sysData?.skills || [];

  const isGit = ws.git_repo;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-whale-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-100">{t("workspace.title")}</h1>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-gray-600 font-mono truncate">{d.workspace || "\u2014"}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800 text-gray-500">
            v{d.version || "?"}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-900 border border-dark-800 text-gray-500 capitalize">
            {d.platform?.os || "?"} / {d.platform?.arch || "?"}
          </span>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
        <StatPill label={t("models.title")} value={models.length} color="text-whale-400" />
        <StatPill label={t("skills.title")} value={skills.length} color="text-purple-400" />
        <StatPill label={t("workspace.features")} value={features.filter((f: any) => f.enabled).length} color="text-green-400" sub={`/ ${features.length}`} />
        <StatPill label={t("workspace.gitStatus")} value={isGit ? ws.branch || "?" : t("workspace.noGit")} color={isGit ? "text-green-400" : "text-amber-400"} />
        <StatPill label={t("analytics.sessions")} value={d.storage?.spillover?.count || 0} color="text-blue-400" sub={t("workspace.spillover")} />
        <StatPill label={t("config.model")} value={d.default_text_model?.split("-").pop() || "?"} color="text-gray-300" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Info Card */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <Monitor size={15} className="text-blue-400" /> {t("workspace.system")}
          </h3>
          <div className="space-y-0">
            <InfoRow label={t("workspace.path")} value={d.workspace || ""} mono />
            <InfoRow label={t("workspace.configPath")} value={d.config_path || ""} mono />
            <InfoRow label={t("overview.baseUrlLabel")} value={d.base_url || ""} mono />
            <InfoRow label={t("workspace.apiKeySource")} value={d.api_key?.source || "-"} />
            <InfoRow label={t("config.model")} value={d.default_text_model || ""} />
            <InfoRow label={t("workspace.system")} value={`${d.platform?.os || "?"} / ${d.platform?.arch || "?"}`} />
            <InfoRow label={t("workspace.sandbox")} value={d.sandbox?.available ? d.sandbox.kind || t("workspace.available") : t("workspace.sandboxUnavailable")} />
          </div>
        </div>

        {/* Provider & Model Capability */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <Cpu size={15} className="text-whale-400" /> {t("models.title")} & Capability
          </h3>
          <div className="space-y-0">
            <InfoRow label="Provider" value={d.capability?.resolved_provider || ""} />
            <InfoRow label={t("config.model")} value={d.capability?.resolved_model || ""} />
            <InfoRow label={t("models.contextWindow")} value={d.capability?.context_window?.toLocaleString() || ""} />
            <InfoRow label={t("models.maxTokens")} value={d.capability?.max_output?.toLocaleString() || ""} />
            <InfoRow label="Payload Mode" value={d.capability?.request_payload_mode || ""} />
          </div>
          {/* Model list */}
          {models.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-800">
              <div className="text-[11px] text-gray-500 mb-2">{t("models.available")}</div>
              <div className="flex flex-wrap gap-1.5">
                {models.map((m: any) => (
                  <span key={m.name} className={`text-[10px] px-2 py-0.5 rounded-full ${m.is_default ? "bg-whale-600/20 text-whale-400 border border-whale-600/30" : "bg-dark-800 text-gray-500 border border-dark-700"}`}>
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <Zap size={15} className="text-amber-400" /> {t("workspace.features")}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {features.map((f: any) => (
              <FeatureBadge key={f.name} enabled={f.enabled} name={f.name.replace(/_/g, " ")} />
            ))}
          </div>
          {features.length === 0 && (
            <p className="text-[11px] text-gray-700">{t("common.noData")}</p>
          )}
        </div>

        {/* Git Status */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <GitBranch size={15} className={isGit ? "text-green-400" : "text-gray-600"} /> {t("workspace.gitStatus")}
          </h3>
          {isGit ? (
            <>
              <div className="mb-3">
                <span className="text-xs text-gray-500">Branch: </span>
                <span className="text-xs text-gray-300 font-mono">{ws.branch || "?"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-dark-900 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-green-400">{ws.staged || 0}</div>
                  <div className="text-[10px] text-gray-600">{t("workspace.staged")}</div>
                </div>
                <div className="bg-dark-900 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-amber-400">{ws.unstaged || 0}</div>
                  <div className="text-[10px] text-gray-600">{t("workspace.unstaged")}</div>
                </div>
                <div className="bg-dark-900 rounded-lg p-2.5 text-center">
                  <div className="text-base font-bold text-red-400">{ws.untracked || 0}</div>
                  <div className="text-[10px] text-gray-600">{t("workspace.untrackedLabel")}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-900/20 rounded px-3 py-2.5">
              <AlertCircle size={14} />
              {t("workspace.noGit")}
            </div>
          )}
        </div>

        {/* Skills Directories */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <FolderOpen size={15} className="text-purple-400" /> {t("skills.skillDirectories")}
          </h3>
          <div className="space-y-1">
            {d.skills && Object.entries(d.skills)
              .filter(([k]) => k !== "selected" && typeof d.skills[k] === "object")
              .map(([key, val]: [string, any]) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-dark-800/50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${val.present ? "bg-green-500" : "bg-gray-700"}`} />
                    <span className="text-xs text-gray-400 capitalize truncate">{key.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-[10px] text-gray-600 font-mono flex-shrink-0 ml-2">
                    {val.present ? `${val.count} skills` : t("skills.notFound")}
                  </span>
                </div>
              ))}
          </div>
          {/* {t("workspace.installedSkills")} quick list */}
          {skills.length > 0 && (
            <div className="mt-3 pt-3 border-t border-dark-800">
              <div className="text-[11px] text-gray-500 mb-2">{t("skills.installed")} ({skills.length})</div>
              <div className="flex flex-wrap gap-1">
                {skills.slice(0, 8).map((s: any) => (
                  <span key={s.name} className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-gray-500 font-mono">{s.name}</span>
                ))}
                {skills.length > 8 && <span className="text-[10px] text-gray-700">+{skills.length - 8} {t("workspace.more").replace("{count}", "")}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Storage */}
        <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
          <h3 className="text-sm font-medium text-gray-200 mb-3 flex items-center gap-2">
            <HardDrive size={15} className="text-blue-400" /> {t("workspace.storage")}
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2 border-b border-dark-800/50">
              <div className="flex items-center gap-2">
                <Database size={12} className="text-green-400" />
                <span className="text-xs text-gray-400">{t("workspace.spillover")}</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-300 font-mono">{d.storage?.spillover?.count || 0} {t("workspace.filesCount").replace("{count}", "")}</div>
                {d.storage?.spillover?.path && (
                  <div className="text-[9px] text-gray-700 font-mono truncate max-w-[180px]">{d.storage.spillover.path}</div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-dark-800/50">
              <div className="flex items-center gap-2">
                <FileText size={12} className="text-amber-400" />
                <span className="text-xs text-gray-400">{t("workspace.stash")}</span>
              </div>
              <span className="text-xs text-gray-300 font-mono">
                {d.storage?.stash?.present ? t("workspace.stashData") : t("workspace.stashEmpty")}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Box size={12} className="text-purple-400" />
                <span className="text-xs text-gray-400">{t("workspace.sandbox")}</span>
              </div>
              <span className={`text-xs font-mono ${d.sandbox?.available ? "text-green-400" : "text-red-400"}`}>
                {d.sandbox?.available ? d.sandbox.kind || t("workspace.available") : t("workspace.unavailable")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
