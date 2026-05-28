
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, Trash2, Pin, MessageSquare, Archive, ArrowUpDown, Check, X, AlertTriangle, MoreHorizontal, Clock, Bot, Sparkles, ChevronRight, PanelRightClose, PanelRight, Zap, Hash, DollarSign, FileText, Loader2, Wand2, Eraser } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSessions, deleteSession, togglePinSession, createSession, patchThread } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { formatRelativeTime, truncate } from "../utils/format";
import api from "../api/client";

interface SessionItem {
  id: string; title: string; description: string;
  updated_at: string; created_at?: string;
  model: string; mode: string;
  pinned: boolean; archived: boolean;
  latest_turn_status: string | null;
}

const STORAGE_AI_OPEN = "codewhale_sessions_ai_open";

export default function SessionsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterTab, setFilterTab] = useState<"all" | "active" | "archived">("all");
  const [sortBy, setSortBy] = useState<"updated" | "name">("updated");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [cleanLoading, setCleanLoading] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // AI Panel state
  const [aiOpen, setAiOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_AI_OPEN) === "true"; } catch { return false; }
  });
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  // Card AI state
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaryMap, setSummaryMap] = useState<Record<string, string>>({});
  const [titleSuggestId, setTitleSuggestId] = useState<string | null>(null);
  const [titleCandidates, setTitleCandidates] = useState<string[]>([]);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ["sessions", search],
    queryFn: () => getSessions({ search: search || undefined, limit: 100, include_archived: true }),
  });

  // Stats query
  const { data: statsData } = useQuery({
    queryKey: ["session-stats"],
    queryFn: async () => {
      try { const r = await api.get("/usage"); return r.data?.data?.totals || {}; } catch { return {}; }
    },
    refetchInterval: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSession(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); addToast({ type: "success", message: t("common.success") }); },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });

  const pinMutation = useMutation({
    mutationFn: (id: string) => togglePinSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => patchThread(id, { archived }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); addToast({ type: "success", message: t("common.success") }); },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });

  const cleanupMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = [];
      for (const id of ids) {
        try { await patchThread(id, { archived: true }); results.push(id); }
        catch (e) { console.warn('Failed to clean session', id, e); }
      }
      return results;
    },
    onSuccess: (results: string[]) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      addToast({ type: 'success', message: t('sessions.cleanSuccess', { count: results.length }) });
      setShowCleanConfirm(false);
      setCleanLoading(false);
    },
    onError: (err: Error) => { addToast({ type: 'error', message: err.message }); setCleanLoading(false); },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => patchThread(id, { title }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["sessions"] }); setEditingId(null); },
    onError: (err: Error) => addToast({ type: "error", message: err.message }),
  });

  const sessions: SessionItem[] = sessionsData?.data?.data?.filter
    ? sessionsData.data.data
    : Array.isArray(sessionsData?.data) ? sessionsData.data : [];

  const activeSessions = sessions.filter(s => !s.archived);
  const archivedSessions = sessions.filter(s => s.archived);
  const emptySessions = sessions.filter(s => !s.archived && (s.title === 'New Thread' || s.title === 'New Chat' || s.title === '') && !s.latest_turn_status);
  const stats = statsData || {};

  let filtered = filterTab === "active" ? activeSessions : filterTab === "archived" ? archivedSessions : sessions;
  if (search) { const q = search.toLowerCase(); filtered = filtered.filter(s => s.title.toLowerCase().includes(q) || s.model.toLowerCase().includes(q)); }
  if (sortBy === "name") filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
  else filtered = [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  filtered = [...filtered].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

  const handleNewSession = () => {
    navigate("/chat?new=1");
  };

  const toggleSelect = (id: string) => { const ns = new Set(selectedIds); ns.has(id) ? ns.delete(id) : ns.add(id); setSelectedIds(ns); };
  const selectAll = () => { if (selectedIds.size === filtered.length) setSelectedIds(new Set()); else setSelectedIds(new Set(filtered.map(s => s.id))); };
  const bulkDelete = () => { setDeleteConfirm("bulk"); setShowDeleteConfirm(true); };
  const confirmBulkDelete = () => { selectedIds.forEach(id => deleteMutation.mutate(id)); setSelectedIds(new Set()); setShowDeleteConfirm(false); };
  const confirmDeleteOne = () => { if (deleteConfirm) { deleteMutation.mutate(deleteConfirm); setDeleteConfirm(null); setShowDeleteConfirm(false); } };
  const handleDeleteClick = (id: string) => { setDeleteConfirm(id); setShowDeleteConfirm(true); };
  const handleStartEdit = (s: SessionItem) => { setEditingId(s.id); setEditTitle(s.title); setTimeout(() => editInputRef.current?.focus(), 50); };
  const handleSaveEdit = () => { if (editingId && editTitle.trim()) renameMutation.mutate({ id: editingId, title: editTitle.trim() }); };
  const handleRenameFromCandidate = (id: string, title: string) => { renameMutation.mutate({ id, title }); setTitleSuggestId(null); };

  // ������ AI Handlers ������

  const handleCleanEmpty = () => {
    if (emptySessions.length === 0) {
      addToast({ type: 'info', message: t('sessions.noEmptySessions') });
      return;
    }
    setShowCleanConfirm(true);
  };

  const confirmClean = () => {
    const ids = emptySessions.map(s => s.id);
    setCleanLoading(true);
    cleanupMutation.mutate(ids);
  };

  const handleAiSend = async (query?: string) => {
    const q = query || aiQuery.trim();
    if (!q || aiLoading) return;
    setAiQuery("");
    setAiMessages(prev => [...prev, { role: "user", content: q }]);
    setAiLoading(true);

    try {
      const res = await fetch("/api/sessions/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, mode: "quick" }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response");
      const decoder = new TextDecoder(); let buffer = "";
      let responseText = "";

      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.text) responseText = ev.text;
            if (ev.error) responseText = "Error: " + ev.error;
          } catch {}
        }
      }
      setAiMessages(prev => [...prev, { role: "assistant", content: responseText || t("sessions.ai.noResult") }]);
    } catch (err: any) {
      setAiMessages(prev => [...prev, { role: "assistant", content: "Error: " + (err.message || "unknown") }]);
    } finally { setAiLoading(false); }
  };

  const handleAiSummarize = async (id: string) => {
    setSummarizingId(id);
    try {
      const res = await api.post("/sessions/ai/summarize/" + id);
      const summary = res.data?.data?.summary || "";
      setSummaryMap(prev => ({ ...prev, [id]: summary }));
    } catch { addToast({ type: "error", message: "Summary failed" }); }
    finally { setSummarizingId(null); }
  };

  const handleAiTitleSuggest = async (id: string) => {
    setTitleSuggestId(id);
    setTitleCandidates([]);
    try {
      const res = await api.post("/sessions/ai/title/" + id);
      const titles = res.data?.data?.titles || [];
      setTitleCandidates(titles);
    } catch { addToast({ type: "error", message: "Title suggestion failed" }); }
  };

  // Render session ID links in AI responses
  const renderAiContent = (content: string) => {
    const parts = content.split(/(\[thr_[a-zA-Z0-9]+\])/g);
    return parts.map((part, i) => {
      if (part.match(/^\[thr_[a-zA-Z0-9]+\]$/)) {
        const id = part.slice(1, -1);
        const session = sessions.find(s => s.id === id);
        return (
          <button key={i} onClick={() => navigate("/chat/" + id)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-whale-500/10 text-whale-400 rounded text-[11px] hover:bg-whale-500/20 transition-colors mx-0.5">
            <MessageSquare size={10} /> {session?.title?.slice(0, 20) || id.slice(0, 10)}
          </button>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  useEffect(() => { localStorage.setItem(STORAGE_AI_OPEN, String(aiOpen)); }, [aiOpen]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">{t("sessions.title")}</h1>
            <p className="text-xs text-gray-600 mt-0.5">{sessions.length} sessions</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAiOpen(!aiOpen)}
              className={"flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors " + (aiOpen ? "bg-whale-500/10 border-whale-500/30 text-whale-400" : "border-dark-700 text-gray-600 hover:text-gray-400")}>
              <Sparkles size={12} /> AI
            </button>
            <div className="relative">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("sessions.search")}
                className="w-40 bg-dark-900 border border-dark-700 rounded pl-7 pr-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-whale-700" />
            </div>
            <button onClick={handleNewSession}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-whale-600 hover:bg-whale-500 rounded text-xs text-white transition-colors">
              <Plus size={12} /> {t("chat.newChat")}
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { icon: <Hash size={13} />, label: t("sessions.stats.total"), value: sessions.length, color: "text-gray-400" },
            { icon: <Zap size={13} />, label: t("sessions.stats.active"), value: activeSessions.length, color: "text-green-400" },
            { icon: <Archive size={13} />, label: t("sessions.stats.archived"), value: archivedSessions.length, color: "text-amber-400" },
            { icon: <FileText size={13} />, label: t("sessions.stats.tokens"), value: stats.input_tokens ? ((stats.input_tokens + stats.output_tokens) / 1000).toFixed(0) + "K" : "-", color: "text-blue-400" },
            { icon: <DollarSign size={13} />, label: t("sessions.stats.cost"), value: stats.cost_usd ? "$" + stats.cost_usd.toFixed(3) : "-", color: "text-purple-400" },
          ].map((s, i) => (
            <div key={i} className="bg-dark-900 border border-dark-700 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={s.color}>{s.icon}</span>
                <span className="text-[10px] text-gray-600">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-gray-200">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + sort */}
        <div className="flex items-center gap-1.5 mb-3">
          {(["all","active","archived"] as const).map(tab => (
            <button key={tab} onClick={() => setFilterTab(tab)}
              className={"px-2.5 py-1 rounded text-xs transition-colors " + (filterTab === tab ? "bg-dark-800 text-gray-300" : "text-gray-600 hover:text-gray-400")}>
              {tab === "all" ? "All" : tab === "active" ? t("threads.active") : t("threads.archived")}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1 mr-2">
                <span className="text-[10px] text-gray-500">{selectedIds.size} selected</span>
                <button onClick={bulkDelete} className="px-2 py-0.5 bg-red-900/20 text-red-400 rounded text-[10px] hover:bg-red-900/40 transition-colors">Delete</button>
              </div>
            )}
            <button onClick={() => setSortBy(sortBy === "updated" ? "name" : "updated")}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-gray-600 hover:text-gray-400 transition-colors">
              <ArrowUpDown size={10} /> {sortBy === "updated" ? "Date" : "Name"}
            </button>
            {emptySessions.length > 0 && (
              <button onClick={handleCleanEmpty}
                className="flex items-center gap-1 ml-1 px-2 py-1 bg-amber-900/20 hover:bg-amber-900/30 border border-amber-800/30 rounded text-[10px] text-amber-400 transition-colors"
                title={t("sessions.cleanTitle").replace("{count}", String(emptySessions.length))}>
                <Eraser size={10} />
                <span className="hidden sm:inline">{t("sessions.cleanEmpty")} ({emptySessions.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Session list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-600 text-sm">{t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <MessageSquare size={40} className="mb-3 opacity-30" />
            <p className="text-sm">{t("sessions.noSessions")}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(session => (
              <div key={session.id}
                className={"group relative flex flex-col px-3 py-2.5 rounded-lg transition-colors cursor-pointer " + (session.archived ? "bg-dark-900/50 border border-dark-800 opacity-80" : "bg-dark-950 border border-dark-700 hover:bg-dark-900")}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest("button")) return;
                  if (editingId === session.id) return;
                  navigate("/chat/" + session.id);
                }}>
                <div className="flex items-center gap-2">
                  {/* Checkbox */}
                  <button onClick={(e) => { e.stopPropagation(); toggleSelect(session.id); }}
                    className={"w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors " + (selectedIds.has(session.id) ? "bg-whale-500 border-whale-500" : "border-dark-700 hover:border-dark-600")}>
                    {selectedIds.has(session.id) && <Check size={10} className="text-white" />}
                  </button>
                  {/* Icon */}
                  <div className={"w-6 h-6 rounded flex items-center justify-center flex-shrink-0 " + (session.archived ? "bg-dark-800" : "bg-whale-600/20")}>
                    <MessageSquare size={12} className={session.archived ? "text-gray-600" : "text-whale-400"} />
                  </div>
                  {/* Title */}
                  <div className="min-w-0 flex-1">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <input ref={editInputRef} value={editTitle} onChange={e => setEditTitle(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          className="bg-dark-800 border border-dark-600 rounded px-1.5 py-0.5 text-xs text-gray-200 outline-none flex-1" />
                        <button onClick={handleSaveEdit} className="p-0.5 text-green-400 hover:bg-dark-700 rounded"><Check size={12} /></button>
                        <button onClick={() => setEditingId(null)} className="p-0.5 text-gray-600 hover:bg-dark-700 rounded"><X size={12} /></button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-200 truncate block">
                        {session.pinned && <Pin size={10} className="inline text-yellow-500 mr-1 -mt-0.5" />}
                        {session.title || t("common.unknown")}
                      </span>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => handleAiTitleSuggest(session.id)}
                      className="p-1 rounded text-gray-600 hover:text-whale-400 hover:bg-dark-800 transition-colors" title={t("sessions.ai.suggestTitle")}>
                      <Wand2 size={12} />
                    </button>
                    <button onClick={() => { setExpandedCard(expandedCard === session.id ? null : session.id); if (!summaryMap[session.id]) handleAiSummarize(session.id); }}
                      className="p-1 rounded text-gray-600 hover:text-whale-400 hover:bg-dark-800 transition-colors" title={t("sessions.ai.summarize")}>
                      <Sparkles size={12} />
                    </button>
                    <button onClick={() => pinMutation.mutate(session.id)}
                      className={"p-1 rounded transition-colors " + (session.pinned ? "text-yellow-500 bg-yellow-900/20" : "text-gray-600 hover:text-gray-400 hover:bg-dark-800")} title={t("sessions.pin")}>
                      <Pin size={12} />
                    </button>
                    <button onClick={() => handleStartEdit(session)}
                      className="p-1 rounded text-gray-600 hover:text-gray-400 hover:bg-dark-800 transition-colors" title={t("common.edit")}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => archiveMutation.mutate({ id: session.id, archived: !session.archived })}
                      className={"p-1 rounded transition-colors " + (session.archived ? "text-green-500 hover:bg-green-900/20" : "text-gray-600 hover:text-amber-500 hover:bg-dark-800")} title={session.archived ? t("threads.unarchive") : t("threads.archive")}>
                      <Archive size={12} />
                    </button>
                    <button onClick={() => handleDeleteClick(session.id)}
                      className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-colors" title={t("common.delete")}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {/* AI Summary expand */}
                {expandedCard === session.id && (
                  <div className="mt-2 pl-10" onClick={e => e.stopPropagation()}>
                    {summarizingId === session.id ? (
                      <div className="flex items-center gap-2 text-[11px] text-gray-600"><Loader2 size={11} className="animate-spin" />{t("sessions.ai.summaryLoading")}</div>
                    ) : summaryMap[session.id] ? (
                      <p className="text-[11px] text-gray-400 leading-relaxed bg-dark-900/50 border border-dark-700 rounded px-2.5 py-2">{summaryMap[session.id]}</p>
                    ) : null}
                  </div>
                )}

                {/* Title candidates popup */}
                {titleSuggestId === session.id && (
                  <div className="mt-2 pl-10" onClick={e => e.stopPropagation()}>
                    {titleCandidates.length === 0 ? (
                      <div className="flex items-center gap-2 text-[11px] text-gray-600"><Loader2 size={11} className="animate-spin" />{t("sessions.ai.titleLoading")}</div>
                    ) : (
                      <div className="bg-dark-900 border border-dark-700 rounded-lg p-2 space-y-1">
                        <p className="text-[10px] text-gray-500 mb-1">{t("sessions.ai.titleCandidates")}:</p>
                        {titleCandidates.map((title, i) => (
                          <button key={i} onClick={() => handleRenameFromCandidate(session.id, title)}
                            className="w-full text-left px-2 py-1 rounded text-[11px] text-gray-300 hover:bg-whale-500/10 hover:text-whale-400 transition-colors flex items-center justify-between group/title">
                            <span>{title}</span>
                            <span className="opacity-0 group-hover/title:opacity-100 text-[10px] text-whale-400">{t("sessions.ai.apply")}</span>
                          </button>
                        ))}
                        <button onClick={() => setTitleSuggestId(null)} className="w-full text-center text-[10px] text-gray-600 hover:text-gray-400 py-0.5">Cancel</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Meta row */}
                <div className="flex items-center gap-2 mt-1.5 pl-10 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-gray-500">{session.model?.split("-").pop() || session.model}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-dark-800 text-gray-500">{session.mode}</span>
                  {session.archived && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-500">{t("threads.archived")}</span>}
                  <span className="text-[10px] text-gray-700 ml-auto flex items-center gap-1"><Clock size={10} />{formatRelativeTime(session.updated_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
            <div className="w-full max-w-sm bg-dark-950 border border-dark-700 rounded-lg shadow-2xl p-5" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-900/20 flex items-center justify-center"><AlertTriangle size={18} className="text-red-400" /></div>
                <div>
                  <h3 className="text-sm font-medium text-gray-200">{t("settings.clearConfirm")}</h3>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {deleteConfirm === "bulk" ? `${t("sessions.confirmDelete")} (${selectedIds.size})` : t("threads.confirmDelete")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 rounded text-xs text-gray-400 transition-colors">{t("common.cancel")}</button>
                <button onClick={deleteConfirm === "bulk" ? confirmBulkDelete : confirmDeleteOne} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 border border-red-800/30 rounded text-xs text-red-400 transition-colors">{t("common.delete")}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      
      {/* Clean Empty Sessions Modal */}
      {showCleanConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCleanConfirm(false)}>
          <div className="w-full max-w-sm bg-dark-950 border border-dark-700 rounded-lg shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-900/20 flex items-center justify-center"><Eraser size={18} className="text-amber-400" /></div>
              <div>
                <h3 className="text-sm font-medium text-gray-200">{t("sessions.cleanEmpty")}</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">{`${t("sessions.cleanConfirm").replace("{count}", String(emptySessions.length))}`}</p>
              </div>
            </div>
            <div className="mb-4 max-h-32 overflow-y-auto">
              {emptySessions.slice(0, 5).map(s => (
                <div key={s.id} className="text-[11px] text-gray-500 py-0.5">{s.id.slice(0, 20)}... �� {t("sessions.emptySession")}</div>
              ))}
              {emptySessions.length > 5 && <div className="text-[11px] text-gray-600">...{t("sessions.andMore", { count: emptySessions.length - 5 })}</div>}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCleanConfirm(false)} className="px-3 py-1.5 bg-dark-800 hover:bg-dark-700 rounded text-xs text-gray-400 transition-colors">{t("common.cancel")}</button>
              <button onClick={confirmClean} disabled={cleanLoading}
                className="px-3 py-1.5 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-800/30 rounded text-xs text-amber-400 transition-colors disabled:opacity-50">
                {cleanLoading ? t("sessions.cleaning") : t("sessions.cleanConfirmBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
{/* AI Assistant Panel */}
      {aiOpen && (
        <div className="w-80 flex-shrink-0 border-l border-dark-800 bg-dark-950 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-dark-800">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-whale-400" />
              <span className="text-xs font-semibold text-gray-300">{t("sessions.ai.title")}</span>
            </div>
            <button onClick={() => setAiOpen(false)} className="p-1 text-gray-600 hover:text-gray-400 rounded">
              <PanelRightClose size={14} />
            </button>
          </div>

          {/* AI messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {aiMessages.length === 0 && (
              <div className="text-center py-8 text-gray-600">
                <Sparkles size={24} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">{t('sessions.ai.askPrompt')}</p>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                <div className={"max-w-[90%] rounded-lg px-3 py-2 text-xs " + (msg.role === "user" ? "bg-whale-600/20 text-whale-300" : "bg-dark-900 text-gray-300")}>
                  {msg.role === "assistant" ? renderAiContent(msg.content) : msg.content}
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-600 px-1">
                <Loader2 size={11} className="animate-spin" />{t("sessions.ai.thinking")}
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div className="px-3 py-2 border-t border-dark-800 flex flex-wrap gap-1.5">
            {[t("sessions.ai.preset_archive"), t("sessions.ai.preset_duplicates"), t("sessions.ai.preset_cleanup")].map(p => (
              <button key={p} onClick={() => handleAiSend(p)}
                className="px-2 py-1 bg-dark-900 border border-dark-700 rounded text-[10px] text-gray-500 hover:text-gray-300 hover:border-dark-600 transition-colors">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-dark-800">
            <div className="flex gap-1.5">
              <input value={aiQuery} onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAiSend(); }}
                placeholder={t("sessions.ai.placeholder")}
                className="flex-1 bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-xs text-gray-200 placeholder-gray-700 outline-none focus:border-whale-700"
                disabled={aiLoading} />
              <button onClick={() => handleAiSend()}
                disabled={!aiQuery.trim() || aiLoading}
                className="px-2.5 py-1.5 bg-whale-600 hover:bg-whale-500 disabled:opacity-30 rounded text-xs text-white transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

