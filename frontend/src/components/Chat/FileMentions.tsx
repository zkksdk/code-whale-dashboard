import React, { useState, useEffect, useRef } from "react";
import { FileText, FolderOpen } from "lucide-react";

interface FileEntry {
  name: string;
  path: string;
  isDir: boolean;
}

interface FileMentionsProps {
  visible: boolean;
  query: string;
  files: FileEntry[];
  onSelect: (file: FileEntry) => void;
  onClose: () => void;
}

export default function FileMentions({ visible, query, files, onSelect, onClose }: FileMentionsProps) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const q = query.toLowerCase();
  const filtered = files.filter(f =>
    f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q)
  ).slice(0, 20);
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
    <div ref={ref} className="absolute bottom-full left-0 mb-1 w-72 max-h-56 overflow-y-auto bg-dark-950 border border-dark-700 rounded-lg shadow-2xl z-50">
      {filtered.map((f, i) => (
        <button key={f.path}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${i === selectedIdx ? "bg-whale-600/20 text-whale-400" : "text-gray-400 hover:bg-dark-800 hover:text-gray-200"}`}
          onMouseEnter={() => setSelectedIdx(i)} onClick={() => onSelect(f)}>
          {f.isDir ? <FolderOpen size={13} className="text-yellow-500 flex-shrink-0" /> : <FileText size={13} className="text-blue-400 flex-shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{f.name}</div>
            <div className="text-[10px] text-gray-600 truncate">{f.path}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
