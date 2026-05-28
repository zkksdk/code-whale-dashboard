import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FolderOpen, CheckCircle, XCircle, Puzzle, Wrench, BookOpen,
  Search, Download, Trash2, Eye, ToggleLeft, ToggleRight,
  RefreshCw, AlertTriangle, Code, Plus, X,
  List, PackageOpen, Globe
} from "lucide-react";
import { getSkills, getSkill, installSkill, uninstallSkill, toggleSkill, getCuratedSkills } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";

interface SkillItem {
  name: string;
  description: string;
  path: string;
  enabled: boolean;
  hasSkillMd?: boolean;
  hasReadme?: boolean;
}

interface SkillDetail {
  name: string;
  path: string;
  enabled: boolean;
  description: string;
  skillMd: string | null;
  readme: string | null;
  files: { name: string; isDir: boolean }[];
}

interface CuratedSkill {
  name: string;
  description: string;
  repo: string;
  subpath: string;
  installed: boolean;
}

interface SkillDir { path?: string; present?: boolean; count?: number; }

function DirCard({ label, icon, dir, sourcePath, notFoundLabel, skillsCountLabel }: {
  label: string; icon: React.ReactNode; dir?: SkillDir; sourcePath?: string;
  notFoundLabel: string; skillsCountLabel: string;
}) {
  const present = dir?.present ?? false;
  const count = dir?.count ?? 0;
  const displayPath = dir?.path || sourcePath || "";
  return (
    <div className={`bg-dark-950 border rounded-lg p-3 transition-colors ${present ? "border-dark-700" : "border-dark-800 opacity-60"}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded flex items-center justify-center ${present ? "bg-whale-600/20" : "bg-dark-800"}`}>{icon}</div>
        <div>
          <span className="text-sm font-medium text-gray-200">{label}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {present ? <CheckCircle size={10} className="text-green-400" /> : <XCircle size={10} className="text-gray-600" />}
            <span className={`text-[11px] ${present ? "text-green-400" : "text-gray-600"}`}>{present ? skillsCountLabel.replace("{count}", String(count)) : notFoundLabel}</span>
          </div>
        </div>
      </div>
      {displayPath && <p className="text-[10px] text-gray-700 font-mono truncate">{displayPath}</p>}
    </div>
  );
}

function SkillCard({ skill, onView, onToggle, onDelete, t }: {
  skill: SkillItem; onView: () => void; onToggle: () => void; onDelete: () => void; t: (k: string) => string;
}) {
  return (
    <div className="bg-dark-900 border border-dark-800 rounded-lg p-4 hover:border-dark-700 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-200 text-sm">{skill.name}</span>
            {skill.enabled !== false ? (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{skill.description || t("common.noData")}</p>
          <p className="text-[10px] text-gray-700 font-mono mt-1.5 truncate">{skill.path}</p>
        </div>
        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onView} className="p-1.5 hover:bg-dark-700 rounded text-gray-500 hover:text-gray-300" title={t("skills.viewDetails")}>
            <Eye size={14} />
          </button>
          <button onClick={onToggle} className="p-1.5 hover:bg-dark-700 rounded text-gray-500 hover:text-gray-300" title={t("skills.toggle")}>
            {skill.enabled !== false ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <button onClick={onDelete} className="p-1.5 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400" title={t("skills.uninstall")}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function SkillDetailPanel({ detail, onClose, t }: { detail: SkillDetail; onClose: () => void; t: (k: string) => string }) {
  const content = detail.skillMd || detail.readme || null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] bg-dark-950 border border-dark-700 rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
          <div>
            <span className="text-sm font-medium text-gray-200">{detail.name}</span>
            <span className="text-[11px] text-gray-600 ml-2">{detail.files.length} {t("skills.files")}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded text-gray-500 hover:text-gray-300">
            <X size={14} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-57px)]">
          {content ? (
            <div className="prose prose-invert prose-sm max-w-none
              prose-headings:text-gray-200 prose-headings:font-medium
              prose-h1:text-base prose-h2:text-sm prose-h3:text-xs
              prose-p:text-xs prose-p:text-gray-400 prose-p:leading-relaxed
              prose-code:text-[11px] prose-code:text-whale-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-800
              prose-a:text-whale-400 prose-a:no-underline hover:prose-a:underline
              prose-ul:text-xs prose-ol:text-xs prose-li:text-gray-400
              prose-strong:text-gray-300 prose-blockquote:border-whale-600 prose-blockquote:text-gray-500
              prose-hr:border-dark-800
              prose-table:text-xs prose-th:text-gray-300 prose-td:text-gray-400">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <BookOpen size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-xs">{t("skills.noSkillMd")}</p>
            </div>
          )}
          {detail.files.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-800">
              <h4 className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-2">{t("skills.files")}</h4>
              <div className="space-y-1">
                {detail.files.map(f => (
                  <div key={f.name} className="flex items-center gap-2 text-xs text-gray-500">
                    {f.isDir ? <FolderOpen size={12} className="text-amber-500" /> : <Code size={12} className="text-blue-500" />}
                    <span className="font-mono text-[11px]">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InstallModal({ onClose, t }: { onClose: () => void; t: (k: string) => string }) {
  const [url, setUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"url" | "browse">("browse");
  const [curatedSearch, setCuratedSearch] = useState("");
  const queryClient = useQueryClient();
  const { addToast } = useStore();

  const installMut = useMutation({
    mutationFn: (repoUrl: string) => installSkill(repoUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      addToast({ type: "success", message: t("skills.installSuccess") });
      onClose();
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: `${t("skills.installFailed")}: ${err.message}` });
    },
  });

  const { data: curatedData, isLoading: curatedLoading } = useQuery({
    queryKey: ["curated-skills"],
    queryFn: () => getCuratedSkills().then((r: any) => r.data?.data || r.data || []),
  });

  const curated: CuratedSkill[] = curatedData || [];

  const filteredCurated = curated.filter(s =>
    !curatedSearch || s.name.toLowerCase().includes(curatedSearch.toLowerCase()) ||
    s.description.toLowerCase().includes(curatedSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/60" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80vh] bg-dark-950 border border-dark-700 rounded-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
          <h3 className="text-sm font-medium text-gray-200">{t("skills.installSkill")}</h3>
          <button onClick={onClose} className="p-1 hover:bg-dark-800 rounded text-gray-500 hover:text-gray-300"><X size={14} /></button>
        </div>

        <div className="flex border-b border-dark-800">
          <button onClick={() => setActiveTab("browse")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${activeTab === "browse" ? "text-whale-400 border-b-2 border-whale-400" : "text-gray-600 hover:text-gray-400"}`}>
            <List size={13} /> {t("skills.browseCurated")}
          </button>
          <button onClick={() => setActiveTab("url")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${activeTab === "url" ? "text-whale-400 border-b-2 border-whale-400" : "text-gray-600 hover:text-gray-400"}`}>
            <Globe size={13} /> {t("skills.githubUrl")}
          </button>
        </div>

        {activeTab === "url" ? (
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{t("skills.githubUrl")}</label>
              <input type="text" value={url} onChange={e => setUrl(e.target.value)}
                placeholder={t("skills.githubUrlPlaceholder")}
                className="w-full mt-1 bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-whale-500" />
            </div>
            <button onClick={() => installMut.mutate(url)} disabled={!url.trim() || installMut.isPending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-whale-600 hover:bg-whale-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors">
              <Download size={14} />
              {installMut.isPending ? t("skills.installing") : t("skills.installFromUrl")}
            </button>
          </div>
        ) : (
          <div className="p-4">
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input type="text" value={curatedSearch} onChange={e => setCuratedSearch(e.target.value)}
                placeholder={t("skills.searchCurated")}
                className="w-full bg-dark-800 border border-dark-600 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-whale-500" />
            </div>
            {curatedLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={20} className="animate-spin text-gray-500" />
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {filteredCurated.map(skill => (
                  <div key={skill.name} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${skill.installed ? "bg-green-900/10 border-green-800/30" : "bg-dark-800/50 border-dark-700 hover:border-dark-600"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-200">{skill.name}</span>
                        {skill.installed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-900/40 text-green-400 font-medium">{t("skills.installed")}</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{skill.description}</p>
                    </div>
                    <button
                      onClick={() => installMut.mutate(skill.repo)}
                      disabled={skill.installed || installMut.isPending}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium transition-colors ${skill.installed ? "bg-dark-700 text-gray-600 cursor-not-allowed" : "bg-whale-600 hover:bg-whale-500 text-white"}`}>
                      <Download size={12} />
                      {skill.installed ? t("skills.installed") : installMut.isPending ? "..." : t("skills.install")}
                    </button>
                  </div>
                ))}
                {filteredCurated.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <PackageOpen size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-xs">{t("skills.noMatchingSkills")}</p>
                  </div>
                )}
              </div>
            )}
            <p className="text-[10px] text-gray-700 mt-3 text-center">
              {t("skills.curatedSource")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: () => getSkills().then((r: any) => r.data?.data || r.data || {}),
    refetchInterval: 30000,
  });

  const deleteMut = useMutation({
    mutationFn: (name: string) => uninstallSkill(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      addToast({ type: "success", message: t("skills.uninstalled") });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: `${t("skills.deleteFailed")}: ${err.message}` });
    },
  });

  const toggleMut = useMutation({
    mutationFn: (name: string) => toggleSkill(name),
    onSuccess: (res: any) => {
      const result = res.data?.data || res.data || {};
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      const action = result.enabled ? t("skills.enabled_verb") : t("skills.disabled_verb");
      addToast({ type: "success", message: `"${result.name}" ${action}` });
    },
    onError: (err: Error) => {
      addToast({ type: "error", message: `Toggle: ${err.message}` });
    },
  });

  const handleView = async (name: string) => {
    try {
      const r = await getSkill(name);
      const detail = (r as any).data?.data || (r as any).data;
      setSelectedSkill(detail);
    } catch {
      addToast({ type: "error", message: `${t("skills.loadingFailed")} ${name}` });
    }
  };

  const skills: SkillItem[] = data?.skills || [];
  const dirs = data?.directories || {};
  const plugins = data?.plugins || {};
  const tools = data?.tools || {};
  const warnings = data?.warnings || [];
  const directory = data?.directory || "";
  const total = data?.total ?? skills.length;
  const enabledCount = data?.enabledCount ?? skills.filter((s: SkillItem) => s.enabled !== false).length;

  const filtered = skills.filter((s: SkillItem) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  const subtitle = t("skills.subtitle").replace("{total}", String(total)).replace("{enabled}", String(enabledCount));
  const notFoundLabel = t("skills.notFound");
  const skillsCountLabel = t("skills.skillsCount");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">{t("skills.title")}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>
        </div>
        <button onClick={() => setShowInstall(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-whale-600 hover:bg-whale-500 rounded-lg text-xs font-medium transition-colors">
          <Plus size={14} /> {t("skills.install")}
        </button>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-4 gap-2">
          <StatBadge label={t("skills.total")} value={total} color="text-gray-200" />
          <StatBadge label={t("skills.enabled")} value={enabledCount} color="text-green-400" />
          <StatBadge label={t("skills.disabled")} value={total - enabledCount} color="text-gray-600" />
          <StatBadge label={t("skills.warnings")} value={warnings.length} color={warnings.length > 0 ? "text-amber-400" : "text-gray-600"} />
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-800/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-amber-400" /><span className="text-xs font-medium text-amber-400">{t("skills.warnings")}</span></div>
            {warnings.map((w: string, i: number) => <p key={i} className="text-[11px] text-amber-500/80">{w}</p>)}
          </div>
        )}

        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors">
            <FolderOpen size={12} /> {t("skills.skillDirectories")}
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            <DirCard label={t("skills.global")} icon={<FolderOpen size={14} className="text-whale-400" />} dir={dirs.global} sourcePath="~/.deepseek/skills" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
            <DirCard label={t("skills.workspaceAgents")} icon={<Puzzle size={14} className="text-purple-400" />} dir={dirs.agents} sourcePath=".agents/skills" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
            <DirCard label={t("skills.agentsGlobal")} icon={<Puzzle size={14} className="text-purple-400" />} dir={dirs.agents_global} sourcePath="~/.agents/skills" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
            <DirCard label={t("skills.openCode")} icon={<BookOpen size={14} className="text-blue-400" />} dir={dirs.opencode} sourcePath=".opencode/skills" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
            <DirCard label={t("skills.claude")} icon={<BookOpen size={14} className="text-orange-400" />} dir={dirs.claude} sourcePath=".claude/skills" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
            <DirCard label={t("skills.local")} icon={<FolderOpen size={14} className="text-yellow-400" />} dir={dirs.local} sourcePath="skills/" notFoundLabel={notFoundLabel} skillsCountLabel={skillsCountLabel} />
          </div>
        </details>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><Puzzle size={16} className="text-purple-400" /><span className="text-sm font-medium text-gray-200">{t("skills.plugins")}</span></div>
            {plugins.present ? (<div><span className="text-2xl font-semibold text-gray-100">{plugins.count || 0}</span><span className="text-xs text-gray-600 ml-1">{t("skills.installed_plugins")}</span></div>) : plugins.path ? <p className="text-xs text-gray-600">{t("skills.noPlugins")}</p> : <p className="text-xs text-gray-600">{t("skills.noPlugins")}</p>}
            {plugins.path && <p className="text-[10px] text-gray-700 font-mono mt-1 truncate">{plugins.path}</p>}
          </div>
          <div className="bg-dark-900 border border-dark-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2"><Wrench size={16} className="text-amber-400" /><span className="text-sm font-medium text-gray-200">{t("skills.tools")}</span></div>
            {tools.present ? (<div><span className="text-2xl font-semibold text-gray-100">{tools.count || 0}</span><span className="text-xs text-gray-600 ml-1">{t("skills.available_tools")}</span></div>) : tools.path ? <p className="text-xs text-gray-600">{t("skills.noTools")}</p> : <p className="text-xs text-gray-600">{t("skills.noTools")}</p>}
            {tools.path && <p className="text-[10px] text-gray-700 font-mono mt-1 truncate">{tools.path}</p>}
          </div>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t("skills.search")}
            className="w-full bg-dark-900 border border-dark-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-whale-500" />
        </div>

        <div>
          <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {t("skills.title")} {directory && <span className="normal-case text-[10px] font-mono text-gray-700 ml-2">{directory}</span>}
          </h2>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <FolderOpen size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">{search ? t("skills.noMatchingSkills") : t("skills.noSkills")}</p>
              {!search && <button onClick={() => setShowInstall(true)} className="mt-3 text-xs text-whale-400 hover:text-whale-300">{t("skills.installPrompt")}</button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {filtered.map((skill: SkillItem) => (
                <SkillCard key={skill.name} skill={skill} t={t}
                  onView={() => handleView(skill.name)}
                  onToggle={() => toggleMut.mutate(skill.name)}
                  onDelete={() => { if (confirm(t("skills.uninstallConfirm").replace("{name}", skill.name))) deleteMut.mutate(skill.name); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedSkill && <SkillDetailPanel detail={selectedSkill} onClose={() => setSelectedSkill(null)} t={t} />}
      {showInstall && <InstallModal onClose={() => setShowInstall(false)} t={t} />}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-dark-900 border border-dark-800 rounded-lg p-3 text-center">
      <span className={`text-xl font-semibold ${color}`}>{value}</span>
      <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
    </div>
  );
}
