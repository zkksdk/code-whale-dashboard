import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ListChecks, Plus, X, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, Play, Pause, ChevronDown, ChevronRight, Wrench, Shield, GitBranch, BarChart3, MessageSquare, Calendar, Hourglass, Zap, FileText } from "lucide-react";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { formatRelativeTime, formatTimestamp } from "../utils/format";
import api from "../api/client";
import PlanPanel, { PlanData, PlanStep } from "../components/Chat/PlanPanel";

// ── Types ──

interface TaskSummary {
  id: string; status: string; prompt_summary: string;
  model: string; mode: string;
  created_at: string; started_at?: string; ended_at?: string;
  duration_ms?: number; error?: string;
  thread_id?: string; turn_id?: string;
}

interface ChecklistItem { id: number; content: string; status: string; }

interface TaskChecklist { items: ChecklistItem[]; completion_pct: number; in_progress_id?: number; }

interface GateRecord { id: string; gate: string; command: string; exit_code?: number; status: string; classification: string; duration_ms: number; summary: string; log_path?: string; }

interface ToolCallSummary { id: string; name: string; status: string; started_at: string; ended_at?: string; duration_ms?: number; input_summary?: string; output_summary?: string; }

interface TimelineEntry { timestamp: string; kind: string; summary: string; }

interface TaskRecord extends TaskSummary {
  workspace?: string; allow_shell?: boolean; trust_mode?: boolean; auto_approve?: boolean;
  checklist?: TaskChecklist; gates?: GateRecord[];
  tool_calls?: ToolCallSummary[]; timeline?: TimelineEntry[];
  result_summary?: string;
}

interface TaskCounts { queued: number; running: number; completed: number; failed: number; canceled: number; }

// ── Status config ──

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-gray-500/20 text-gray-400",
  running: "bg-blue-500/20 text-blue-400",
  completed: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  canceled: "bg-amber-500/20 text-amber-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock size={14} className="text-gray-400" />,
  running: <Loader2 size={14} className="text-blue-400 animate-spin" />,
  completed: <CheckCircle2 size={14} className="text-green-400" />,
  failed: <XCircle size={14} className="text-red-400" />,
  canceled: <AlertCircle size={14} className="text-amber-400" />,
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued", running: "Running", completed: "Completed", failed: "Failed", canceled: "Canceled",
};

function formatDuration(ms?: number): string {
  if (!ms) return "--";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// ── Component ──

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"list" | "plan">("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createPrompt, setCreatePrompt] = useState("");
  const [createModel, setCreateModel] = useState("");
  const [createWorkspace, setCreateWorkspace] = useState("");

  // ── Plan Tab State ──
  const [planThreadId, setPlanThreadId] = useState("");
  const [planData, setPlanData] = useState<PlanData>({ steps: [] });
  const [todos, setTodos] = useState<{ content: string; status: string }[]>([]);

  // ── Queries ──
  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: () => api.get("/tasks"),
    refetchInterval: 10000,
  });

  const { data: taskDetail } = useQuery({
    queryKey: ["task", selectedTask?.id],
    queryFn: () => api.get(`/tasks/${selectedTask?.id}`),
    enabled: !!selectedTask?.id,
  });

  const { data: sessionsList } = useQuery({
    queryKey: ["sessions-list"],
    queryFn: () => api.get("/sessions", { params: { limit: 50 } }),
  });

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: (data: { prompt: string; model?: string; workspace?: string }) => api.post("/tasks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      addToast({ type: "success", message: t("tasksPage.created") });
      setShowCreate(false); setCreatePrompt(""); setCreateModel(""); setCreateWorkspace("");
    },
    onError: (err: any) => addToast({ type: "error", message: err.message || t("tasksPage.createFailed") }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/tasks/${id}/cancel`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      if (selectedTask?.id) queryClient.invalidateQueries({ queryKey: ["task", selectedTask.id] });
      addToast({ type: "success", message: "Task canceled" });
    },
    onError: (err: any) => addToast({ type: "error", message: err.message || t("tasksPage.cancelFailed") }),
  });

  // ── Data ──
  const tasks: TaskSummary[] = tasksData?.data?.data || [];
  const counts: TaskCounts = tasksData?.data?.counts || { queued: 0, running: 0, completed: 0, failed: 0, canceled: 0 };
  const detail: TaskRecord | null = taskDetail?.data?.data || null;
  const sessions: any[] = sessionsList?.data?.data || [];

  useEffect(() => { if (detail && selectedTask) setSelectedTask(detail); }, [detail]);

  // ── Plan Tab: Listen for SSE plan/todo events ──
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data) return;
      try {
        const p = typeof data === "string" ? JSON.parse(data) : data;
        if (p.todos && Array.isArray(p.todos)) setTodos(p.todos);
        if (p.plan) setPlanData({ explanation: p.plan.explanation, steps: p.plan.steps || p.plan });
        if (p.steps && Array.isArray(p.steps)) setPlanData({ explanation: p.explanation || "", steps: p.steps });
      } catch {}
    };
    window.addEventListener("ws-message", handler);
    return () => window.removeEventListener("ws-message", handler);
  }, []);

  // ── Filter ──
  const filtered = statusFilter === "all" ? tasks : tasks.filter(t => t.status === statusFilter);

  // ── Count Stat Card ──
  const StatCard = ({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) => (
    <div className="bg-dark-900/50 border border-dark-800 rounded-lg p-3 flex items-center gap-3">
      <div className={`p-1.5 rounded-md ${color}`}>{icon}</div>
      <div>
        <div className="text-[10px] text-gray-600">{label}</div>
        <div className="text-lg font-bold text-gray-200">{value}</div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-100">{t("tasks.title")}</h1>
            <p className="text-xs text-gray-600">{tasks.length} tasks</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-dark-900 border border-dark-700 rounded-lg p-0.5">
              <button onClick={() => setActiveTab("list")} className={`px-3 py-1 rounded text-xs transition-colors ${activeTab === "list" ? "bg-dark-700 text-gray-200" : "text-gray-600 hover:text-gray-400"}`}>
                <ListChecks size={12} className="inline mr-1" />Tasks
              </button>
              <button onClick={() => setActiveTab("plan")} className={`px-3 py-1 rounded text-xs transition-colors ${activeTab === "plan" ? "bg-dark-700 text-gray-200" : "text-gray-600 hover:text-gray-400"}`}>
                <GitBranch size={12} className="inline mr-1" />Plan
              </button>
            </div>
            {activeTab === "list" && (
              <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-whale-600 hover:bg-whale-500 rounded text-xs text-white transition-colors">
                <Plus size={12} /> {t("tasks.newTask")}
              </button>
            )}
          </div>
        </div>

        {activeTab === "list" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-3 mb-4">
              <StatCard label={t("tasksPage.status.queued")} value={counts.queued} color="bg-gray-500/20 text-gray-400" icon={<Clock size={14} />} />
              <StatCard label={t("tasksPage.status.running")} value={counts.running} color="bg-blue-500/20 text-blue-400" icon={<Loader2 size={14} className="animate-spin" />} />
              <StatCard label={t("tasksPage.status.completed")} value={counts.completed} color="bg-green-500/20 text-green-400" icon={<CheckCircle2 size={14} />} />
              <StatCard label={t("tasksPage.status.failed")} value={counts.failed} color="bg-red-500/20 text-red-400" icon={<XCircle size={14} />} />
              <StatCard label={t("tasksPage.status.canceled")} value={counts.canceled} color="bg-amber-500/20 text-amber-400" icon={<AlertCircle size={14} />} />
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              {["all", "queued", "running", "completed", "failed", "canceled"].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors capitalize ${statusFilter === s ? "bg-dark-800 text-gray-300" : "text-gray-600 hover:text-gray-400"}`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Task list */}
            {isLoading ? (
              <div className="text-center py-12 text-gray-600"><Loader2 size={24} className="animate-spin mx-auto mb-2" /><p className="text-xs">Loading...</p></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <ListChecks size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">No tasks</p>
                <p className="text-[10px] mt-1">Create a task via the TUI or this dashboard</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(task => (
                  <div key={task.id}
                    onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                    className={`bg-dark-900/50 border rounded-lg p-4 cursor-pointer transition-all hover:border-dark-700 ${selectedTask?.id === task.id ? "border-whale-600/50 bg-dark-900" : "border-dark-800"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={STATUS_COLORS[task.status] + " text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"}>
                            {STATUS_ICONS[task.status]} {STATUS_LABELS[task.status]}
                          </span>
                          <span className="text-[10px] text-gray-600 font-mono">{task.id.slice(0, 10)}</span>
                        </div>
                        <p className="text-sm text-gray-300 truncate">{task.prompt_summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-600">
                          <span className="flex items-center gap-1"><Zap size={10} />{task.model}</span>
                          <span>{task.mode}</span>
                          {task.duration_ms != null && <span>{formatDuration(task.duration_ms)}</span>}
                          <span>{formatRelativeTime(task.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {task.status === "queued" || task.status === "running" ? (
                          <button onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(task.id); }}
                            className="p-1 text-gray-600 hover:text-red-400 transition-colors" title="Cancel">
                            <Pause size={13} />
                          </button>
                        ) : null}
                        <ChevronRight size={14} className={`text-gray-600 transition-transform ${selectedTask?.id === task.id ? "rotate-90" : ""}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Plan Tab ── */}
        {activeTab === "plan" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Thread:</label>
              <select value={planThreadId} onChange={e => setPlanThreadId(e.target.value)}
                className="bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-xs text-gray-300 outline-none focus:border-whale-700">
                <option value="">-- Select a thread --</option>
                {sessions.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title?.slice(0, 60) || s.id?.slice(0, 10)}</option>
                ))}
              </select>
            </div>
            {!planThreadId ? (
              <div className="text-center py-16 text-gray-600">
                <GitBranch size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a thread to view its plan</p>
              </div>
            ) : (
              <div className="space-y-4">
                <PlanPanel plan={planData} />
                {todos.length > 0 && (
                  <div className="bg-dark-900/30 border border-dark-800 rounded-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-dark-800 bg-dark-900/50">
                      <ListChecks size={13} className="text-blue-400" />
                      <span className="text-xs font-semibold text-gray-300">Todos</span>
                    </div>
                    <ul className="py-1">
                      {todos.map((todo: any, i: number) => (
                        <li key={i} className={`flex items-center gap-2 px-3 py-2 border-b border-dark-800/50 text-xs ${todo.status === "completed" ? "opacity-60" : ""}`}>
                          <span className="flex-shrink-0">
                            {todo.status === "completed" ? <CheckCircle2 size={13} className="text-green-400" />
                              : todo.status === "in_progress" ? <Loader2 size={13} className="text-blue-400 animate-spin" />
                              : <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />}
                          </span>
                          <span className={`flex-1 ${todo.status === "completed" ? "line-through" : ""}`}>{todo.content}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Task Detail Panel ── */}
      {selectedTask && (
        <div className="w-96 flex-shrink-0 border-l border-dark-800 overflow-y-auto bg-dark-950">
          <div className="flex items-center justify-between p-3 border-b border-dark-800">
            <h3 className="text-sm font-semibold text-gray-300">Task Detail</h3>
            <button onClick={() => setSelectedTask(null)} className="p-0.5 text-gray-600 hover:text-gray-400"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-4">
            {/* Basic info */}
            <div>
              <span className={STATUS_COLORS[selectedTask.status] + " text-[10px] px-1.5 py-0.5 rounded font-medium inline-flex items-center gap-1 mb-2"}>
                {STATUS_ICONS[selectedTask.status]} {STATUS_LABELS[selectedTask.status]}
              </span>
              <p className="text-sm text-gray-200 mb-3">{selectedTask.prompt_summary}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-gray-600">Model:</span> <span className="text-gray-400">{selectedTask.model}</span></div>
                <div><span className="text-gray-600">Mode:</span> <span className="text-gray-400">{selectedTask.mode}</span></div>
                {selectedTask.workspace && <div className="col-span-2"><span className="text-gray-600">Workspace:</span> <span className="text-gray-400 font-mono">{selectedTask.workspace}</span></div>}
                <div><span className="text-gray-600">Created:</span> <span className="text-gray-400">{formatTimestamp(selectedTask.created_at)}</span></div>
                <div><span className="text-gray-600">Duration:</span> <span className="text-gray-400">{formatDuration(selectedTask.duration_ms)}</span></div>
                {selectedTask.thread_id && <div className="col-span-2"><span className="text-gray-600">Thread:</span> <span className="text-gray-400 font-mono">{selectedTask.thread_id}</span></div>}
                {selectedTask.error && <div className="col-span-2 text-red-400">{selectedTask.error}</div>}
              </div>
            </div>

            {/* Checklist */}
            {selectedTask.checklist && selectedTask.checklist.items && selectedTask.checklist.items.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ListChecks size={13} className="text-blue-400" />
                  <span className="text-xs font-semibold text-gray-400">{t("tasksPage.checklist")}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{selectedTask.checklist.completion_pct}%</span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-1.5 mb-2">
                  <div className="bg-whale-500 h-1.5 rounded-full transition-all" style={{ width: `${selectedTask.checklist.completion_pct}%` }} />
                </div>
                <div className="space-y-1">
                  {selectedTask.checklist.items.map(item => (
                    <div key={item.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${item.status === "completed" ? "opacity-50" : ""}`}>
                      {item.status === "completed" ? <CheckCircle2 size={12} className="text-green-400 flex-shrink-0" />
                        : item.status === "in_progress" ? <Loader2 size={12} className="text-blue-400 animate-spin flex-shrink-0" />
                        : <div className="w-3 h-3 rounded-full border border-gray-600 flex-shrink-0" />}
                      <span className="text-gray-400">{item.content}</span>
                      <span className="text-[10px] text-gray-600 ml-auto">{item.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gates */}
            {selectedTask.gates && selectedTask.gates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={13} className="text-purple-400" />
                  <span className="text-xs font-semibold text-gray-400">{t("tasksPage.gates")}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{selectedTask.gates.length}</span>
                </div>
                <div className="space-y-2">
                  {selectedTask.gates.map(g => (
                    <div key={g.id} className="bg-dark-900/50 border border-dark-800 rounded p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-300 font-medium">{g.gate}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${g.status === "success" ? "bg-green-500/20 text-green-400" : g.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>{g.status}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono truncate">{g.command}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-600">
                        {g.exit_code != null && <span>exit: {g.exit_code}</span>}
                        <span>{g.duration_ms}ms</span>
                        <span>{g.classification}</span>
                      </div>
                      {g.summary && <p className="text-[10px] text-gray-400 mt-1">{g.summary}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tool Calls */}
            {selectedTask.tool_calls && selectedTask.tool_calls.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wrench size={13} className="text-amber-400" />
                  <span className="text-xs font-semibold text-gray-400">{t("tasksPage.toolCalls")}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{selectedTask.tool_calls.length}</span>
                </div>
                <div className="space-y-1.5">
                  {selectedTask.tool_calls.map(tc => (
                    <div key={tc.id} className="bg-dark-900/50 border border-dark-800 rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 font-mono">{tc.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${tc.status === "success" ? "bg-green-500/20 text-green-400" : tc.status === "failed" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}>{tc.status}</span>
                      </div>
                      {tc.input_summary && <p className="text-[10px] text-gray-500 mt-1 truncate">{tc.input_summary}</p>}
                      {tc.output_summary && <p className="text-[10px] text-gray-400 mt-0.5 truncate">{tc.output_summary}</p>}
                      {tc.duration_ms != null && <span className="text-[10px] text-gray-600">{formatDuration(tc.duration_ms)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {selectedTask.timeline && selectedTask.timeline.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 size={13} className="text-green-400" />
                  <span className="text-xs font-semibold text-gray-400">{t("tasksPage.timeline")}</span>
                  <span className="text-[10px] text-gray-600 ml-auto">{selectedTask.timeline.length} {t("tasksPage.events").replace("{count}", String(selectedTask.timeline.length))}</span>
                </div>
                <div className="space-y-1.5 border-l-2 border-dark-800 pl-3">
                  {selectedTask.timeline.map((e, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[19px] top-1.5 w-2 h-2 rounded-full bg-dark-700 border border-dark-600" />
                      <div className="text-[10px] text-gray-500">{formatTimestamp(e.timestamp)}</div>
                      <div className="text-xs"><span className="text-gray-500 font-medium">{e.kind}</span> <span className="text-gray-400">{e.summary}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancel button */}
            {(selectedTask.status === "queued" || selectedTask.status === "running") && (
              <button onClick={() => cancelMutation.mutate(selectedTask.id)}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs transition-colors border border-red-600/30">
                <Pause size={12} /> Cancel Task
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Create Task Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
          <div className="bg-dark-950 border border-dark-700 rounded-lg shadow-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-200">{t("tasks.newTask")}</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-600 hover:text-gray-400"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Prompt *</label>
                <textarea value={createPrompt} onChange={e => setCreatePrompt(e.target.value)}
                  placeholder="Describe what the task should do..."
                  className="w-full bg-dark-900 border border-dark-700 rounded px-3 py-2 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-whale-700 resize-none h-24" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t("tasksPage.modelOptional")}</label>
                  <input value={createModel} onChange={e => setCreateModel(e.target.value)}
                    placeholder="deepseek-v4-pro"
                    className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-whale-700" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">{t("tasksPage.workspaceOptional")}</label>
                  <input value={createWorkspace} onChange={e => setCreateWorkspace(e.target.value)}
                    placeholder="(default)"
                    className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-xs text-gray-300 placeholder-gray-700 outline-none focus:border-whale-700" />
                </div>
              </div>
              <button onClick={() => createPrompt.trim() && createMutation.mutate({ prompt: createPrompt.trim(), model: createModel || undefined, workspace: createWorkspace || undefined })}
                disabled={!createPrompt.trim() || createMutation.isPending}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-whale-600 hover:bg-whale-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-xs text-white transition-colors">
                {createMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}