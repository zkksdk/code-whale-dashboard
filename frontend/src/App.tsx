import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import StatusBar from "./components/Layout/StatusBar";
import Toast from "./components/Common/Toast";
import Overview from "./pages/Overview";
import Chat from "./pages/Chat";
import Config from "./pages/Config";
import Sessions from "./pages/Sessions";
import Models from "./pages/Models";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Debug from "./pages/Debug";
import Mcp from "./pages/Mcp";
import SkillsPage from "./pages/Skills";
import WorkspacePage from "./pages/Workspace";
import SubAgentsPage from "./pages/SubAgents";
import AutomationsPage from "./pages/Automations";
import TasksPage from "./pages/Tasks";
import { useStore } from "./store";
import { getSystem } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const { theme, toasts, removeToast } = useStore();

  useWebSocket(`ws://${window.location.hostname}:4322/ws`);

  const { setSystemStatus } = useStore();

  useEffect(() => {
    getSystem().then(r => {
      const v = r.data?.data?.doctor?.version;
      if (v) setSystemStatus({ version: v });
    }).catch(() => {});
  }, []);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdPaletteOpen(true); }
    if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); setSidebarCollapsed(prev => !prev); }
  }, []);

  useEffect(() => { document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-dark-950 text-gray-300 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} onOpenCmdPalette={() => setCmdPaletteOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/chat/:sessionId?" element={<Chat />} />            <Route path="/sessions" element={<Sessions />} />
            <Route path="/config" element={<Config />} />
            <Route path="/models" element={<Models />} />
            <Route path="/skills" element={<SkillsPage />} />
            <Route path="/mcp" element={<Mcp />} />
            <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/subagents" element={<SubAgentsPage />} />
            <Route path="/automations" element={<AutomationsPage />} />            <Route path="/analytics" element={<Analytics />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/debug" element={<Debug />} />
          </Routes>
        </main>
        <StatusBar />
      </div>
      <div className="fixed top-3 right-3 z-50 space-y-2">
        {toasts.map((toast) => (<Toast key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />))}
      </div>
      {cmdPaletteOpen && <CommandPalette onClose={() => setCmdPaletteOpen(false)} />}
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);

  const commands = [
    { label: "Go to Overview", path: "/", shortcut: "g o" },
    { label: "Go to Chat", path: "/chat", shortcut: "g c" },    { label: "Go to Config", path: "/config", shortcut: "g f" },
    { label: "Go to Models", path: "/models", shortcut: "g m" },
    { label: "Go to Skills", path: "/skills", shortcut: "g k" },
    { label: "Go to MCP", path: "/mcp", shortcut: "g p" },
    { label: "Go to Tasks", path: "/tasks", shortcut: "g t" },
    { label: "Go to Automations", path: "/automations", shortcut: "g a" },
    { label: "Go to Analytics", path: "/analytics", shortcut: "g n" },
    { label: "Go to Settings", path: "/settings", shortcut: "g e" },
    { label: "Toggle Sidebar", action: "toggle-sidebar", shortcut: "Ctrl+B" },
    { label: "Toggle Theme", action: "toggle-theme", shortcut: "Ctrl+T" },
  ];

  const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  const activate = (cmd: typeof commands[number]) => {
    if (cmd.path) window.location.href = cmd.path;
    if (cmd.action === "toggle-theme") { document.documentElement.classList.toggle("dark"); }
    onClose();
  };

  return (
    <div className="cmd-backdrop fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg bg-dark-950 border border-dark-700 rounded-lg shadow-2xl overflow-hidden animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-3 border-b border-dark-800">
          <input type="text" placeholder="Type a command..." value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIdx(0); }}
            className="w-full bg-transparent text-gray-100 placeholder-gray-600 outline-none text-sm cmd-input" autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && filtered.length > 0) { activate(filtered[selectedIdx]); }
            }} />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.map((cmd, idx) => (
            <button key={cmd.label}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${idx === selectedIdx ? "bg-whale-600/20 text-whale-400" : "text-gray-500 hover:text-gray-300 hover:bg-dark-800"}`}
              onMouseEnter={() => setSelectedIdx(idx)} onClick={() => activate(cmd)}>
              <span>{cmd.label}</span>
              {cmd.shortcut && <span className="text-[11px] text-gray-700 font-mono">{cmd.shortcut}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
