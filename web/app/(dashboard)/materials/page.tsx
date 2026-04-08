"use client";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { Package, RefreshCw, CheckCircle, XCircle, ShoppingCart, Plus, Minus, X, MapPin } from "lucide-react";
import { useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Recusado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return map[s] ?? s;
}

function statusStyle(s: string): { bg: string; color: string } {
  if (s === "approved") return { bg: "#dbeafe", color: "#1e40af" };
  if (s === "delivered") return { bg: "#d1fae5", color: "#065f46" };
  if (s === "rejected" || s === "cancelled") return { bg: "#fee2e2", color: "#991b1b" };
  return { bg: "#fef3c7", color: "#92400e" };
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

// ─── Modal de solicitação ─────────────────────────────────────────────────────

function RequestModal({
  material,
  stores,
  onClose,
  onConfirm,
  loading,
}: {
  material: { id: number; name: string; photoUrl?: string | null; quantityAvailable: number };
  stores: { id: number; name: string; city?: string | null }[];
  onClose: () => void;
  onConfirm: (qty: number, storeId: number, notes: string) => void;
  loading: boolean;
}) {
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(stores.length === 1 ? stores[0].id : null);

  const max = material.quantityAvailable;
  const canConfirm = selectedStoreId !== null && qty >= 1 && qty <= max;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "white", borderRadius: 16, padding: "24px",
        width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <p style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              Solicitar material
            </p>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "4px 0 0" }}>
              {material.name}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Foto do material */}
        {material.photoUrl && (
          <div style={{ marginBottom: 20, borderRadius: 10, overflow: "hidden", height: 140 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={material.photoUrl} alt={material.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        {/* Disponível */}
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8,
          padding: "8px 12px", marginBottom: 20, fontSize: 13, color: "#166534",
        }}>
          {max} unidade{max !== 1 ? "s" : ""} disponível{max !== 1 ? "is" : ""}
        </div>

        {/* Seleção de loja */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={14} style={{ color: "#6b7280" }} />
              Para qual loja?
            </span>
          </label>
          {stores.length === 0 ? (
            <div style={{
              background: "#fef9c3", border: "1px solid #fde047", borderRadius: 8,
              padding: "10px 12px", fontSize: 13, color: "#713f12",
            }}>
              Nenhuma loja encontrada na sua rota. Fale com o gestor.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStoreId(store.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                    border: `2px solid ${selectedStoreId === store.id ? "#1d4ed8" : "#e5e7eb"}`,
                    background: selectedStoreId === store.id ? "#eff6ff" : "white",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: selectedStoreId === store.id ? "#1d4ed8" : "#f3f4f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <MapPin size={15} style={{ color: selectedStoreId === store.id ? "white" : "#9ca3af" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{store.name}</p>
                    {store.city && <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>{store.city}</p>}
                  </div>
                  {selectedStoreId === store.id && (
                    <CheckCircle size={16} style={{ color: "#1d4ed8", marginLeft: "auto" }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Seletor de quantidade */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 10 }}>
            Quantidade
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "center" }}>
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "2px solid #e5e7eb",
                background: "white", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: "#374151",
              }}
            >
              <Minus size={16} />
            </button>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#111827", minWidth: 40, textAlign: "center" }}>
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(max, q + 1))}
              disabled={qty >= max}
              style={{
                width: 40, height: 40, borderRadius: "50%", border: "2px solid #e5e7eb",
                background: "white", cursor: qty >= max ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: qty >= max ? "#d1d5db" : "#374151",
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Observações */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>
            Observações <span style={{ color: "#9ca3af", fontWeight: 400 }}>(opcional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Algum detalhe adicional..."
            rows={2}
            style={{
              width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
              padding: "10px 12px", fontSize: 14, color: "#374151", resize: "none",
              outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Botões */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "12px", borderRadius: 10, border: "1px solid #e5e7eb",
              background: "white", color: "#374151", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => selectedStoreId && onConfirm(qty, selectedStoreId, notes)}
            disabled={loading || !canConfirm}
            style={{
              flex: 2, padding: "12px", borderRadius: 10, border: "none",
              background: loading || !canConfirm ? "#9ca3af" : "#1d4ed8", color: "white",
              fontSize: 14, fontWeight: 700, cursor: loading || !canConfirm ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <ShoppingCart size={16} />
            {loading ? "Enviando..." : !selectedStoreId ? "Selecione uma loja" : "Confirmar solicitação"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const { user } = useAuth();
  const appRole = (user as any)?.appRole as string | undefined;
  const isManager = appRole === "manager" || appRole === "master" || appRole === "supervisor";

  // Estado da aba
  const [activeTab, setActiveTab] = useState<"catalog" | "requests">(isManager ? "requests" : "catalog");

  // Modal de solicitação
  const [selectedMaterial, setSelectedMaterial] = useState<{
    id: number; name: string; photoUrl?: string | null; quantityAvailable: number;
  } | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Modal de rejeição
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Filtros (gestor) — "all" = sem filtro
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "rejected" | "delivered" | "all">("all");

  // Queries
  const materials = trpc.materials.list.useQuery({});
  const myRequests = trpc.materialRequests.list.useQuery({}, { enabled: !isManager });
  const allRequests = trpc.materialRequests.listAll.useQuery(
    { status: statusFilter === "all" ? undefined : statusFilter, limit: 200 },
    { enabled: isManager }
  );
  // Lojas da rota do promotor (para o modal de solicitação)
  const promoterStores = trpc.stores.listForPromoter.useQuery(undefined, { enabled: !isManager });
  // Para o catálogo: histórico de solicitações por material
  const allMyRequests = trpc.materialRequests.list.useQuery({ limit: 200 }, { enabled: !isManager });

  // Mutations
  const createRequest = trpc.materialRequests.create.useMutation();
  const approve = trpc.materialRequests.approve.useMutation({ onSuccess: () => allRequests.refetch() });
  const reject = trpc.materialRequests.reject.useMutation({
    onSuccess: () => { allRequests.refetch(); setRejectId(null); setRejectReason(""); },
  });
  const deliver = trpc.materialRequests.deliver.useMutation({ onSuccess: () => allRequests.refetch() });

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleConfirmRequest = async (qty: number, storeId: number, notes: string) => {
    if (!selectedMaterial) return;
    setRequestLoading(true);
    try {
      await createRequest.mutateAsync({
        materialId: selectedMaterial.id,
        storeId,
        quantityRequested: qty,
        priority: "medium",
        notes: notes.trim() || undefined,
      });
      setSelectedMaterial(null);
      showToast(`Solicitação de "${selectedMaterial.name}" enviada com sucesso!`);
      myRequests.refetch();
      allMyRequests.refetch();
    } catch {
      showToast("Não foi possível enviar a solicitação.", "error");
    } finally {
      setRequestLoading(false);
    }
  };

  const catalogData = materials.data ?? [];
  const requestsData = isManager ? (allRequests.data ?? []) : (myRequests.data ?? []);
  const storesForModal = (promoterStores.data ?? []) as { id: number; name: string; city?: string | null }[];

  // Mapa: materialId → lista de solicitações do promotor (para histórico nos cards)
  const myRequestsByMaterial = (allMyRequests.data ?? []).reduce((acc: Record<number, any[]>, r: any) => {
    if (!acc[r.materialId]) acc[r.materialId] = [];
    acc[r.materialId].push(r);
    return acc;
  }, {});

  // Contagem de pendentes para o badge na aba
  const pendingCount = isManager
    ? (allRequests.data ?? []).filter((r: any) => r.status === "pending").length
    : 0;

  const statusTabs = [
    { key: "all" as const, label: "Todos" },
    { key: "pending" as const, label: "Pendentes" },
    { key: "approved" as const, label: "Aprovados" },
    { key: "rejected" as const, label: "Rejeitados" },
    { key: "delivered" as const, label: "Entregues" },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: 1200, margin: "0 auto" }}>
      {/* responsive padding via className override */}
      <style>{`@media (min-width: 640px) { .materials-page { padding: 28px 32px !important; } }`}</style>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 24, zIndex: 9999,
          background: toast.type === "success" ? "#065f46" : "#991b1b",
          color: "white", padding: "12px 20px", borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          {toast.type === "success" ? <CheckCircle size={16} /> : <XCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Modal de solicitação */}
      {selectedMaterial && (
        <RequestModal
          material={selectedMaterial}
          stores={storesForModal}
          onClose={() => setSelectedMaterial(null)}
          onConfirm={handleConfirmRequest}
          loading={requestLoading}
        />
      )}

      {/* Modal de rejeição */}
      {rejectId !== null && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16,
        }}>
          <div style={{ background: "white", borderRadius: 16, padding: 24, width: "100%", maxWidth: 380 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>Motivo da rejeição</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo..."
              rows={3}
              style={{
                width: "100%", border: "1px solid #e5e7eb", borderRadius: 8,
                padding: "10px 12px", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                onClick={() => { setRejectId(null); setRejectReason(""); }}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: 14 }}
              >
                Cancelar
              </button>
              <button
                onClick={() => reject.mutate({ id: rejectId, rejectionReason: rejectReason || "Sem motivo informado" })}
                disabled={reject.isPending}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#dc2626", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
              >
                {reject.isPending ? "Rejeitando..." : "Rejeitar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Package size={20} style={{ color: "#ea580c" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Materiais</h1>
            <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>
              {isManager ? "Gerencie as solicitações da equipe" : "Solicite materiais para o seu PDV"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { materials.refetch(); allRequests.refetch(); myRequests.refetch(); promoterStores.refetch(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            background: "white", border: "1px solid #e5e7eb", borderRadius: 8,
            fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500,
          }}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, borderBottom: "1px solid #e5e7eb" }}>
        {/* Catálogo tab visible for all roles */}
        <button
          onClick={() => setActiveTab("catalog")}
          style={{
            padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: "none", background: "none",
            color: activeTab === "catalog" ? "#1d4ed8" : "#6b7280",
            borderBottom: activeTab === "catalog" ? "2px solid #1d4ed8" : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          {isManager ? "Estoque" : "Catálogo"}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          style={{
            padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            border: "none", background: "none",
            color: activeTab === "requests" ? "#1d4ed8" : "#6b7280",
            borderBottom: activeTab === "requests" ? "2px solid #1d4ed8" : "2px solid transparent",
            marginBottom: -1,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {isManager ? "Solicitações" : "Minhas Solicitações"}
          {isManager && pendingCount > 0 && (
            <span style={{
              background: "#dc2626", color: "white",
              fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* ── CATÁLOGO / ESTOQUE ── */}
      {activeTab === "catalog" && (
        <div>
          {materials.isLoading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Carregando materiais...</div>
          ) : catalogData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
              <Package size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Nenhum material disponível no momento</p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 16,
            }}>
              {catalogData.map((item: any) => {
                const available = item.quantityAvailable > 0;
                const reqs = myRequestsByMaterial[item.id] ?? [];
                const lastReq = reqs[0];
                const lastSs = lastReq ? statusStyle(lastReq.status ?? "pending") : null;
                return (
                  <div
                    key={item.id}
                    onClick={() => available && setSelectedMaterial(item)}
                    style={{
                      background: "white", borderRadius: 14,
                      border: `1px solid ${available ? "#e5e7eb" : "#f3f4f6"}`,
                      overflow: "hidden", cursor: available ? "pointer" : "default",
                      transition: "box-shadow 0.15s, transform 0.15s",
                      opacity: available ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => { if (available) { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; } }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; (e.currentTarget as HTMLDivElement).style.transform = "none"; }}
                  >
                    {/* Imagem */}
                    <div style={{ height: 140, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      {item.photoUrl
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={item.photoUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : <Package size={40} style={{ color: "#d1d5db" }} />
                      }
                    </div>

                    {/* Info */}
                    <div style={{ padding: "14px 14px 16px" }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px", lineHeight: 1.3 }}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 10px", lineHeight: 1.4 }}>
                          {item.description}
                        </p>
                      )}

                      {/* Disponibilidade */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                          background: available ? "#d1fae5" : "#fee2e2",
                          color: available ? "#065f46" : "#991b1b",
                        }}>
                          {available ? `${item.quantityAvailable} disponível${item.quantityAvailable !== 1 ? "is" : ""}` : "Indisponível"}
                        </span>
                        {available && (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", background: "#1d4ed8",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <ShoppingCart size={15} style={{ color: "white" }} />
                          </div>
                        )}
                      </div>

                      {/* Histórico de solicitações */}
                      {lastReq && lastSs && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
                            Histórico ({reqs.length} solicitaç{reqs.length === 1 ? "ão" : "ões"})
                          </p>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 11, color: "#6b7280" }}>
                              Última: {formatDate(lastReq.createdAt)}
                            </span>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: lastSs.bg, color: lastSs.color }}>
                              {statusLabel(lastReq.status ?? "pending")}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SOLICITAÇÕES ── */}
      {activeTab === "requests" && (
        <div>
          {/* Filtros de status (apenas gestor) */}
          {isManager && (
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {statusTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: "7px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                    cursor: "pointer", border: "1px solid",
                    background: statusFilter === tab.key ? "#1d4ed8" : "white",
                    color: statusFilter === tab.key ? "white" : "#6b7280",
                    borderColor: statusFilter === tab.key ? "#1d4ed8" : "#e5e7eb",
                    transition: "all 0.15s",
                  }}
                >
                  {tab.label}
                  {tab.key === "pending" && pendingCount > 0 && (
                    <span style={{
                      marginLeft: 6, background: statusFilter === "pending" ? "rgba(255,255,255,0.3)" : "#dc2626",
                      color: "white", fontSize: 10, fontWeight: 700,
                      padding: "0px 5px", borderRadius: 10,
                    }}>
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Lista de solicitações */}
          {allRequests.isLoading && isManager ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>Carregando solicitações...</div>
          ) : requestsData.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af" }}>
              <ShoppingCart size={48} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p style={{ fontSize: 14, margin: 0 }}>Nenhuma solicitação encontrada</p>
              {!isManager && (
                <button
                  onClick={() => setActiveTab("catalog")}
                  style={{
                    marginTop: 16, padding: "10px 20px", background: "#1d4ed8", color: "white",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Ver catálogo de materiais
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {requestsData.map((req: any) => {
                const ss = statusStyle(req.status ?? "pending");
                return (
                  <div
                    key={req.id}
                    style={{
                      background: "white", borderRadius: 12, border: "1px solid #f3f4f6",
                      padding: "16px 20px", display: "flex", alignItems: "flex-start",
                      gap: 16, flexWrap: "wrap",
                    }}
                  >
                    {/* Foto ou ícone do material */}
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2, overflow: "hidden" }}>
                      {req.materialPhotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={req.materialPhotoUrl} alt={req.materialName ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <Package size={18} style={{ color: "#6b7280" }} />
                      )}
                    </div>

                    {/* Info principal */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>
                        {req.materialName ?? `Material #${req.materialId}`}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#6b7280" }}>
                          Qtd: <strong>{req.quantityRequested}</strong>
                        </span>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>
                          {formatDate(req.createdAt)}
                        </span>
                      </div>
                      {/* Promotor e loja (visível para gestor) */}
                      {isManager && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px" }}>
                          {req.promoterName && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: "#374151",
                              background: "#f3f4f6", padding: "2px 8px", borderRadius: 6,
                              display: "flex", alignItems: "center", gap: 4,
                            }}>
                              👤 {req.promoterName}
                            </span>
                          )}
                          {req.storeName && (
                            <span style={{
                              fontSize: 11, fontWeight: 600, color: "#374151",
                              background: "#eff6ff", padding: "2px 8px", borderRadius: 6,
                              display: "flex", alignItems: "center", gap: 4,
                            }}>
                              <MapPin size={10} style={{ color: "#3b82f6" }} /> {req.storeName}
                            </span>
                          )}
                        </div>
                      )}
                      {req.notes && <p style={{ fontSize: 12, color: "#9ca3af", margin: "6px 0 0" }}>{req.notes}</p>}
                    </div>

                    {/* Status badge */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: ss.bg, color: ss.color }}>
                        {statusLabel(req.status ?? "pending")}
                      </span>

                      {/* Ações (gestor) */}
                      {isManager && req.status === "pending" && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => approve.mutate({ id: req.id })}
                            disabled={approve.isPending}
                            style={{
                              display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                              background: "#d1fae5", color: "#065f46", border: "none", borderRadius: 8,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            <CheckCircle size={13} /> Aprovar
                          </button>
                          <button
                            onClick={() => setRejectId(req.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                              background: "#fee2e2", color: "#991b1b", border: "none", borderRadius: 8,
                              fontSize: 12, fontWeight: 600, cursor: "pointer",
                            }}
                          >
                            <XCircle size={13} /> Rejeitar
                          </button>
                        </div>
                      )}
                      {isManager && req.status === "approved" && (
                        <button
                          onClick={() => deliver.mutate({ id: req.id })}
                          disabled={deliver.isPending}
                          style={{
                            padding: "6px 14px", background: "#1d4ed8", color: "white",
                            border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          Marcar Entregue
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
