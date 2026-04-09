"use client";

import { trpc } from "@/lib/trpc";
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
    <div style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>
      <style>{`@media (min-width: 640px) { .notif-page { padding: 24px 32px !important; } }`}</style>

      {/* Header — empilhado verticalmente, visível no mobile */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: "#e0f2fe",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Bell size={20} style={{ color: "#0284c7" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Notificações</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
              {unreadCount ? `${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : "Tudo em dia"}
            </p>
          </div>
        </div>
        {/* Botões em linha abaixo do título */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => refetch()}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
              fontSize: 13, color: "#4b5563", border: "1px solid #e5e7eb",
              borderRadius: 8, background: "white", cursor: "pointer",
            }}
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
          {(unreadCount ?? 0) > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                fontSize: 13, color: "white", background: "#0284c7",
                border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                opacity: markAllReadMutation.isPending ? 0.5 : 1,
              }}
            >
              <CheckCheck size={14} />
              Ler todas
            </button>
          )}
        </div>
      </div>

      {/* Filter chips — scrollable horizontally */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch",
        paddingBottom: 4, scrollbarWidth: "none",
        marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16,
      }}>
        <style>{`.notif-filters::-webkit-scrollbar { display: none; }`}</style>
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
              whiteSpace: "nowrap", flexShrink: 0, cursor: "pointer",
              border: filter === f.key ? "none" : "1px solid #e5e7eb",
              background: filter === f.key ? "#0284c7" : "white",
              color: filter === f.key ? "white" : "#4b5563",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 size={32} style={{ color: "#0284c7", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 12 }}>
          <span style={{ fontSize: 48 }}>🔕</span>
          <p style={{ fontSize: 16, fontWeight: 600, color: "#374151", margin: 0 }}>
            {filter === "unread" ? "Você está em dia com tudo!" : "Nenhuma notificação"}
          </p>
          <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "0 16px", margin: 0 }}>
            {filter === "unread" ? "Todas as notificações foram lidas." : "Nenhuma notificação nesta categoria."}
          </p>
        </div>
      ) : (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #f3f4f6", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          {filtered.map((notif, idx) => {
            const config = TYPE_CONFIG[notif.type as NotifType] ?? TYPE_CONFIG.system;
            return (
              <div
                key={`${notif.id}-${idx}`}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "14px 16px",
                  borderBottom: idx < filtered.length - 1 ? "1px solid #f9fafb" : "none",
                  background: !notif.isRead ? "rgba(219,234,254,0.15)" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 18, backgroundColor: config.bg,
                }}>
                  {config.icon}
                </div>

                {/* Content — all info vertical, no clipping */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <p style={{
                      fontSize: 14, lineHeight: 1.4, margin: 0,
                      fontWeight: !notif.isRead ? 700 : 500,
                      color: !notif.isRead ? "#111827" : "#374151",
                      wordBreak: "break-word",
                    }}>
                      {notif.title}
                    </p>
                    <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, marginTop: 2 }}>
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, lineHeight: 1.5, margin: "0 0 6px",
                    color: !notif.isRead ? "#374151" : "#9ca3af",
                    wordBreak: "break-word",
                  }}>
                    {notif.body}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{
                      display: "inline-flex", alignItems: "center",
                      padding: "2px 8px", borderRadius: 20,
                      fontSize: 11, fontWeight: 600,
                      backgroundColor: config.bg, color: config.color,
                    }}>
                      {config.label}
                    </span>
                    {!notif.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate({ id: notif.id })}
                        disabled={markReadMutation.isPending}
                        style={{
                          fontSize: 11, fontWeight: 600, color: "#0284c7",
                          background: "none", border: "none", cursor: "pointer",
                          padding: 0, opacity: markReadMutation.isPending ? 0.5 : 1,
                        }}
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
