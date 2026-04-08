"use client";
import { useAuth } from "@/lib/auth-context";
import { trpc } from "@/lib/trpc";
import {
  User, CheckCircle, XCircle, Package, MapPin, Calendar,
  ChevronLeft, ChevronRight, BarChart3, Loader2, LogOut,
} from "lucide-react";
import { useState } from "react";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function MyProfilePage() {
  const { user, logout } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const { data: stats, isLoading } = trpc.promoterProfile.myStats.useQuery(
    { year, month, startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() },
    { enabled: !!user, refetchOnWindowFocus: true }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const maxBrand = Math.max(...(stats?.brandBreakdown ?? []).map((b: any) => b.approvedPhotos), 1);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1A56DB 0%, #1E40AF 100%)",
        padding: "24px 20px 32px", textAlign: "center",
        borderRadius: "0 0 24px 24px",
        position: "relative",
      }}>
        {/* Logout button */}
        <button
          onClick={logout}
          style={{
            position: "absolute", top: 16, right: 16,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
            color: "white", fontSize: 12, fontWeight: 600,
          }}
        >
          <LogOut size={14} />
          Sair
        </button>

        <div style={{
          width: 64, height: 64, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px",
        }}>
          <User size={28} style={{ color: "white" }} />
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: "white", margin: 0 }}>{user?.name ?? "Promotor"}</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", margin: "4px 0 0" }}>Meu Perfil</p>
      </div>

      {/* Month picker */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", background: "white", borderBottom: "1px solid #e5e7eb",
      }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
          <ChevronLeft size={20} style={{ color: "#1A56DB" }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
          <ChevronRight size={20} style={{ color: "#1A56DB" }} />
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Loader2 size={32} style={{ color: "#1A56DB", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Carregando seu desempenho...</p>
          <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          {/* Stats Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { icon: CheckCircle, label: "Fotos aprovadas", value: stats?.totalApprovedPhotos ?? 0, color: "#10B981" },
              { icon: XCircle, label: "Fotos recusadas", value: stats?.totalRejectedPhotos ?? 0, color: "#EF4444" },
              { icon: Package, label: "Materiais solicitados", value: stats?.totalMaterialRequests ?? 0, color: "#F59E0B" },
              { icon: MapPin, label: "Visitas a PDVs", value: stats?.totalVisits ?? 0, color: "#1A56DB" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} style={{
                  background: "white", borderRadius: 14, padding: 14,
                  border: "1px solid #e5e7eb", textAlign: "center",
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: s.color + "20",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px",
                  }}>
                    <Icon size={20} style={{ color: s.color }} />
                  </div>
                  <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>{s.value}</p>
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>{s.label}</p>
                </div>
              );
            })}
            {(stats?.avgDailyHours ?? 0) > 0 && (
              <div style={{
                background: "white", borderRadius: 14, padding: 14,
                border: "1px solid #e5e7eb", textAlign: "center", gridColumn: "span 2",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%", background: "#06B6D420",
                  display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px",
                }}>
                  <Calendar size={20} style={{ color: "#06B6D4" }} />
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>{stats?.avgDailyHours ?? 0}h</p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Média diária · {stats?.workedDays ?? 0} dias úteis</p>
              </div>
            )}
          </div>

          {/* Brand Breakdown */}
          {(stats?.brandBreakdown ?? []).length > 0 && (
            <div style={{ background: "white", borderRadius: 16, padding: 16, border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Fotos aprovadas por marca</h3>
              {(stats!.brandBreakdown as any[]).map((b: any) => {
                const pct = maxBrand > 0 ? (b.approvedPhotos / maxBrand) * 100 : 0;
                return (
                  <div key={b.brandId} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#111827", width: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.brandName}</span>
                    <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "#8B5CF6", borderRadius: 4, minWidth: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#8B5CF6", width: 28, textAlign: "right" }}>{b.approvedPhotos}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {stats?.totalApprovedPhotos === 0 && stats?.totalMaterialRequests === 0 && stats?.totalVisits === 0 && (
            <div style={{ textAlign: "center", padding: 32 }}>
              <BarChart3 size={40} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Sem dados neste mês</p>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>
                Registre seu ponto, tire fotos e solicite materiais para ver seu desempenho aqui.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
