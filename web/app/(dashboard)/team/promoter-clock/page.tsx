"use client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatHours } from "@/lib/utils";
import { Clock, MapPin, ChevronLeft, ChevronRight, Camera, LogIn, LogOut, X } from "lucide-react";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Helper: retorna a data LOCAL no formato YYYY-MM-DD (sem converter para UTC)
function getLocalDateStr(d?: Date): string {
  const date = d ?? new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PromoterClockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<"entry" | "exit">("entry");
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // --- Optimistic state for open entry ---
  // null = "use server data", otherwise use this override
  const [optimisticOpen, setOptimisticOpen] = useState<
    { hasOpen: boolean; storeId: number | null } | null
  >(null);

  // Retry counter for consistency checks
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dayStartISO = `${selectedDate}T00:00:00`;
  const dayEndISO = `${selectedDate}T23:59:59`;

  const stores = trpc.stores.listForPromoter.useQuery();
  const entries = trpc.timeEntries.list.useQuery({ startDate: dayStartISO, endDate: dayEndISO });
  const dailySummary = trpc.timeEntries.dailySummary.useQuery({ startDate: dayStartISO, endDate: dayEndISO });
  const lastOpen = trpc.timeEntries.lastOpenEntry.useQuery({ dayStart: dayStartISO }, {
    refetchOnMount: "always",
    staleTime: 0,
  });
  const createEntry = trpc.timeEntries.create.useMutation();

  const storeList = stores.data ?? [];
  const entryList = (entries.data ?? []) as any[];

  // Use optimistic override if available, otherwise use server data
  const serverHasOpen = !!(lastOpen.data as any)?.id;
  const serverOpenStoreId = (lastOpen.data as any)?.storeId ?? null;

  const hasOpenEntry = optimisticOpen !== null ? optimisticOpen.hasOpen : serverHasOpen;
  const openEntryStoreId = optimisticOpen !== null ? optimisticOpen.storeId : serverOpenStoreId;

  const summaryData = dailySummary.data as any;

  // FIX: Clear optimistic override only when server data is CONSISTENT with
  // what we expect. If TiDB still returns stale data, keep the override and retry.
  useEffect(() => {
    if (optimisticOpen === null) return;
    if (lastOpen.isFetching) return;

    // Check consistency: does server data match what we set optimistically?
    const serverConfirmsNoOpen = !(lastOpen.data as any)?.id;
    const serverConfirmsOpen = !!(lastOpen.data as any)?.id;

    const isConsistent =
      (optimisticOpen.hasOpen === false && serverConfirmsNoOpen) ||
      (optimisticOpen.hasOpen === true && serverConfirmsOpen);

    if (isConsistent) {
      // Server caught up — clear override
      setOptimisticOpen(null);
      retryCountRef.current = 0;
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    } else {
      // Server still stale — schedule another refetch (max 10 retries)
      if (retryCountRef.current < 10) {
        retryCountRef.current += 1;
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          lastOpen.refetch();
        }, 1000);
      } else {
        // Give up after 10 retries — accept server truth
        setOptimisticOpen(null);
        retryCountRef.current = 0;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastOpen.isFetching, lastOpen.data, optimisticOpen]);

  // Clear optimistic state when navigating dates
  useEffect(() => {
    setOptimisticOpen(null);
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [selectedDate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const storeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of storeList as any[]) {
      map.set(s.id, s.name);
    }
    return map;
  }, [storeList]);

  const openEntryStoreName = openEntryStoreId ? (storeMap.get(openEntryStoreId) ?? null) : null;

  const getStoreName = (entry: any): string => {
    if (entry.storeName) return entry.storeName;
    if (entry.storeId && storeMap.has(entry.storeId)) return storeMap.get(entry.storeId)!;
    return "Loja desconhecida";
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const navigateDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setSelectedDate(getLocalDateStr(d));
  };

  const isToday = selectedDate === getLocalDateStr();

  const openModal = (type: "entry" | "exit") => {
    setEntryType(type);
    if (type === "exit" && openEntryStoreId) {
      setSelectedStore(openEntryStoreId);
    } else {
      setSelectedStore(null);
    }
    setPhotoBase64(null);
    setShowModal(true);
  };

  const handlePhoto = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPhotoBase64(result.split(",")[1] ?? result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleSubmit = async () => {
    if (!selectedStore) { showToast("Selecione uma loja"); return; }
    setSubmitting(true);
    try {
      await createEntry.mutateAsync({
        storeId: selectedStore,
        entryType,
        photoBase64: photoBase64 ?? undefined,
        photoFileType: "image/jpeg",
      });
      showToast(entryType === "entry" ? "Entrada registrada!" : "Saída registrada!");
      setShowModal(false);

      // *** OPTIMISTIC UPDATE: instantly flip button state ***
      retryCountRef.current = 0;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (entryType === "entry") {
        setOptimisticOpen({ hasOpen: true, storeId: selectedStore });
      } else {
        setOptimisticOpen({ hasOpen: false, storeId: null });
      }

      // Background refetch — entries list and summary update visually,
      // and when lastOpen finishes, the useEffect checks consistency before clearing
      queryClient.invalidateQueries({ queryKey: [["timeEntries"]] });

      // Also try broader invalidation in case tRPC key structure differs
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey as any[];
          return Array.isArray(key) && key.some(
            (k) => typeof k === "string" && k.includes("timeEntries")
          ) || (Array.isArray(key[0]) && key[0].some(
            (k: any) => typeof k === "string" && k.includes("timeEntries")
          ));
        },
      });

      // Refetch in background (no await — UI already updated optimistically)
      setTimeout(() => {
        entries.refetch();
        dailySummary.refetch();
        lastOpen.refetch();
      }, 600);
    } catch (err: any) {
      // On error, clear optimistic state so it reverts to server truth
      setOptimisticOpen(null);
      retryCountRef.current = 0;
      showToast(err?.message ?? "Erro ao registrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#065f46", color: "white", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>
          {toast}
        </div>
      )}

      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Registro de Ponto</h1>
      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>Registre sua entrada e saída</p>

      {/* Date Navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 20 }}>
        <button onClick={() => navigateDate(-1)} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={18} style={{ color: "#6b7280" }} />
        </button>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>
            {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          {isToday && <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600 }}>HOJE</span>}
        </div>
        <button onClick={() => navigateDate(1)} disabled={isToday} style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: isToday ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: isToday ? 0.4 : 1 }}>
          <ChevronRight size={18} style={{ color: "#6b7280" }} />
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 14, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{formatHours(summaryData?.totalMinutes ?? 0)}</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Total</p>
        </div>
        <div style={{ flex: 1, background: "white", borderRadius: 12, padding: 14, border: "1px solid #e5e7eb", textAlign: "center" }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{entryList.length}</p>
          <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>Registros</p>
        </div>
      </div>

      {/* Open Entry Banner */}
      {isToday && hasOpenEntry && (
        <div style={{
          background: "#FEF3C7", borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          border: "1px solid #F59E0B", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F59E0B20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <LogIn size={16} style={{ color: "#D97706" }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: 0 }}>Entrada aberta</p>
            <p style={{ fontSize: 11, color: "#B45309", margin: "2px 0 0" }}>
              {openEntryStoreName ? `Loja: ${openEntryStoreName}` : "Registre a saída antes de uma nova entrada"}
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isToday && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <button
            onClick={() => {
              if (hasOpenEntry) {
                showToast("Registre a saída antes de uma nova entrada");
                return;
              }
              openModal("entry");
            }}
            disabled={hasOpenEntry}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px",
              borderRadius: 12, border: "none",
              background: hasOpenEntry ? "#d1d5db" : "#1A56DB",
              color: "white", fontSize: 14, fontWeight: 700,
              cursor: hasOpenEntry ? "not-allowed" : "pointer",
            }}
          >
            <LogIn size={18} /> Entrada
          </button>
          <button
            onClick={() => {
              if (!hasOpenEntry) {
                showToast("Registre a entrada primeiro");
                return;
              }
              openModal("exit");
            }}
            disabled={!hasOpenEntry}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 16px",
              borderRadius: 12, border: "none",
              background: hasOpenEntry ? "#ef4444" : "#d1d5db",
              color: "white", fontSize: 14, fontWeight: 700,
              cursor: hasOpenEntry ? "pointer" : "not-allowed",
            }}
          >
            <LogOut size={18} /> Saída
          </button>
        </div>
      )}

      {/* Entry List */}
      <h2 style={{ fontSize: 14, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Registros do Dia</h2>
      {entries.isLoading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
          <div style={{ width: 24, height: 24, border: "2px solid #e5e7eb", borderTopColor: "#1A56DB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
          Carregando...
        </div>
      ) : entryList.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
          <Clock size={32} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
          Nenhum registro nesta data
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entryList.map((entry: any) => (
            <div key={entry.id} style={{ background: "white", borderRadius: 12, padding: "12px 16px", border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: entry.entryType === "entry" ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {entry.entryType === "entry" ? <LogIn size={16} style={{ color: "#16a34a" }} /> : <LogOut size={16} style={{ color: "#dc2626" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>
                  {entry.entryType === "entry" ? "Entrada" : "Saída"}
                </p>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>
                  {getStoreName(entry)} · {formatDateTime(entry.entryTime ?? entry.timestamp)}
                </p>
              </div>
              {entry.photoUrl && (
                <a href={entry.photoUrl} target="_blank" rel="noopener noreferrer" style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={entry.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>
                Registrar {entryType === "entry" ? "Entrada" : "Saída"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} style={{ color: "#6b7280" }} />
              </button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Selecione a Loja</label>
            {entryType === "exit" && openEntryStoreId ? (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                borderRadius: 10, border: "2px solid #1A56DB", background: "#eff6ff", marginBottom: 20,
              }}>
                <MapPin size={16} style={{ color: "#1A56DB" }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>
                  {openEntryStoreName ?? "Loja"}
                </span>
                <span style={{ fontSize: 10, color: "#6b7280", marginLeft: "auto" }}>Mesma da entrada</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20, maxHeight: 200, overflow: "auto" }}>
                {storeList.map((store: any) => (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                      borderRadius: 10, border: selectedStore === store.id ? "2px solid #1A56DB" : "1px solid #e5e7eb",
                      background: selectedStore === store.id ? "#eff6ff" : "white",
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <MapPin size={16} style={{ color: selectedStore === store.id ? "#1A56DB" : "#9ca3af" }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#111827" }}>{store.name}</span>
                  </button>
                ))}
              </div>
            )}

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Foto (opcional)</label>
            <div style={{ marginBottom: 20 }}>
              {photoBase64 ? (
                <div style={{ position: "relative", width: 120, height: 90, borderRadius: 10, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={() => { setPhotoBase64(null); if (fileRef.current) fileRef.current.value = ""; }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} style={{ color: "white" }} />
                  </button>
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 10, border: "1px dashed #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: 13, color: "#6b7280" }}>
                  <Camera size={16} /> Tirar foto / Selecionar
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !selectedStore}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: entryType === "entry" ? "#1A56DB" : "#ef4444",
                color: "white", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting || !selectedStore ? 0.6 : 1,
              }}
            >
              {submitting ? "Registrando..." : entryType === "entry" ? "Confirmar Entrada" : "Confirmar Saída"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
