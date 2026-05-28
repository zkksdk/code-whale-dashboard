
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Send, Bot, User, Copy, Brain, ChevronDown, ChevronRight, StopCircle, Plus, Wifi, WifiOff, Check, MessageSquare, X, Search, ListTodo, GanttChartSquare, FolderOpen, Edit2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { getSessionMessages, createSession, getSession, steerTurn, interruptTurn, getSessions, getSystem, listFiles } from "../api/client";
import ToolCallCard, { ToolCallPart } from "../components/Chat/ToolCallCard";
import WorkPanel, { TodoItem } from "../components/Chat/WorkPanel";
import PlanPanel, { PlanData, PlanStep } from "../components/Chat/PlanPanel";
import { formatRelativeTime } from "../utils/format";
import SlashCommands, { SlashCommand, SLASH_COMMANDS } from "../components/Chat/SlashCommands";
import FileMentions from "../components/Chat/FileMentions";
import ApprovalDialog from "../components/Chat/ApprovalDialog";

interface ChatPart {
  type: "text" | "thinking" | "tool_call";
  content?: string; done?: boolean; toolName?: string;
  arguments?: Record<string, unknown>; result?: unknown;
  status?: "pending" | "success" | "error"; callId?: string; summary?: string;
}

interface ChatMessage {
  id: string; role: "user" | "assistant" | "system";
  content: string; parts?: ChatPart[]; reasoning?: string;
  timestamp?: string; created_at?: string;
  tokenCount?: number; token_count?: number; status?: string;
}

function safeTimestamp(msg: ChatMessage): string {
  return msg.timestamp || msg.created_at || new Date().toISOString();
}

const STORAGE_KEY = "codewhale_chat_messages";

// Match text-like kinds from CodeWhale SSE
function isTextKind(kind: string): boolean {
  return !kind || kind === "text" || kind === "message" || kind === "agent_message" || kind === "assistant_message";
}
function isReasoningKind(kind: string): boolean {
  return kind === "reasoning" || kind === "agent_reasoning" || kind === "thinking";
}
function isToolKind(kind: string): boolean {
  return kind === "tool_call" || kind === "function_call";
}

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingReasoning, setStreamingReasoning] = useState("");
  const [reasoningExpanded, setReasoningExpanded] = useState(true);
  const [currentToolParts, setCurrentToolParts] = useState<Map<string, ToolCallPart>>(new Map());
  const [workspace, setWorkspace] = useState("");
  const [workspaceEditing, setWorkspaceEditing] = useState(false);
  const [workspaceDraft, setWorkspaceDraft] = useState("");
  const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [newSessionWorkspace, setNewSessionWorkspace] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showSessionSwitcher, setShowSessionSwitcher] = useState(false);
  const [sessionSearch, setSessionSearch] = useState("");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [workspaceFiles, setWorkspaceFiles] = useState<{ name: string; path: string; isDir: boolean }[]>([]);
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalTool, setApprovalTool] = useState({ name: "", input: "" });
  const [approvalResolve, setApprovalResolve] = useState<((v: string) => void) | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [panelWorkOpen, setPanelWorkOpen] = useState(true);
  const [panelPlanOpen, setPanelPlanOpen] = useState(true);
  const [isResizing, setIsResizing] = useState(false);
  const [rightWidth, setRightWidth] = useState(280);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [plan, setPlan] = useState<PlanData>({ steps: [] });
  const [workspaceRoot, setWorkspaceRoot] = useState("");
  useEffect(() => { getSystem().then((res: any) => {
    const ws = res.data?.data?.workspace?.workspace || res.data?.doctor?.workspace || res.data?.workspace?.workspace || "";
    if (ws) { setWorkspaceRoot(ws); setWorkspace(ws);
      listFiles(ws).then((res2: any) => {
        const entries = res2.data?.data?.entries || [];
        setWorkspaceFiles(entries.map((e: any) => ({ name: e.name, path: e.path, isDir: e.isDirectory })));
      }).catch(() => {});
    }
  }).catch(() => {}); }, []);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingContentRef = useRef("");
  const streamingReasoningRef = useRef("");
  const currentToolPartsRef = useRef<Map<string, ToolCallPart>>(new Map());
  const { isStreaming, setStreaming, wsConnected, addToast, theme, setTheme, language, setLanguage } = useStore();
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const { data: session } = useQuery({
    queryKey: ["session", sessionId], queryFn: () => getSession(sessionId!), enabled: !!sessionId,
  });
  const { data: messagesData, isLoading: messagesLoading } = useQuery({
    queryKey: ["messages", sessionId], queryFn: () => getSessionMessages(sessionId!), enabled: !!sessionId,
  });
  const { data: sessionsList } = useQuery({
    queryKey: ["sessions-list"], queryFn: () => getSessions({ limit: 30 }), enabled: showSessionSwitcher,
  });
  const recentSessions: any[] = sessionsList?.data?.data || [];

  const serverMessages: ChatMessage[] = React.useMemo(() => {
    const msgs = Array.isArray(messagesData?.data?.data) ? messagesData.data.data
      : Array.isArray(messagesData?.data) ? messagesData.data : [];
    return msgs.map((m: any) => ({
      id: m.id || Math.random().toString(36).slice(2), role: m.role || "user",
      content: m.content || "", reasoning: m.reasoning,
      timestamp: m.timestamp || m.created_at, token_count: m.token_count,
      status: m.status, parts: m.parts || [],
    }));
  }, [messagesData]);

  useEffect(() => {
    if (serverMessages.length > 0) { setLocalMessages(serverMessages); persistMessages(serverMessages); }
    else if (!sessionId) { setLocalMessages([]); setTodos([]); setPlan({ steps: [] }); }
  }, [serverMessages.length > 0 ? serverMessages[0]?.id : undefined, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      const lastId = localStorage.getItem("code-whale-last-session");
      if (lastId) {
        getSession(lastId).then(() => navigate("/chat/"+lastId, { replace: true }))
          .catch(() => { localStorage.removeItem("code-whale-last-session");
            createSession({ title: "New Chat" }).then((res: any) => {
              const id = res.data?.data?.id; if (id) navigate("/chat/"+id, { replace: true });
            }).catch(() => {}); });
      } else {
        createSession({ title: "New Chat" }).then((res: any) => {
          const id = res.data?.data?.id; if (id) navigate("/chat/"+id, { replace: true });
        }).catch(() => {});
      }
    }
  }, [sessionId, navigate]);

  useEffect(() => { if (sessionId) localStorage.setItem("code-whale-last-session", sessionId); }, [sessionId]);

  // Show new session dialog if navigated from sessions page
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setNewSessionTitle("");
      setNewSessionWorkspace(workspace);
      setShowNewSessionDialog(true);
    }
  }, [searchParams, workspace]);

  const persistMessages = useCallback((msgs: ChatMessage[]) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-200))); } catch {}
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); },
    [localMessages, streamingContent, currentToolParts]);

  const handleSwitchSession = useCallback((id: string) => {
    setShowSessionSwitcher(false); setSessionSearch(""); navigate("/chat/"+id);
  }, [navigate]);

  const handleNewSession = useCallback(() => {
    setNewSessionTitle("");
    setNewSessionWorkspace(workspace);
    setShowNewSessionDialog(true);
  }, [workspace]);

  const handleCreateSession = useCallback(async () => {
    try {
      const res = await createSession({ title: newSessionTitle || "New Chat", workspace: newSessionWorkspace || undefined });
      const id = res.data?.data?.id;
      if (id) {
        setShowNewSessionDialog(false);
        setShowSessionSwitcher(false);
        navigate("/chat/"+id);
      }
    } catch (err: any) { addToast({ type: "error", message: t("chat.sessionCreationFailed") }); }
  }, [newSessionTitle, newSessionWorkspace, navigate, addToast, t]);

  const detectToolResults = useCallback((chunk: string) => {
    try { const p = JSON.parse(chunk);
      if (p.todos && Array.isArray(p.todos)) setTodos(p.todos);
      if (p.plan) setPlan({ explanation: p.plan.explanation, steps: p.plan.steps || p.plan });
      if (p.steps && Array.isArray(p.steps)) setPlan({ explanation: p.explanation || "", steps: p.steps });
    } catch {
      try { const m = chunk.match(/\{"todos":\s*\[[\s\S]*?\]\}/); if (m) { const p = JSON.parse(m[0]); if (p.todos) setTodos(p.todos); } } catch {}
      try { const m = chunk.match(/\{"(?:plan|explanation|steps)":[\s\S]*?\}/); if (m) { const p = JSON.parse(m[0]); if (p.steps) setPlan({ explanation: p.explanation||"", steps: p.steps }); else if (p.plan?.steps) setPlan(p.plan); } } catch {}
    }
  }, []);

  const handleSSEEvent = useCallback((ev: any) => {
    if (ev.done) { setStreaming(false); setStreamingContent(""); setStreamingReasoning(""); streamingContentRef.current = ""; streamingReasoningRef.current = ""; return; }
    if (ev.error) { setStreamError(String(ev.error)); setStreaming(false); return; }

    if (ev.event === "item.started" && isToolKind(ev.kind || "")) {
      setCurrentToolParts(prev => { const n = new Map(prev); n.set(ev.item_id || "", {
        type: "tool_call", toolName: ev.toolName || ev.summary || "tool", callId: ev.item_id,
        status: "pending", summary: ev.summary, arguments: ev.arguments
      }); return n; });
      // Show approval dialog for tool calls
      const toolName = ev.toolName || ev.summary || "tool";
      const toolInput = JSON.stringify(ev.arguments || {}, null, 2);
      setApprovalTool({ name: toolName, input: toolInput });
      setApprovalVisible(true);
      return;
    }
    if (ev.event === "item.completed" && isToolKind(ev.kind || "")) {
      setCurrentToolParts(prev => { const n = new Map(prev); const ex = n.get(ev.item_id || "");
        if (ex) { ex.status = "success"; ex.summary = ev.summary || ex.summary; if (ev.result) ex.result = ev.result; } return n; }); return;
    }
    if (ev.event === "item.failed") {
      setCurrentToolParts(prev => { const n = new Map(prev); const ex = n.get(ev.item_id || "");
        if (ex) ex.status = "error"; return n; }); currentToolPartsRef.current.clear(); return;
    }
    
    // Tool delta
    if (ev.event === "item.delta" && isToolKind(ev.kind || "")) {
      const chunk = ev.chunk; if (typeof chunk === "string") {
        setCurrentToolParts(prev => { const n = new Map(prev);
          for (const [k, p] of n) { if (p.status === "pending") { p.result = (p.result || "") + chunk; break; } }
          return n; });
        detectToolResults(chunk);
      } return;
    }
    
    // Reasoning delta (must check BEFORE text delta since agent_reasoning comes first)
    if (ev.event === "item.delta" && isReasoningKind(ev.kind || "")) {
      const chunk = ev.chunk; if (typeof chunk === "string") setStreamingReasoning(p => p + chunk); streamingReasoningRef.current += chunk;
      return;
    }
    
    // Text delta
    if (ev.event === "item.delta" && isTextKind(ev.kind || "")) {
      const chunk = ev.chunk; if (typeof chunk === "string") setStreamingContent(p => p + chunk); streamingContentRef.current += chunk;
      return;
    }

    // Text completed — flush tool parts + finalize message
    if (ev.event === "item.completed" && isTextKind(ev.kind || "")) {
      setCurrentToolParts(prev => {
        if (prev.size > 0) setLocalMessages(msgs => {
          const last = msgs[msgs.length - 1];
          if (last && last.role === "assistant" && last.status === "streaming") {
            const np = (last.parts || []).slice(); prev.forEach(p => np.push(p));
            const u = { ...last, parts: np }; const nm = [...msgs.slice(0, -1), u]; persistMessages(nm); return nm;
          } return msgs;
        }); return new Map();
      }); return;
    }
    
    // Turn completed — finalize everything
    if (ev.event === "turn.completed") {
      setStreaming(false);
      setLocalMessages(msgs => {
        const mc = [...msgs]; const last = mc[mc.length-1];
        if (last && last.role==="assistant" && last.status==="streaming") {
          const parts: ChatPart[] = [];
          if (streamingReasoningRef.current) parts.push({ type:"thinking", content: streamingReasoningRef.current, done:true });
          const sc = streamingContentRef.current || last.content || "";
          const content = sc || "(no response)";
          if (content !== "(no response)") parts.push({ type:"text", content });
          currentToolPartsRef.current.forEach(p => parts.push(p)); setCurrentToolParts(new Map()); currentToolPartsRef.current = new Map();
          const updated = { ...last, content, reasoning: streamingReasoningRef.current||last.reasoning, parts: parts.length>0 ? parts : last.parts, status: "completed", timestamp: new Date().toISOString() };
          const result = [...mc.slice(0,-1), updated]; persistMessages(result); return result;
        } return mc;
      });
      setStreamingContent(""); setStreamingReasoning(""); streamingContentRef.current = ""; streamingReasoningRef.current = ""; setCurrentToolParts(new Map());
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
      return;
    }
  }, [setStreaming, persistMessages, detectToolResults, sessionId, queryClient]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isStreaming || !sessionId) return;
    const userMessage = input.trim();
    setInput(""); setStreamError(null); setStreamingContent(""); setStreamingReasoning(""); streamingContentRef.current = ""; streamingReasoningRef.current = "";
    setCurrentToolParts(new Map()); setTodos([]); setPlan({ steps: [] });
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: userMessage, timestamp: new Date().toISOString() };
    const assistantMsg: ChatMessage = { id: (Date.now()+1).toString(), role: "assistant", content: "", parts: [], timestamp: new Date().toISOString(), status: "streaming" };
    const newLocal = [...localMessages, userMsg, assistantMsg];
    setLocalMessages(newLocal); persistMessages(newLocal); setStreaming(true);
    const controller = new AbortController(); abortRef.current = controller;
    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: userMessage, workspace: workspace || undefined }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error("HTTP "+res.status);
      const reader = res.body?.getReader(); if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder(); let buffer = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() || "";
        for (const line of lines) { if (!line.startsWith("data: ")) continue; try { handleSSEEvent(JSON.parse(line.slice(6))); } catch {} }
      }
    } catch (err: any) { if (err.name !== "AbortError") { setStreamError(err.message||"Stream failed"); addToast({ type:"error", message: t("chat.streamFailed")+": "+(err.message||"") }); } }
    finally {
      setStreaming(false); abortRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["messages", sessionId] });
    }
  }, [input, isStreaming, sessionId, workspace, localMessages, handleSSEEvent, addToast, t, persistMessages, queryClient]);

  const handleStop = useCallback(() => { abortRef.current?.abort(); setStreaming(false); }, [setStreaming]);

  const handleCopy = useCallback((text: string, id?: string) => {
    navigator.clipboard.writeText(text).then(() => { if (id) { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } });
  }, []);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); setIsResizing(true); const sx = e.clientX; const sr = rightWidth;
    const onMove = (ev: MouseEvent) => { const dx = sx - ev.clientX; setRightWidth(Math.max(200, Math.min(500, sr+dx))); };
    const onUp = () => { setIsResizing(false); document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove); document.addEventListener("mouseup", onUp);
  }, [rightWidth]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey||e.metaKey) && e.key==="k") { e.preventDefault(); setShowSessionSwitcher(p=>!p); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);

  // Save streaming content on unmount to prevent loss on navigation
  useEffect(() => {
    return () => {
      if (isStreaming && streamingContent) {
        try {
          const msgs = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
          const lastIdx = msgs.length - 1;
          if (lastIdx >= 0 && msgs[lastIdx].status === "streaming") {
            msgs[lastIdx].content = streamingContent;
            msgs[lastIdx].reasoning = streamingReasoning;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
          }
        } catch {}
      }
    };
  }, [isStreaming, streamingContent, streamingReasoning]);

  const displayMessages = localMessages.length > 0 ? localMessages : serverMessages;
  const incompleteTodoCount = todos.filter(t=>t.status!=="completed").length;
  const incompletePlanCount = plan.steps.filter(s=>s.status!=="completed").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={()=>setShowSessionSwitcher(!showSessionSwitcher)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-dark-800 rounded transition-colors" title="Switch session (Ctrl+K)">
            <MessageSquare size={13} />
            <span className="max-w-[120px] truncate">{session?.data?.data?.title || sessionId || t("chat.newConversation")}</span>
            <ChevronDown size={11} />
          </button>
          <span className="text-[10px] text-gray-700">{sessionId?.slice(0,8)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={()=>setRightPanelOpen(!rightPanelOpen)}
            className={"p-1 rounded text-xs transition-colors "+(rightPanelOpen?"text-whale-400 bg-whale-500/10":"text-gray-600 hover:text-gray-400")} title="Toggle panels">
            <GanttChartSquare size={14} />
          </button>
          <button onClick={handleNewSession} className="p-1 text-gray-600 hover:text-gray-400 transition-colors" title={t("chat.newChat")}>
            <Plus size={14} />
          </button>
        </div>
      </div>
      {showSessionSwitcher && (
        <div className="absolute top-9 left-3 z-50 w-72 bg-dark-950 border border-dark-700 rounded-lg shadow-2xl">
          <div className="p-2 border-b border-dark-800">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-dark-900 rounded">
              <Search size={12} className="text-gray-600" />
              <input autoFocus value={sessionSearch} onChange={e=>setSessionSearch(e.target.value)} placeholder="Search sessions..."
                className="bg-transparent text-xs text-gray-300 outline-none flex-1" onKeyDown={e=>{if(e.key==="Escape")setShowSessionSwitcher(false);}} />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {recentSessions.filter((s:any)=>!sessionSearch||s.title?.toLowerCase().includes(sessionSearch.toLowerCase())).slice(0,20).map((s:any)=>(
              <button key={s.id} onClick={()=>handleSwitchSession(s.id)}
                className={"w-full text-left px-3 py-2 text-xs hover:bg-dark-800 transition-colors "+(s.id===sessionId?"bg-whale-500/10 text-whale-400":"text-gray-400")}>
                <div className="truncate">{s.title||s.id?.slice(0,8)}</div>
                <div className="text-[10px] text-gray-700 mt-0.5">{s.model||""} {s.mode||""}</div>
              </button>
            ))}
            {recentSessions.length===0&&<div className="px-3 py-4 text-xs text-gray-600 text-center">No sessions</div>}
          </div>
          <div className="p-1.5 border-t border-dark-800">
            <button onClick={handleNewSession} className="w-full text-left px-2 py-1.5 text-xs text-whale-400 hover:bg-dark-800 rounded transition-colors">+ {t("chat.newChat")}</button>
          </div>
        </div>
      )}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {messagesLoading && displayMessages.length===0 ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin w-5 h-5 border-2 border-whale-500 border-t-transparent rounded-full" /></div>
            ) : displayMessages.length===0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-600">
                <Bot size={40} className="mb-4 opacity-30" />
                <p className="text-sm font-medium mb-2">{t("chat.noMessages")}</p>
                <p className="text-xs max-w-xs text-center">{t("chat.welcomeMessage")}</p>
              </div>
            ) : (
              <div className="pb-2">
                {displayMessages.map((msg, idx) => (
                  <MessageBubble key={msg.id||idx} msg={msg} onCopy={(text)=>handleCopy(text,msg.id)} copied={copiedId===msg.id} t={t} />
                ))}
                {isStreaming && (
                  <div className="px-4 py-3 bg-dark-900/30 border-b border-dark-800/50">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-5 h-5 rounded bg-whale-600/20 flex items-center justify-center"><Bot size={11} className="text-whale-400" /></div>
                      <span className="text-xs font-medium text-whale-400">CodeWhale</span>
                      <div className="flex gap-1 ml-2">
                        <span className="w-1.5 h-1.5 bg-whale-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-whale-400 rounded-full animate-bounce [animation-delay:0.15s]" />
                        <span className="w-1.5 h-1.5 bg-whale-400 rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                    <div className="pl-7">
                      {streamingReasoning && <ReasoningBlock reasoning={streamingReasoning} expanded={reasoningExpanded} onToggle={()=>setReasoningExpanded(!reasoningExpanded)} />}
                      {streamingContent && <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown></div>}
                      {Array.from(currentToolParts.values()).map(part=><ToolCallCard key={part.callId||part.toolName} part={part} />)}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        {rightPanelOpen && (<>
          <div className={"w-1 cursor-col-resize flex-shrink-0 transition-colors "+(isResizing?"bg-whale-500":"bg-transparent hover:bg-whale-500/30")} onMouseDown={startResize} />
          <div style={{width:rightWidth}} className="flex-shrink-0 overflow-y-auto border-l border-dark-800 bg-dark-950/50">
            <div className="border-b border-dark-800">
              <button onClick={()=>setPanelWorkOpen(!panelWorkOpen)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-dark-800/50 transition-colors">
                {panelWorkOpen?<ChevronDown size={11} className="text-gray-500"/>:<ChevronRight size={11} className="text-gray-500"/>}
                <ListTodo size={13} className="text-amber-400"/><span className="font-semibold text-gray-300">Task List</span>
                {incompleteTodoCount>0&&<span className="ml-auto bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{incompleteTodoCount}</span>}
              </button>
              {panelWorkOpen&&<WorkPanel todos={todos}/>}
            </div>
            <div>
              <button onClick={()=>setPanelPlanOpen(!panelPlanOpen)} className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-dark-800/50 transition-colors">
                {panelPlanOpen?<ChevronDown size={11} className="text-gray-500"/>:<ChevronRight size={11} className="text-gray-500"/>}
                <GanttChartSquare size={13} className="text-blue-400"/><span className="font-semibold text-gray-300">Plan</span>
                {incompletePlanCount>0&&<span className="ml-auto bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full font-medium">{incompletePlanCount}</span>}
              </button>
              {panelPlanOpen&&<PlanPanel plan={plan}/>}
            </div>
          </div>
        </>)}
      </div>

      {streamError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800/30 text-xs text-red-400 flex items-center gap-2 flex-shrink-0">
          <span className="font-medium">{t("chat.streamError")}:</span> {streamError}
          <button onClick={()=>setStreamError(null)} className="ml-auto text-red-500 hover:text-red-300"><X size={12}/></button>
        </div>
      )}
      <ApprovalDialog
        visible={approvalVisible}
        toolName={approvalTool.name}
        toolInput={approvalTool.input}
        onApprove={() => { setApprovalVisible(false); }}
        onDeny={() => { setApprovalVisible(false); handleStop(); }}
        onTrust={() => { setApprovalVisible(false); }}
      />
      <form onSubmit={handleSubmit} className="flex-shrink-0 border-t border-dark-800 px-3 py-2">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="flex items-center gap-1 text-[10px] text-gray-600">
            <span>{t("chat.workspace")}:</span>
            <span className="flex items-center gap-1 bg-dark-900 border border-dark-700 rounded px-1.5 py-0.5 text-gray-500 max-w-[200px]"
                title={workspace || ""}>
                <FolderOpen size={11} className="flex-shrink-0 text-whale-400/50" />
                <span className="text-[10px] truncate">{workspace ? workspace.split(/[\\\\/]/).pop() : t("chat.workspacePlaceholder")}</span>
              </span>
          </span>
          <span className={"flex items-center gap-0.5 text-[10px] "+(wsConnected?"text-green-400":"text-red-400")}>
            {wsConnected?<Wifi size={10}/>:<WifiOff size={10}/>}{wsConnected?t("chat.online"):t("chat.offline")}
          </span>
          {isStreaming && <button type="button" onClick={handleStop} className="ml-auto flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-900/20 rounded transition-colors"><StopCircle size={11}/>{t("chat.stop")}</button>}
        </div>
        <div className="relative">
          <div className="relative flex-1">
              <SlashCommands visible={slashOpen} query={slashQuery} language={language} onSelect={(cmd: SlashCommand) => {
                if (cmd.action === "navigate" && cmd.target) navigate(cmd.target);
                else if (cmd.action === "insert" && cmd.target) setInput(cmd.target);
                else if (cmd.action === "action") {
                  if (cmd.target === "clear") { setLocalMessages([]); addToast({ type: "success", message: t("chat.cleared") || "Chat cleared" }); }
                  else if (cmd.target === "newSession") { handleNewSession(); }
                  else if (cmd.target === "themeDark") { setTheme("dark"); }
                  else if (cmd.target === "themeLight") { setTheme("light"); }
                  else if (cmd.target === "langZh") { setLanguage("zh"); }
                  else if (cmd.target === "langEn") { setLanguage("en"); }
                }
                setSlashOpen(false); setInput("");
              }} onClose={() => setSlashOpen(false)} />
              <FileMentions visible={mentionOpen} query={mentionQuery} files={workspaceFiles} onSelect={(f) => {
                setInput(prev => { const idx = prev.lastIndexOf("@"); return prev.slice(0, idx) + "@" + f.path + " "; });
                setMentionOpen(false);
              }} onClose={() => setMentionOpen(false)} />
              <textarea value={input} onChange={e=>{const v=e.target.value;setInput(v);const lastSlash=v.lastIndexOf("/");const lastAt=v.lastIndexOf("@");if(lastSlash>=0&&lastSlash>lastAt&&v.slice(lastSlash).match(/^\/[\u4e00-\u9fa5\w]*$/)){setSlashQuery(v.slice(lastSlash));setSlashOpen(true);setMentionOpen(false);}else if(lastAt>=0&&lastAt>lastSlash&&v.slice(lastAt).match(/^@[w./-]*$/)){setMentionQuery(v.slice(lastAt+1));setMentionOpen(true);setSlashOpen(false);}else{setSlashOpen(false);setMentionOpen(false);}}} placeholder={t("chat.typeMessage")}
            className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none focus:border-whale-500/50 transition-colors"
            rows={1} disabled={isStreaming}
            onInput={(e)=>{const t=e.target as HTMLTextAreaElement;t.style.height="auto";t.style.height=Math.min(t.scrollHeight,200)+"px";}}
            onKeyDown={(e)=>{if(e.key==="Enter"&&!e.shiftKey){if(slashOpen||mentionOpen){return;}e.preventDefault();handleSubmit();}}} />
          <div className="absolute right-1.5 bottom-1.5">
            </div>
            <button type="submit" disabled={!input.trim()||isStreaming}
              className="p-1.5 bg-whale-600 hover:bg-whale-500 disabled:opacity-30 disabled:cursor-not-allowed rounded-md transition-colors">
              {isStreaming?<span className="block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<Send size={14} className="text-white"/>}
            </button>
          </div>
        </div>
        <div className="mt-1.5 text-[10px] text-gray-700 text-center">{isStreaming?t("chat.stop")+" to interrupt":t("chat.footer")}</div>
      </form>
      {showNewSessionDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={()=>setShowNewSessionDialog(false)}>
          <div className="bg-dark-950 border border-dark-700 rounded-lg shadow-2xl w-full max-w-sm p-5" onClick={e=>e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-200 mb-4">{t("chat.newChat") || "New Session"}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">{t("chat.sessionTitle") || "Title"}</label>
                <input value={newSessionTitle} onChange={e=>setNewSessionTitle(e.target.value)} placeholder={t("chat.newChat") || "New Chat"}
                  className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-whale-500/50"
                  autoFocus onKeyDown={e=>{if(e.key==="Enter") handleCreateSession();}} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">{t("chat.workspace") || "Workspace"}</label>
                <input value={newSessionWorkspace} onChange={e=>setNewSessionWorkspace(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-700 rounded px-2.5 py-1.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-whale-500/50 font-mono"
                  placeholder={workspace || "C:\\path\\to\\project"} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setShowNewSessionDialog(false)} className="flex-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-dark-700 rounded transition-colors">{t("common.cancel") || "Cancel"}</button>
              <button onClick={handleCreateSession} className="flex-1 px-3 py-1.5 text-xs bg-whale-600 hover:bg-whale-500 text-white rounded transition-colors">{t("common.create") || "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, onCopy, copied, t }: { msg: ChatMessage; onCopy: (t: string) => void; copied: boolean; t: (k: string) => string }) {
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const hasParts = msg.parts && msg.parts.length > 0;
  const textParts = hasParts ? msg.parts!.filter(p=>p.type==="text"||p.type==="thinking") : [];
  const toolParts = hasParts ? msg.parts!.filter(p=>p.type==="tool_call") as ToolCallPart[] : [];
  const displayContent = hasParts ? textParts.map(p=>p.content||"").join("\n")||msg.content : msg.content;
  const ts = safeTimestamp(msg);
  return (
    <div className={"px-4 py-3 "+(msg.role==="user"?"bg-dark-950":"bg-dark-900/30")+" border-b border-dark-800/50"}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={"w-5 h-5 rounded flex items-center justify-center flex-shrink-0 "+(msg.role==="assistant"?"bg-whale-600/20":"bg-dark-800")}>
          {msg.role==="assistant"?<Bot size={11} className="text-whale-400"/>:<User size={11} className="text-gray-500"/>}
        </div>
        <span className={"text-xs font-medium "+(msg.role==="assistant"?"text-whale-400":"text-gray-400")}>{msg.role==="assistant"?"CodeWhale":"You"}</span>
        <span className="text-[10px] text-gray-700">{formatRelativeTime(ts)}</span>
        {msg.status==="failed"&&<span className="text-[10px] text-red-400 font-medium">Failed</span>}
      </div>
      {msg.reasoning&&<ReasoningBlock reasoning={msg.reasoning} expanded={reasoningExpanded} onToggle={()=>setReasoningExpanded(!reasoningExpanded)}/>}
      <div className="pl-7">
        {msg.role==="user"?(<p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>):displayContent?(
          <div className="prose prose-invert prose-sm max-w-none prose-headings:text-gray-200 prose-p:text-gray-300 prose-p:leading-relaxed prose-code:text-whale-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-800 prose-a:text-whale-400 prose-strong:text-gray-200 prose-li:text-gray-300">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent||"*No content*"}</ReactMarkdown>
          </div>
        ):null}
        {toolParts.map((part,i)=><ToolCallCard key={part.callId||part.toolName+"-"+i} part={part}/>)}
      </div>
      <div className="flex items-center gap-3 mt-1.5 pl-7">
        <button onClick={()=>onCopy(msg.content)} className="flex items-center gap-1 text-[10px] text-gray-700 hover:text-gray-400 transition-colors">
          {copied?<Check size={11} className="text-green-400"/>:<Copy size={11}/>}{copied?t("chat.copied"):t("chat.copy")}
        </button>
        {msg.token_count&&msg.token_count>0&&<span className="text-[10px] text-gray-700">{msg.token_count} tokens</span>}
      </div>
    </div>
  );
}

function ReasoningBlock({ reasoning, expanded, onToggle }: { reasoning: string; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="mt-2 mb-2 border border-purple-800/30 rounded-lg overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/10 hover:bg-purple-900/20 transition-colors text-left">
        <Brain size={12} className="text-purple-400"/><span className="text-[11px] font-medium text-purple-300">Reasoning</span>
        {expanded?<ChevronDown size={12} className="text-purple-500 ml-auto"/>:<ChevronRight size={12} className="text-purple-500 ml-auto"/>}
      </button>
      {expanded&&<div className="px-3 py-2 text-xs text-purple-300/80 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-purple-950/10">{reasoning}</div>}
    </div>
  );
}
