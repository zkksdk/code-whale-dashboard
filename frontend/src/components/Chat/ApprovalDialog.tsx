import React from "react";
import { Shield, Check, X, ShieldCheck } from "lucide-react";
import { useTranslation } from "../../i18n/useTranslation";

interface ApprovalDialogProps {
  visible: boolean;
  toolName: string;
  toolInput: string;
  onApprove: () => void;
  onDeny: () => void;
  onTrust: () => void;
}

export default function ApprovalDialog({ visible, toolName, toolInput, onApprove, onDeny, onTrust }: ApprovalDialogProps) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onDeny}>
      <div className="bg-dark-950 border border-dark-700 rounded-lg shadow-2xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center"><Shield size={20} className="text-amber-400" /></div>
          <div>
            <h3 className="text-sm font-semibold text-gray-200">{t("chat.approvalTitle") || "Approve Tool Execution"}</h3>
            <p className="text-[11px] text-gray-500">{toolName}</p>
          </div>
        </div>
        <div className="bg-dark-900 rounded-lg p-3 mb-4 max-h-32 overflow-y-auto">
          <pre className="text-[10px] font-mono text-gray-400 whitespace-pre-wrap break-all">{toolInput}</pre>
        </div>
        <div className="flex gap-2">
          <button onClick={onDeny} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-800/30 rounded text-xs text-red-400 transition-colors">
            <X size={12} /> {t("chat.deny") || "Deny"}
          </button>
          <button onClick={onApprove} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-900/20 hover:bg-green-900/30 border border-green-800/30 rounded text-xs text-green-400 transition-colors">
            <Check size={12} /> {t("chat.approve") || "Approve"}
          </button>
          <button onClick={onTrust} className="flex items-center justify-center gap-1.5 px-3 py-2 bg-whale-600/20 hover:bg-whale-600/30 border border-whale-800/30 rounded text-xs text-whale-400 transition-colors">
            <ShieldCheck size={12} /> {t("chat.trust") || "Trust Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
