import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, Search, BarChart3, Settings, Terminal, 
  FolderOpen, Zap, Bot, Brain, Plus, Trash2, Copy, 
  Save, Download, RefreshCw, StopCircle, Globe, 
  Moon, Sun, FileText, List, CheckSquare, Archive,
  GitBranch, Server, Puzzle, Wrench,
  Activity, Clock, Play, Pause, AlertTriangle
} from "lucide-react";

export interface SlashCommand {
  id: string;
  command: string;
  aliases: string[];
  description: string;
  descriptionZh: string;
  icon: React.ReactNode;
  action: "navigate" | "action" | "insert";
  target?: string;
}

const iconSize = 14;

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "overview", command: "/overview", aliases: ["/dashboard", "/概览"], description: "Go to Overview", descriptionZh: "打开仪表盘", icon: <BarChart3 size={iconSize} />, action: "navigate", target: "/" },
  { id: "chat", command: "/chat", aliases: ["/对话", "/new"], description: "New chat", descriptionZh: "新建对话", icon: <MessageSquare size={iconSize} />, action: "navigate", target: "/chat" },
  { id: "sessions", command: "/sessions", aliases: ["/会话", "/history"], description: "Session management", descriptionZh: "会话管理", icon: <Archive size={iconSize} />, action: "navigate", target: "/sessions" },
  { id: "tasks", command: "/tasks", aliases: ["/任务", "/todo"], description: "Task management", descriptionZh: "任务管理", icon: <CheckSquare size={iconSize} />, action: "navigate", target: "/tasks" },
  { id: "models", command: "/models", aliases: ["/模型"], description: "Model list", descriptionZh: "模型列表", icon: <Brain size={iconSize} />, action: "navigate", target: "/models" },
  { id: "skills", command: "/skills", aliases: ["/技能", "/plugins"], description: "Skills & plugins", descriptionZh: "技能与插件", icon: <Puzzle size={iconSize} />, action: "navigate", target: "/skills" },
  { id: "mcp", command: "/mcp", aliases: ["/servers"], description: "MCP servers", descriptionZh: "MCP 服务器", icon: <Server size={iconSize} />, action: "navigate", target: "/mcp" },
  { id: "analytics", command: "/analytics", aliases: ["/分析", "/stats", "/usage"], description: "Analytics & usage", descriptionZh: "数据分析", icon: <BarChart3 size={iconSize} />, action: "navigate", target: "/analytics" },
  { id: "config", command: "/config", aliases: ["/配置", "/settings"], description: "Configuration", descriptionZh: "配置", icon: <Settings size={iconSize} />, action: "navigate", target: "/config" },
  { id: "workspace", command: "/workspace", aliases: ["/工作区", "/ws"], description: "Workspace info", descriptionZh: "工作区信息", icon: <FolderOpen size={iconSize} />, action: "navigate", target: "/workspace" },
  { id: "automations", command: "/automations", aliases: ["/自动化", "/cron"], description: "Automations", descriptionZh: "自动化", icon: <Clock size={iconSize} />, action: "navigate", target: "/automations" },
  { id: "threads", command: "/threads", aliases: ["/线程"], description: "Thread list", descriptionZh: "线程列表", icon: <GitBranch size={iconSize} />, action: "navigate", target: "/threads" },
  { id: "debug", command: "/debug", aliases: ["/调试", "/logs"], description: "Debug console", descriptionZh: "调试控制台", icon: <Terminal size={iconSize} />, action: "navigate", target: "/debug" },
  { id: "clear", command: "/clear", aliases: ["/清空", "/cls"], description: "Clear chat", descriptionZh: "清空对话", icon: <Trash2 size={iconSize} />, action: "action", target: "clear" },
  { id: "copy", command: "/copy", aliases: ["/复制"], description: "Copy all messages", descriptionZh: "复制全部消息", icon: <Copy size={iconSize} />, action: "action", target: "copyAll" },
  { id: "stop", command: "/stop", aliases: ["/停止", "/halt"], description: "Stop generation", descriptionZh: "停止生成", icon: <StopCircle size={iconSize} />, action: "action", target: "stop" },
  { id: "retry", command: "/retry", aliases: ["/重试", "/re"], description: "Retry last message", descriptionZh: "重试上一条", icon: <RefreshCw size={iconSize} />, action: "action", target: "retry" },
  { id: "export", command: "/export", aliases: ["/导出", "/save"], description: "Export chat", descriptionZh: "导出对话", icon: <Download size={iconSize} />, action: "action", target: "export" },
  { id: "new", command: "/new", aliases: ["/新建"], description: "New session", descriptionZh: "新建会话", icon: <Plus size={iconSize} />, action: "action", target: "newSession" },
  { id: "dark", command: "/dark", aliases: ["/暗色", "/night"], description: "Dark theme", descriptionZh: "暗色主题", icon: <Moon size={iconSize} />, action: "action", target: "themeDark" },
  { id: "light", command: "/light", aliases: ["/亮色", "/day"], description: "Light theme", descriptionZh: "亮色主题", icon: <Sun size={iconSize} />, action: "action", target: "themeLight" },
  { id: "lang-zh", command: "/zh", aliases: ["/中文", "/cn"], description: "Switch to Chinese", descriptionZh: "切换中文", icon: <Globe size={iconSize} />, action: "action", target: "langZh" },
  { id: "lang-en", command: "/en", aliases: ["/英文"], description: "Switch to English", descriptionZh: "切换英文", icon: <Globe size={iconSize} />, action: "action", target: "langEn" },
  { id: "search", command: "/search", aliases: ["/搜索", "/find", "/grep"], description: "Search in workspace", descriptionZh: "搜索工作区", icon: <Search size={iconSize} />, action: "action", target: "searchWorkspace" },
  { id: "git", command: "/git", aliases: ["/分支"], description: "Git status", descriptionZh: "Git 状态", icon: <GitBranch size={iconSize} />, action: "action", target: "gitStatus" },
  { id: "doctor", command: "/doctor", aliases: ["/诊断", "/health"], description: "System health check", descriptionZh: "系统诊断", icon: <Activity size={iconSize} />, action: "action", target: "doctor" },
  { id: "explain", command: "/explain", aliases: ["/解释", "/what"], description: "Explain selected code", descriptionZh: "解释代码", icon: <FileText size={iconSize} />, action: "insert", target: "解释以下代码：" },
  { id: "fix", command: "/fix", aliases: ["/修复", "/debug-code"], description: "Fix code issues", descriptionZh: "修复代码", icon: <Wrench size={iconSize} />, action: "insert", target: "请修复以下代码中的问题：" },
  { id: "optimize", command: "/optimize", aliases: ["/优化", "/perf"], description: "Optimize code", descriptionZh: "优化代码", icon: <Zap size={iconSize} />, action: "insert", target: "请优化以下代码的性能：" },
  { id: "test", command: "/test", aliases: ["/测试", "/unittest"], description: "Write tests", descriptionZh: "编写测试", icon: <List size={iconSize} />, action: "insert", target: "请为以下代码编写单元测试：" },
  { id: "refactor", command: "/refactor", aliases: ["/重构"], description: "Refactor code", descriptionZh: "重构代码", icon: <RefreshCw size={iconSize} />, action: "insert", target: "请重构以下代码：" },
  { id: "doc", command: "/doc", aliases: ["/文档", "/comment"], description: "Add documentation", descriptionZh: "添加文档注释", icon: <FileText size={iconSize} />, action: "insert", target: "请为以下代码添加文档注释：" },
  { id: "review", command: "/review", aliases: ["/审查", "/cr"], description: "Code review", descriptionZh: "代码审查", icon: <Search size={iconSize} />, action: "insert", target: "请审查以下代码：" },
];

interface SlashCommandsProps {
  visible: boolean;
  query: string;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
  language: string;
}

export default function SlashCommands({ visible, query, onSelect, onClose, language }: SlashCommandsProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = SLASH_COMMANDS.filter(c => {
    const q = query.toLowerCase();
    return c.command.toLowerCase().includes(q) || 
           c.aliases.some(a => a.toLowerCase().includes(q)) ||
           c.description.toLowerCase().includes(q) ||
           c.descriptionZh.includes(query);
  });
  useEffect(() => { setSelectedIdx(0); }, [query]);
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter") { e.preventDefault(); if (filtered[selectedIdx]) onSelect(filtered[selectedIdx]); return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [visible, filtered, selectedIdx, onSelect, onClose]);
  if (!visible || filtered.length === 0) return null;
  return (
    <div ref={ref} className="absolute bottom-full left-0 mb-1 w-72 max-h-64 overflow-y-auto bg-dark-950 border border-dark-700 rounded-lg shadow-2xl z-50">
      {filtered.map((cmd, i) => (
        <button key={cmd.id}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === selectedIdx ? "bg-whale-600/20 text-whale-400" : "text-gray-400 hover:bg-dark-800 hover:text-gray-200"}`}
          onMouseEnter={() => setSelectedIdx(i)} onClick={() => onSelect(cmd)}>
          <span className="flex-shrink-0 text-gray-500">{cmd.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{cmd.command}</div>
            <div className="text-[10px] text-gray-600 truncate">{language === "zh" ? cmd.descriptionZh : cmd.description}</div>
          </div>
          {cmd.action === "navigate" && <span className="text-[10px] text-gray-700">&rarr;</span>}
          {cmd.action === "insert" && <span className="text-[10px] text-gray-700">&olarr;</span>}
          {cmd.action === "action" && <span className="text-[10px] text-gray-700">⚡</span>}
        </button>
      ))}
    </div>
  );
}
