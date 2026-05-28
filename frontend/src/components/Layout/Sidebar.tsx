import React from "react";
import { LayoutDashboard, MessageCircle, MessageSquare, Settings, Brain, Clock, BarChart3, Sliders, Bug, ChevronLeft, ChevronRight, Fish, Server, FolderOpen, GitBranch, RefreshCw, ListChecks, Users } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "../../i18n/useTranslation";

interface SidebarProps { collapsed: boolean; onToggle: () => void; }

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { path: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { path: "/chat", label: t("nav.chat"), icon: MessageCircle },
    { path: "/sessions", label: t("nav.sessions"), icon: MessageSquare },
    { path: "/workspace", label: t("nav.workspace"), icon: GitBranch },
    { path: "/config", label: t("nav.config"), icon: Settings },
    { path: "/models", label: t("nav.models"), icon: Brain },
    { path: "/skills", label: t("nav.skills"), icon: FolderOpen },
    { path: "/mcp", label: t("nav.mcp"), icon: Server },
    { path: "/tasks", label: t("nav.tasks"), icon: ListChecks },
    { path: "/subagents", label: t("nav.subagents"), icon: Users },
    { path: "/automations", label: t("nav.automations"), icon: RefreshCw },
    { path: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { path: "/settings", label: t("nav.settings"), icon: Sliders },
    { path: "/debug", label: t("nav.debug"), icon: Bug },
  ];

  const isActive = (path: string) => { if (path === "/") return location.pathname === "/"; return location.pathname.startsWith(path); };

  return (
    <aside className={`${collapsed ? "w-14" : "w-56"} bg-dark-950 border-r border-dark-800 flex flex-col transition-all duration-150 flex-shrink-0`}>
      <div className="h-12 flex items-center px-3 border-b border-dark-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-whale-600 flex items-center justify-center flex-shrink-0">
            <Fish size={15} className="text-white" />
          </div>
          {!collapsed && <span className="text-sm font-semibold text-gray-100 tracking-wide">CodeWhale</span>}
        </div>
        <button onClick={onToggle} className="ml-auto p-1 hover:bg-dark-800 rounded transition-colors flex-shrink-0 text-gray-600 hover:text-gray-300">
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path}
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-all ${isActive(item.path) ? "bg-whale-600/15 text-whale-400 border-l-2 border-whale-500" : "text-gray-500 hover:text-gray-300 hover:bg-dark-800 border-l-2 border-transparent"}`}
            title={collapsed ? item.label : undefined}>
            <item.icon size={16} className="flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      {!collapsed && (
        <div className="px-3 py-3 border-t border-dark-800">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[11px] text-gray-600">v2.1</span>
          </div>
        </div>
      )}
    </aside>
  );
}
