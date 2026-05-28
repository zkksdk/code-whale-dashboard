import React from "react";
import { Brain, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getModels } from "../api/client";
import { useTranslation } from "../i18n/useTranslation";

export default function Models() {
  const { t } = useTranslation();
  const { data: modelsData } = useQuery({
    queryKey: ["models"],
    queryFn: getModels,
  });

  const models = modelsData?.data?.data || [];
  const caps = modelsData?.data?.capabilities?.capability || modelsData?.data?.capabilities || {};

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-100">{t("models.title")}</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          {models.length} model{models.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((m: any) => (
          <div key={m.name || m.id} className="bg-dark-900/50 border border-dark-800 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-md bg-purple-600/20 text-purple-400">
                <Brain size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-100">
                  {m.name || m.id}
                  {m.is_default && <span className="ml-2 text-[10px] text-amber-400 font-normal">{t('models.defaultBadge')}</span>}
                </h3>
                <p className="text-xs text-gray-500">{m.provider || "deepseek"}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <InfoRow label="Base URL" value={m.base_url || caps.base_url || "—"} />
              <InfoRow label="Request Mode" value={caps.request_payload_mode || "—"} />
              <InfoRow label="Context" value={caps.context_window?.toLocaleString() || "—"} />
              <InfoRow label="Max Output" value={caps.max_output?.toLocaleString() || "—"} />
              <InfoRow label="Thinking" value={caps.thinking_supported ? "Yes" : "No"} ok={caps.thinking_supported} />
              <InfoRow label="Cache" value={caps.cache_telemetry_supported ? "Yes" : "No"} ok={caps.cache_telemetry_supported} />
            </div>
          </div>
        ))}
        {models.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-600">
            <Brain size={48} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{t('models.loadingFrom')}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-dark-800/50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-300 font-mono flex items-center gap-1.5">
        {value || "—"}
        {ok !== undefined && (ok ? <CheckCircle size={12} className="text-green-500" /> : null)}
      </span>
    </div>
  );
}