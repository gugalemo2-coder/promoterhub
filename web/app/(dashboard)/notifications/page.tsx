"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { Bell, RefreshCw, CheckCheck, Loader2 } from "lucide-react";
import { useState } from "react";

type NotifType =
  | "geo_alert"
  | "material_request"
  | "material_approved"
  | "material_rejected"
  | "new_file"
  | "photo_approved"
  | "photo_rejected"
  | "system";

type FilterType = "all" | "unread" | NotifType;

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; bg: string; label: string }> = {
  geo_alert:         { icon: "📍", color: "#EF4444", bg: "#FEE2E2", label: "Alerta de Geo" },
  material_request:  { icon: "📦", color: "#F59E0B", bg: "#FEF3C7", label: "Solicitação" },
  material_approved: { icon: "✅", color: "#22C55E", bg: "#D1FAE5", label: "Aprovado" },
  material_rejected: { icon: "❌", color: "#EF4444", bg: "#FEE2E2", label: "Rejeitado" },
  new_file:          { icon: "📄", color: "#3B82F6", bg: "#DBEAFE", label: "Novo Arquivo" },
  photo_approved:    { icon: "🖼️", color: "#22C55E", bg: "#D1FAE5", label: "Foto Aprovada" },
  photo_rejected:    { icon: "🖼️", color: "#EF4444", bg: "#FEE2E2", label: "Foto Rejeitada" },
  system:            { icon: "🔔", color: "#6B7280", bg: "#F3F4F6", label: "Sistema" },
};

function timeAgo(date: Date | string): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterType>("all");

  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery({ limit: 100 });
  const { data: unreadCount, refetch: refetchCount } = trpc.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => { refetch(); refetchCount(); },
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { refetch(); refetchCount(); },
  });

  const filtered = (notifications ?? []).filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "all") return true;
    return n.type === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "unread", label: `Não lidas${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "geo_alert", label: "📍 Geo" },
    { key: "material_request", label: "📦 Material" },
    { key: "new_file", label: "📄 Arquivos" },
    { key: "photo_approved", label: "🖼️ Fotos" },
    { key: "system", label: "🔔 Sistema" },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Notificações"
        subtitle={unreadCount ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
        icon={Bell}
        iconColor="text-sky-600"
        iconBg="bg-sky-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
            {(unreadCount ?? 0) > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-medium disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Marcar todas como lidas
              </button>
            )}
          </div>
        }
      />

      {/* Filter chips */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              filter === f.key
                ? "bg-sky-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <span className="text-5xl">🔕</span>
          <p className="text-lg font-semibold text-gray-700">
            {filter === "unread" ? "Você está em dia com tudo!" : "Nenhuma notificação"}
          </p>
          <p className="text-sm text-gray-400">
            {filter === "unread" ? "Todas as notificações foram lidas." : "Nenhuma notificação nesta categoria."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.map((notif, idx) => {
            const config = TYPE_CONFIG[notif.type as NotifType] ?? TYPE_CONFIG.system;
            return (
              <div
                key={`${notif.id}-${idx}`}
                className={`flex items-start gap-4 px-5 py-4 border-b border-gray-50 last:border-b-0 transition-colors ${
                  !notif.isRead ? "bg-blue-50/30" : "hover:bg-gray-50"
                }`}
              >
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ backgroundColor: config.bg }}
                >
                  {config.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className={`text-sm truncate ${!notif.isRead ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.createdAt)}</span>
                  </div>
                  <p className={`text-sm leading-relaxed line-clamp-2 ${!notif.isRead ? "text-gray-700" : "text-gray-400"}`}>
                    {notif.body}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ backgroundColor: config.bg, color: config.color }}
                    >
                      {config.label}
                    </span>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                    )}
                  </div>
                </div>

                {/* Mark as read button */}
                {!notif.isRead && (
                  <button
                    onClick={() => markReadMutation.mutate({ id: notif.id })}
                    disabled={markReadMutation.isPending}
                    className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors disabled:opacity-50"
                  >
                    Marcar lida
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
