import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, RefreshCw, Plus, Trash2, Clock, CheckCircle, XCircle } from "lucide-react";
import { getAutomations, createAutomation, deleteAutomation, runAutomation, pauseAutomation, resumeAutomation } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { formatRelativeTime } from "../utils/format";

export default function AutomationsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [showCreate, setShowCreate] = useState(false);
  const [newAuto, setNewAuto] = useState({ title: "", prompt: "", cron_expression: "" });

  const { data: automationsData, isLoading } = useQuery({
    queryKey: ["automations"],
    queryFn: () => getAutomations().then(r => r.data),
    refetchInterval: 15000,
  });

  const raw = automationsData?.data;
  const automations = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.automations) ? raw.automations : [];

  const runMut = useMutation({ mutationFn: runAutomation, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); addToast({ type: "success", message: t("automations.run") }); }, onError: (e: Error) => addToast({ type: "error", message: e.message }) });
  const pauseMut = useMutation({ mutationFn: pauseAutomation, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); addToast({ type: "success", message: t("automations.pause") }); }, onError: (e: Error) => addToast({ type: "error", message: e.message }) });
  const resumeMut = useMutation({ mutationFn: resumeAutomation, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); addToast({ type: "success", message: t("automations.resume") }); }, onError: (e: Error) => addToast({ type: "error", message: e.message }) });
  const deleteMut = useMutation({ mutationFn: deleteAutomation, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); addToast({ type: "success", message: t("common.delete") }); }, onError: (e: Error) => addToast({ type: "error", message: e.message }) });
  const createMut = useMutation({ mutationFn: createAutomation, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["automations"] }); setShowCreate(false); setNewAuto({ title: "", prompt: "", cron_expression: "" }); addToast({ type: "success", message: t("automations.createAutomation") }); }, onError: (e: Error) => addToast({ type: "error", message: e.message }) });

  const handleCreate = () => { if (newAuto.title && newAuto.prompt) createMut.mutate(newAuto); };

  const statusBadge = (a: any) => {
    const s = a.status || "active";
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${s === "active" ? "bg-green-900/20 text-green-400 border border-green-900" : s === "paused" ? "bg-yellow-900/20 text-yellow-400 border border-yellow-900" : "bg-dark-800 text-gray-600 border border-dark-700"}`}>{s === "active" ? t("automations.status_active") : s === "paused" ? t("automations.status_paused") : s}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">{t("automations.title")}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{t('automations.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-whale-700 hover:bg-whale-600 rounded text-xs text-white transition-colors">
          <Plus size={12} /> {t("automations.newAutomation")}
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 bg-dark-900 border border-dark-700 rounded-lg p-4">
          <div className="space-y-3">
            <input value={newAuto.title} onChange={(e) => setNewAuto({ ...newAuto, title: e.target.value })} placeholder={t("automations.titlePlaceholder")} className="w-full bg-dark-950 border border-dark-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-whale-700" />
            <textarea value={newAuto.prompt} onChange={(e) => setNewAuto({ ...newAuto, prompt: e.target.value })} placeholder={t("automations.promptPlaceholder")} rows={3} className="w-full bg-dark-950 border border-dark-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-whale-700" />
            <input value={newAuto.cron_expression} onChange={(e) => setNewAuto({ ...newAuto, cron_expression: e.target.value })} placeholder={t("automations.cronPlaceholder")} className="w-full bg-dark-950 border border-dark-700 rounded px-2 py-1.5 text-xs text-gray-200 placeholder-gray-700 font-mono focus:outline-none focus:border-whale-700" />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={createMut.isPending} className="px-3 py-1 bg-whale-700 hover:bg-whale-600 rounded text-xs text-white transition-colors disabled:opacity-50">{t("automations.createAutomation")}</button>
              <button onClick={() => setShowCreate(false)} className="px-3 py-1 bg-dark-800 hover:bg-dark-700 rounded text-xs text-gray-400 transition-colors">{t("common.cancel")}</button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-gray-600 text-sm">{t("common.loading")}</div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <Clock size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{t("automations.noAutomations")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {automations.map((a: any) => (
            <div key={a.id} className="bg-dark-950 border border-dark-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-200 truncate">{a.title || t("common.unknown")}</span>
                    {statusBadge(a)}
                  </div>
                  {a.cron_expression && <span className="text-[11px] text-gray-600 font-mono">{a.cron_expression}</span>}
                  {a.last_run && <span className="text-[10px] text-gray-700 ml-3">{t("automations.lastRun")}: {formatRelativeTime(a.last_run)}</span>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => runMut.mutate(a.id)} className="p-1.5 hover:bg-dark-800 rounded text-gray-500 hover:text-green-400 transition-colors" title={t("automations.run")}><Play size={12} /></button>
                  {a.status === "active" ? (
                    <button onClick={() => pauseMut.mutate(a.id)} className="p-1.5 hover:bg-dark-800 rounded text-gray-500 hover:text-yellow-400 transition-colors" title={t("automations.pause")}><Pause size={12} /></button>
                  ) : (
                    <button onClick={() => resumeMut.mutate(a.id)} className="p-1.5 hover:bg-dark-800 rounded text-gray-500 hover:text-green-400 transition-colors" title={t("automations.resume")}><RefreshCw size={12} /></button>
                  )}
                  <button onClick={() => deleteMut.mutate(a.id)} className="p-1.5 hover:bg-dark-800 rounded text-gray-500 hover:text-red-400 transition-colors" title={t("common.delete")}><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
