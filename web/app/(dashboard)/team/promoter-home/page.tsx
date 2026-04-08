"use client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatHours } from "@/lib/utils";
import { Clock, Camera, MapPin, ChevronRight, Sun, Sunset, Moon } from "lucide-react";
import Link from "next/link";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Bom dia", icon: Sun };
  if (h < 18) return { text: "Boa tarde", icon: Sunset };
  return { text: "Boa noite", icon: Moon };
}

export default function PromoterHomePage() {
  const { user } = useAuth();
  const userName = (user as any)?.name?.split(" ")[0] ?? "Promotor";

  const today = new Date().toISOString().slice(0, 10);
  const summary = trpc.reports.promoterSummary.useQuery({ date: today });
  const stores = trpc.stores.listForPromoter.useQuery();
  const lastOpen = trpc.timeEntries.lastOpenEntry.useQuery({ dayStart: today });

  const greeting = getGreeting();
  const GreetIcon = greeting.icon;
  const s = summary.data as any;
  const hasOpenEntry = !!(lastOpen.data as any)?.id;

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <GreetIcon size={20} style={{ color: "#f59e0b" }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>
            {greeting.text}, {userName}!
          </h1>
        </div>
        <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Daily Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <Clock size={18} style={{ color: "#3b82f6", marginBottom: 8 }} />
          <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
            {summary.isLoading ? "—" : formatHours(s?.totalMinutes ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Horas hoje</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <Camera size={18} style={{ color: "#8b5cf6", marginBottom: 8 }} />
          <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
            {summary.isLoading ? "—" : (s?.totalPhotos ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Fotos hoje</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <MapPin size={18} style={{ color: "#10b981", marginBottom: 8 }} />
          <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
            {summary.isLoading ? "—" : (s?.totalEntries ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Registros</p>
        </div>
        <div style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
          <Camera size={18} style={{ color: "#f59e0b", marginBottom: 8 }} />
          <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
            {summary.isLoading ? "—" : (s?.pendingPhotos ?? 0)}
          </p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Fotos pendentes</p>
        </div>
      </div>

      {/* Clock CTA */}
      <Link
        href="/promoter-clock"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          background: hasOpenEntry ? "#ef4444" : "#1A56DB",
          color: "white", fontWeight: 700, fontSize: 15,
          padding: "16px 24px", borderRadius: 14, textDecoration: "none",
          marginBottom: 24, boxShadow: hasOpenEntry ? "0 4px 14px rgba(239,68,68,0.3)" : "0 4px 14px rgba(26,86,219,0.3)",
        }}
      >
        <Clock size={20} />
        {hasOpenEntry ? "Registrar Saída" : "Registrar Entrada"}
      </Link>

      {/* Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        <Link href="/promoter-photos" style={{ display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb", textDecoration: "none", color: "#374151", fontSize: 13, fontWeight: 600 }}>
          <Camera size={16} style={{ color: "#8b5cf6" }} /> Enviar Fotos
        </Link>
        <Link href="/product-expiration" style={{ display: "flex", alignItems: "center", gap: 8, background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb", textDecoration: "none", color: "#374151", fontSize: 13, fontWeight: 600 }}>
          <MapPin size={16} style={{ color: "#f59e0b" }} /> Vencimentos
        </Link>
      </div>

      {/* My Stores */}
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 12 }}>Minhas Lojas</h2>
      {stores.isLoading ? (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Carregando...</p>
      ) : (stores.data ?? []).length === 0 ? (
        <p style={{ fontSize: 13, color: "#9ca3af" }}>Nenhuma loja vinculada</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(stores.data ?? []).map((store: any) => (
            <div key={store.id} style={{ background: "white", borderRadius: 12, padding: "14px 16px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={16} style={{ color: "#3b82f6" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.name}</p>
                {store.address && <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{store.address}</p>}
              </div>
              <ChevronRight size={16} style={{ color: "#d1d5db" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
