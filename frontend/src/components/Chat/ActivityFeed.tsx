import React from "react";
import { Terminal, FileText, Zap, CheckCircle, XCircle, Loader, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";

export interface ActivityItem {
  id: string;
  kind: "tool_call" | "file_change" | "command_execution" | "status" | "error" | "approval_required";
  status: "running" | "completed" | "failed";
  summary: string;
  detail?: string;
  timestamp: number;
}

interface Props {
  items: ActivityItem[];
  collapsed: boolean;
  onToggle: () => void;
}

const kindIcons: Record<string, React.ReactNode> = {
  tool_call: <Zap size={11} className="text-blue-400" />,
  file_change: <FileText size={11} className="text-green-400" />,
  command_execution: <Terminal size={11} className="text-amber-400" />,
  status: <CheckCircle size={11} className="text-gray-400" />,
  error: <XCircle size={11} className="text-red-400" />,
  approval_required: <AlertTriangle size={11} className="text-orange-400" />,
};

const kindLabels: Record<string, string> = {
  tool_call: "Tool", file_change: "File", command_execution: "Shell", status: "Status", error: "Error", approval_required: "Approval",
};

export default function ActivityFeed({ items, collapsed, onToggle }: Props) {
  return (
    <div className="border-t border-dark-800">
      <button onClick={onToggle} className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-dark-800 transition-colors">
        {collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
        <span>Activity</span>
        {items.length > 0 && <span className="text-[10px] text-gray-700 ml-1">({items.length})</span>}
      </button>
      {!collapsed && (
        <div className="max-h-48 overflow-y-auto border-t border-dark-800">
          {items.length === 0 ? (
            <p className="text-[11px] text-gray-700 text-center py-4">No activity yet</p>
          ) : (
            <div className="py-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-start gap-2 px-4 py-1.5 hover:bg-dark-800/50 transition-colors">
                  <div className="mt-0.5 flex-shrink-0">
                    {item.status === "running" ? (
                      <Loader size={11} className="text-whale-400 animate-spin" />
                    ) : item.status === "failed" ? (
                      <XCircle size={11} className="text-red-400" />
                    ) : (
                      kindIcons[item.kind] || <CheckCircle size={11} className="text-green-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-gray-500 uppercase">{kindLabels[item.kind] || item.kind}</span>
                      <span className="text-[11px] text-gray-300 truncate">{item.summary}</span>
                    </div>
                    {item.detail && <p className="text-[10px] text-gray-700 font-mono mt-0.5 truncate">{item.detail}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
