"use client";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { formatDateTime } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  AlertTriangle, CheckCircle, XCircle, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, Eye,
} from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function startOfMonth(y: number, m: number) { return new Date(y, m, 1); }
function endOfMonth(y: number, m: number) { return new Date(y, m + 1, 0, 23, 59, 59, 999); }

export default function ManagerProductExpirationPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfMonth(year, month).toISOString(),
    endDate: endOfMonth(year, month).toISOString(),
  }), [year, month]);

  const { data: items, isLoading, refetch } = trpc.productExpirations.listAll.useQuery({
    startDate, endDate,
    status: (filterStatus as any) ?? undefined,
    limit: 100,
  });
  const updateMutation = trpc.productExpirations.updateStatus.useMutation();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const handleAction = async (id: number, status: "approved" | "rejected") => {
    setActionLoading(true);
    try {
      await updateMutation.mutateAsync({ id, status, managerNotes: notes || undefined });
      setReviewId(null);
      setNotes("");
      refetch();
    } catch { /* ignore */ }
    setActionLoading(false);
  };

  const statusColor = (s: string) => s === "approved" ? "#0E9F6E" : s === "rejected" ? "#E02424" : "#D97706";
  const statusLabel = (s: string) => s === "approved" ? "Aprovado" : s === "rejected" ? "Recusado" : "Pendente";
  const list = (items ?? []) as any[];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
      <PageHeader
        title="Vencimento de Produtos"
        subtitle="Gestão de registros enviados pelos promotores"
        icon={AlertTriangle}
        iconColor="text-orange-600"
        iconBg="bg-orange-50"
        actions={
          <button onClick={() => refetch()} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500,
          }}><RefreshCw size={14} /> Atualizar</button>
        }
      />

      {/* Month Nav and Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronLeft size={18} style={{ color: "#1A56DB" }} />
          </button>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#111827", minWidth: 140, textAlign: "center" }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer" }}>
            <ChevronRight size={18} style={{ color: "#1A56DB" }} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[
            { key: null, label: "Todos" },
            { key: "pending", label: "Pendentes" },
            { key: "approved", label: "Aprovados" },
            { key: "rejected", label: "Recusados" },
          ].map((f) => (
            <button key={String(f.key)} onClick={() => setFilterStatus(f.key)} style={{
              padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600,
              background: filterStatus === f.key ? "#1A56DB" : "#f3f4f6",
              color: filterStatus === f.key ? "white" : "#6b7280",
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <Loader2 size={32} style={{ color: "#1A56DB", animation: "spin 1s linear infinite" }} />
          <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
        </div>
      ) : list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 64 }}>
          <AlertTriangle size={48} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: "#111827" }}>Nenhum registro encontrado</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {list.map((item: any) => (
            <div key={item.id} style={{ background: "white", borderRadius: 14, padding: 16, border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                    background: statusColor(item.status) + "20", color: statusColor(item.status),
                  }}>{statusLabel(item.status)}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#111827" }}>{item.promoterName ?? "Promotor"}</span>
                </div>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatDateTime(item.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>
                {item.brandName ?? "Marca"} · {item.storeName ?? "Loja"}
              </p>
              {item.description && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>{item.description}</p>
              )}
              {item.photos && item.photos.length > 0 && (
                <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 8 }}>
                  {(item.photos as any[]).map((ph: any) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ph.id} src={ph.photoUrl} alt=""
                      onClick={() => setPreviewImg(ph.photoUrl)}
                      style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", cursor: "pointer", flexShrink: 0 }}
                    />
                  ))}
                </div>
              )}
              {item.status === "pending" && (
                reviewId === item.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                      placeholder="Observações (opcional)"
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb",
                        fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => handleAction(item.id, "approved")} disabled={actionLoading} style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                        background: "#0E9F6E", color: "white", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}><CheckCircle size={14} /> Aprovar</button>
                      <button onClick={() => handleAction(item.id, "rejected")} disabled={actionLoading} style={{
                        flex: 1, padding: "8px 0", borderRadius: 10, border: "none",
                        background: "#EF4444", color: "white", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      }}><XCircle size={14} /> Recusar</button>
                      <button onClick={() => { setReviewId(null); setNotes(""); }} style={{
                        padding: "8px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
                        background: "white", color: "#6b7280", fontSize: 13, fontWeight: 500, cursor: "pointer",
                      }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setReviewId(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 4, padding: "6px 14px",
                    background: "#1A56DB15", border: "none", borderRadius: 8,
                    color: "#1A56DB", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 4,
                  }}><Eye size={14} /> Revisar</button>
                )
              )}
              {item.managerNotes && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "8px 0 0", fontStyle: "italic" }}>
                  Obs: {item.managerNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Preview */}
      {previewImg && (
        <div onClick={() => setPreviewImg(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewImg} alt="" style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
