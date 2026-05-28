import React, { useState, useEffect, useRef } from "react";
import { FolderOpen, ChevronRight, ChevronDown, Plus, Search, Home, Check, X, RefreshCw } from "lucide-react";
import { getAvailableWorkspaces, browseDirectory, createWorkspaceDir } from "../../api/client";
import { useTranslation } from "../../i18n/useTranslation";

interface WorkspaceEntry {
  path: string;
  label: string;
  source?: string;
  branch?: string;
  trust?: string;
}

interface BrowseEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface WorkspacePickerProps {
  value: string;
  onChange: (path: string) => void;
}

export default function WorkspacePicker({ value, onChange }: WorkspacePickerProps) {
  const { t } = useTranslation();
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [browsePath, setBrowsePath] = useState("");
  const [browseEntries, setBrowseEntries] = useState<BrowseEntry[]>([]);
  const [browseParent, setBrowseParent] = useState("");
  const [creating, setCreating] = useState(false);
  const [newDirName, setNewDirName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    getAvailableWorkspaces().then((res: any) => {
      setWorkspaces(res.data?.data || []);
    }).catch(() => {});
  }, []);
  
  const startBrowse = (startPath?: string) => {
    const p = startPath || value || "";
    browseDirectory(p).then((res: any) => {
      const d = res.data?.data;
      if (d) {
        setBrowsePath(d.path);
        setBrowseParent(d.parent);
        setBrowseEntries(d.entries?.filter((e: BrowseEntry) => e.isDir) || []);
        setBrowsing(true);
      }
    }).catch(() => {});
  };
  
  const browseInto = (dirPath: string) => {
    browseDirectory(dirPath).then((res: any) => {
      const d = res.data?.data;
      if (d) {
        setBrowsePath(d.path);
        setBrowseParent(d.parent);
        setBrowseEntries(d.entries?.filter((e: BrowseEntry) => e.isDir) || []);
      }
    }).catch(() => {});
  };
  
  const browseUp = () => {
    if (browseParent) browseInto(browseParent);
  };
  
  const handleCreateDir = async () => {
    if (!newDirName.trim() || !browsePath) return;
    try {
      const res = await createWorkspaceDir(browsePath, newDirName.trim());
      const data = res.data?.data;
      if (data) {
        onChange(data.path);
        setBrowsing(false);
        setCreating(false);
        setNewDirName("");
      }
    } catch {}
  };
  
  const selectWorkspace = (wsPath: string) => {
    onChange(wsPath);
    setBrowsing(false);
  };
  
  // Group workspaces
  const currentWs = workspaces.find(w => w.source === "current");
  const configWs = workspaces.filter(w => w.source === "config");
  const homeWs = workspaces.filter(w => w.source === "home");
  
  return (
    <div className="space-y-2">
      {/* Current selection */}
      <div className="flex items-center gap-1.5 text-xs">
        <FolderOpen size={12} className="text-whale-400 flex-shrink-0" />
        <span className="text-gray-400 truncate flex-1">{value || t("chat.workspacePlaceholder") || "Select workspace..."}</span>
        {(currentWs || value) && configWs.length > 0 && (
          <button onClick={() => selectWorkspace("")} className="text-gray-600 hover:text-gray-400 flex-shrink-0" title="Clear">
            <X size={11} />
          </button>
        )}
      </div>
      
      {/* Quick select: available workspaces */}
      {!browsing && (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {/* Current */}
          {currentWs && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-600 mb-1 px-1">{t("workspace.current")}</div>
              <WorkspaceChip ws={currentWs} selected={value === currentWs.path} onClick={() => selectWorkspace(currentWs.path)} />
            </div>
          )}
          
          {/* Config projects */}
          {configWs.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-600 mb-1 px-1">Trusted Projects</div>
              {configWs.map((ws, i) => (
                <WorkspaceChip key={i} ws={ws} selected={value === ws.path} onClick={() => selectWorkspace(ws.path)} />
              ))}
            </div>
          )}
          
          {/* Home directories */}
          {homeWs.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-gray-600 mb-1 px-1">{t("workspace.recentFiles") || "Recent"}</div>
              {homeWs.map((ws, i) => (
                <WorkspaceChip key={i} ws={ws} selected={value === ws.path} onClick={() => selectWorkspace(ws.path)} />
              ))}
            </div>
          )}
          
          {/* Browse button */}
          <button onClick={() => startBrowse()} className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-dark-800 rounded transition-colors">
            <Search size={11} />
            {t("workspace.browse") || "Browse folders..."}
          </button>
        </div>
      )}
      
      {/* Directory browser */}
      {browsing && (
        <div className="border border-dark-700 rounded-lg overflow-hidden">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 px-2 py-1.5 bg-dark-900 border-b border-dark-700">
            <button onClick={() => setBrowsing(false)} className="text-gray-500 hover:text-gray-300">
              <X size={12} />
            </button>
            <button onClick={browseUp} className="text-gray-500 hover:text-gray-300">
              <ChevronDown size={12} className="rotate-90" />
            </button>
            <Home size={11} className="text-gray-600 ml-1" />
            <span className="text-[10px] text-gray-400 truncate flex-1">{browsePath}</span>
            <button onClick={() => { setCreating(!creating); setNewDirName(""); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="text-gray-500 hover:text-whale-400 flex-shrink-0" title="New folder">
              <Plus size={12} />
            </button>
          </div>
          
          {/* Create new dir */}
          {creating && (
            <div className="flex items-center gap-1 px-2 py-1 bg-dark-900/50 border-b border-dark-700">
              <input ref={inputRef} value={newDirName} onChange={e => setNewDirName(e.target.value)}
                placeholder="Folder name"
                className="flex-1 bg-dark-800 border border-dark-700 rounded px-1.5 py-0.5 text-[11px] text-gray-200 outline-none focus:border-whale-500/50"
                onKeyDown={e => { if (e.key === "Enter") handleCreateDir(); if (e.key === "Escape") setCreating(false); }} />
              <button onClick={handleCreateDir} className="text-green-400 hover:text-green-300"><Check size={12} /></button>
              <button onClick={() => setCreating(false)} className="text-gray-500 hover:text-gray-400"><X size={12} /></button>
            </div>
          )}
          
          {/* Directory list */}
          <div className="max-h-36 overflow-y-auto">
            {browseEntries.map((entry, i) => (
              <button key={i} onClick={() => browseInto(entry.path)}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:bg-dark-800 hover:text-gray-200 transition-colors text-left">
                <FolderOpen size={12} className="text-yellow-500/70" />
                <span className="truncate">{entry.name}</span>
              </button>
            ))}
            {browseEntries.length === 0 && (
              <div className="px-3 py-4 text-center text-[10px] text-gray-600">No subdirectories</div>
            )}
          </div>
          
          {/* Select current */}
          <div className="border-t border-dark-700 px-2 py-1.5">
            <button onClick={() => selectWorkspace(browsePath)}
              className="w-full px-2 py-1 text-xs bg-whale-600/20 hover:bg-whale-600/30 text-whale-400 rounded transition-colors">
              {t("common.select") || "Select"} "{browsePath.split(/[\\/]/).pop()}"
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkspaceChip({ ws, selected, onClick }: { ws: WorkspaceEntry; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors text-left ${selected ? "bg-whale-600/20 text-whale-400" : "text-gray-500 hover:bg-dark-800 hover:text-gray-300"}`}>
      <FolderOpen size={11} className="flex-shrink-0" />
      <span className="truncate flex-1">{ws.label}</span>
      {ws.branch && <span className="text-[9px] text-gray-600 flex-shrink-0">{ws.branch}</span>}
    </button>
  );
}
