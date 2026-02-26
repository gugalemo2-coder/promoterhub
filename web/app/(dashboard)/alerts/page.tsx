"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { Bell, RefreshCw, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function AlertsPage() {
  const [status, setStatus] = useState<string>("all");

  const alerts = trpc.geoAlerts.list.useQuery({ limit: 100 });
  const acknowledge = trpc.geoAlerts.acknowledge.useMutation({
    onSuccess: () => alerts.refetch(),
  });

  const data = (alerts.data ?? []).filter((a) =>
    status === "all" ? true :
    status === "open" ? !a.acknowledged :
    a.acknowledged
  );

  const openCount = (alerts.data ?? []).filter((a) => !a.acknowledged).length;

  const statusTabs = [
    { key: "all", label: "Todos" },
    { key: "open", label: `Abertos (${openCount})` },
    { key: "resolved", label: "Resolvidos" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Alertas"
        subtitle={`${openCount} alertas abertos`}
        icon={Bell}
        iconColor="text-red-600"
        iconBg="bg-red-50"
        actions={
          <button
            onClick={() => alerts.refetch()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === tab.key
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts list */}
      {alerts.isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhum alerta encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl border shadow-sm p-4 flex items-start gap-4 ${
                !alert.acknowledged ? "border-red-100" : "border-gray-100"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                !alert.acknowledged ? "bg-red-50" : "bg-gray-50"
              }`}>
                <Bell size={18} className={!alert.acknowledged ? "text-red-500" : "text-gray-400"} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">
                    {(alert as any).promoterName ?? "Promotor"} — {(alert as any).storeName ?? "PDV"}
                  </p>
                  <StatusBadge status={alert.acknowledged ? "resolved" : "open"} />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {alert.alertType?.replace(/_/g, " ") ?? "—"}
                </p>
                {(alert as any).notes && (
                  <p className="text-xs text-gray-400 mt-1 italic">"{(alert as any).notes}"</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(alert.createdAt)}</p>
              </div>

              {!alert.acknowledged && (
                <button
                  onClick={() => acknowledge.mutate({ id: alert.id })}
                  disabled={acknowledge.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <CheckCircle size={13} />
                  Resolver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
