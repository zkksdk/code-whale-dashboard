import React, { useState } from "react";
import { Wrench, CheckCircle, XCircle, Loader, ChevronDown, ChevronRight, FileText } from "lucide-react";

export interface ToolCallPart {
  type: "tool_call";
  toolName: string;
  callId?: string;
  arguments?: Record<string, unknown>;
  result?: string;
  status: "pending" | "success" | "error";
  summary?: string;
}

const FILE_MODIFY_TOOLS = ["apply_patch", "write_file", "create_file", "edit_file", "replace_in_file", "write_to_file", "update_file", "patch_file"];

function formatArgs(args: Record<string, unknown>): string {
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function formatResult(result: string): string {
  if (typeof result === "string") return result;
  if (typeof result === "object" && result !== null) {
    // Try to extract text/result fields
    const r = result as Record<string, unknown>;
    if (typeof r.output === "string") return r.output;
    if (typeof r.result === "string") return r.result;
    if (typeof r.text === "string") return r.text;
    if (typeof r.content === "string") return r.content;
    try { return JSON.stringify(result, null, 2); } catch { return String(result); }
  }
  return String(result);
}

export default function ToolCallCard({ part }: { part: ToolCallPart }) {
  const [expanded, setExpanded] = useState(false);

  const statusIcon = part.status === "success" ? (
    <CheckCircle size={14} className="text-green-400" />
  ) : part.status === "error" ? (
    <XCircle size={14} className="text-red-400" />
  ) : (
    <Loader size={14} className="text-whale-400 animate-spin" />
  );

  const statusClass = part.status === "success" 
    ? "bg-green-500/20 text-green-400" 
    : part.status === "error"
    ? "bg-red-500/20 text-red-400"
    : "bg-whale-500/20 text-whale-400";

  const resultPreview = part.result ? formatResult(part.result).slice(0, 80) : "";
  const isFileTool = FILE_MODIFY_TOOLS.includes(part.toolName);

  return (
    <div className="my-1.5 border border-dark-700/50 rounded-lg overflow-hidden bg-dark-900/30">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-dark-800/50 transition-colors"
      >
        {expanded ? <ChevronDown size={12} className="text-gray-500 flex-shrink-0" /> : <ChevronRight size={12} className="text-gray-500 flex-shrink-0" />}
        {isFileTool ? <FileText size={14} className="text-amber-400 flex-shrink-0" /> : <Wrench size={14} className="text-blue-400 flex-shrink-0" />}
        <span className="text-xs font-mono font-semibold text-gray-300">{part.toolName}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto flex-shrink-0 ${statusClass}`}>
          {part.status}
        </span>
        {!expanded && resultPreview && (
          <span className="text-[10px] text-gray-600 truncate max-w-[200px] flex-shrink ml-1">{resultPreview}</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-dark-700/50">
          {part.arguments && (
            <div className="px-3 py-2 bg-dark-950/50 border-b border-dark-700/30">
              <div className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">Arguments</div>
              <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap break-all overflow-x-auto max-h-32 overflow-y-auto">
                {String(formatArgs(part.arguments))}
              </pre>
            </div>
          )}
          {part.result && (
            <div className="px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">Result</div>
              <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                {String(formatResult(part.result))}
              </pre>
            </div>
          )}
          {isFileTool && part.status === "success" && part.result && (
            <div className="px-3 py-2 border-t border-dark-700/30">
              <button
                className="text-[11px] text-whale-400 hover:text-whale-300 underline transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  const r = typeof part.result === "object" ? JSON.stringify(part.result, null, 2) : String(part.result ?? "");
                  navigator.clipboard.writeText(r);
                }}
              >
                Copy Result
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
