import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitFork, Archive, MessageCircle, Search, Filter } from "lucide-react";
import { getThreadSummary, forkThread, patchThread } from "../api/client";
import { useStore } from "../store";
import { useTranslation } from "../i18n/useTranslation";
import { formatRelativeTime } from "../utils/format";

export default function ThreadsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToast } = useStore();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data: threadsData, isLoading } = useQuery({
    queryKey: ["threads", search, showArchived],
    queryFn: () => getThreadSummary({ search: search || undefined, limit: 50, include_archived: showArchived, archived_only: showArchived ? undefined : false }),
    refetchInterval: 10000,
  });

  const raw = threadsData?.data;
  const threads = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.data?.threads) ? raw.data.threads : [];

  const forkMutation = useMutation({
    mutationFn: (id: string) => forkThread(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["threads"] }); addToast({ type: "success", message: t("threads.fork") }); },
    onError: (e: Error) => addToast({ type: "error", message: e.message }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => patchThread(id, { archived: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["threads"] }); addToast({ type: "success", message: t("threads.archive") }); },
    onError: (e: Error) => addToast({ type: "error", message: e.message }),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-100">{t("threads.title")}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{t('threads.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder={t("threads.search")}
              className="w-44 bg-dark-900 border border-dark-700 rounded pl-7 pr-2 py-1 text-xs text-gray-200 placeholder-gray-700 focus:outline-none focus:border-whale-700"
            />
          </div>
          <button onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${showArchived ? "bg-dark-800 border-dark-700 text-gray-400" : "border-dark-700 text-gray-600 hover:text-gray-400"}`}>
            <Filter size={11} /> {showArchived ? t("threads.archived") : t("threads.active")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-600 text-sm">{t("common.loading")}</div>
      ) : threads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <MessageCircle size={40} className="mb-3 opacity-30" />
          <p className="text-sm">{t("threads.noThreads")}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {threads.map((th: any) => (
            <div key={th.id} className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-dark-800 ${th.archived ? "bg-dark-900/50 border border-dark-800" : "bg-dark-950 border border-dark-700"}`}>
              <button onClick={() => navigate(`/chat/${th.id}`)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${th.archived ? "bg-dark-800" : "bg-whale-600/20"}`}>
                  <MessageCircle size={12} className={th.archived ? "text-gray-600" : "text-whale-400"} />
                </div>
                <div className="min-w-0">
                  <span className="text-sm text-gray-200 truncate block">{th.title || t("common.unknown")}</span>
                  <span className="text-[10px] text-gray-600">
                    {th.model || ""}{th.mode ? ` \u00b7 ${th.mode}` : ""}{th.archived ? ` \u00b7 ${t("threads.archived").toLowerCase()}` : ""}
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-1 ml-2">
                <span className="text-[10px] text-gray-700 mr-2">{formatRelativeTime(th.updated_at || th.created_at)}</span>
                <button onClick={() => forkMutation.mutate(th.id)} className="p-1 hover:bg-dark-700 rounded text-gray-600 hover:text-gray-300" title={t("threads.fork")}>
                  <GitFork size={12} />
                </button>
                <button onClick={() => archiveMutation.mutate(th.id)} className="p-1 hover:bg-dark-700 rounded text-gray-600 hover:text-amber-500" title={t("threads.archive")}>
                  <Archive size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
