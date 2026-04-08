"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { useState, useMemo } from "react";
import {
  Shield, ChevronLeft, ChevronRight, Loader2, RefreshCw,
  LogIn, LogOut, Filter,
} from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function startOfMonth(y: number, m: number) { return new Date(y, m, 1); }
function endOfMonth(y: number, m: number) { return new Date(y, m + 1, 0, 23, 59, 59, 999); }

export default function AuditClockPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedPromoter, setSelectedPromoter] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "entry" | "exit">("all");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfMonth(year, month).toISOString(),
    endDate: endOfMonth(year, month).toISOString(),
  }), [year, month]);

  const { data: promoters } = trpc.stores.listPromoterUsers.useQuery();
  const { data: allStores } = trpc.stores.list.useQuery();
  const { data: rawEntries, isLoading, refetch } = trpc.timeEntries.audit.useQuery({
    promoterId: selectedPromoter ?? undefined,
    storeId: selectedStore ?? undefined,
    startDate,
    endDate,
  });

  const entries = useMemo(() => {
    const list = (rawEntries ?? []) as any[];
    if (entryTypeFilter === "all") return list;
    return list.filter((e) => e.entryType === entryTypeFilter);
  }, [rawEntries, entryTypeFilter]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        title="Auditoria de Ponto"
        subtitle="Registros com fotos dos promotores"
        icon={Shield}
        iconColor="text-indigo-600"
        iconBg="bg-indigo-50"
        actions={
          <button onClick={() => refetch()} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500,
          }}><RefreshCw size={14} /> Atualizar</button>
        }
      />

      {/* Filters */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid #e5e7eb",
        padding: "14px 18px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <Filter size={15} style={{ color: "#9ca3af" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronLeft size={16} style={{ color: "#1A56DB" }} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#111827", minWidth: 130, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronRight size={16} style={{ color: "#1A56DB" }} />
          </button>
        </div>

        <select
          value={selectedPromoter ?? ""}
          onChange={(e) => setSelectedPromoter(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", outline: "none" }}
        >
          <option value="">Todos promotores</option>
          {(promoters ?? []).map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={selectedStore ?? ""}
          onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : null)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", outline: "none" }}
        >
          <option value="">Todas lojas</option>
          {(allStores ?? []).map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "entry", "exit"] as const).map((t) => (
            <button key={t} onClick={() => setEntryTypeFilter(t)} style={{
              padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 11, fontWeight: 600,
              background: entryTypeFilter === t ? "#1A56DB" : "#f3f4f6",
              color: entryTypeFilter === t ? "white" : "#6b7280",
            }}>{t === "all" ? "Todos" : t === "entry" ? "Entradas" : "Saídas"}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Loader2 size={32} style={{ color: "#1A56DB", animation: "spin 1s linear infinite" }} />
          <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: 64, color: "#9ca3af" }}>
          <Shield size={48} style={{ margin: "0 auto 12px", color: "#d1d5db" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Nenhum registro encontrado</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {entries.map((entry: any) => (
            <div key={entry.id} style={{
              background: "white", borderRadius: 14, overflow: "hidden", border: "1px solid #e5e7eb",
            }}>
              {entry.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={entry.photoUrl} alt=""
                  onClick={() => setPreviewPhoto(entry.photoUrl)}
                  style={{ width: "100%", height: 160, objectFit: "cover", cursor: "pointer", display: "block" }}
                />
              ) : (
                <div style={{
                  width: "100%", height: 80, background: "#f3f4f6",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Sem foto</span>
                </div>
              )}
              <div style={{ padding: "10px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {entry.entryType === "entry"
                    ? <LogIn size={14} style={{ color: "#0E9F6E" }} />
                    : <LogOut size={14} style={{ color: "#EF4444" }} />
                  }
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: entry.entryType === "entry" ? "#0E9F6E" : "#EF4444",
                  }}>
                    {entry.entryType === "entry" ? "Entrada" : "Saída"}
                  </span>
                  <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                    {new Date(entry.entryTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 2px" }}>
                  {entry.promoterName ?? "Promotor"}
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>
                  {entry.storeName ?? "Loja"} · {new Date(entry.entryTime).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview */}
      {previewPhoto && (
        <div onClick={() => setPreviewPhoto(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewPhoto} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
