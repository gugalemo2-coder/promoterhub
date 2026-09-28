"use client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime, formatHours } from "@/lib/utils";
import { Clock, MapPin, ChevronLeft, ChevronRight, Camera, ImagePlus, LogIn, LogOut, X, RefreshCw } from "lucide-react";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";

// Helper: retorna a data LOCAL no formato YYYY-MM-DD (sem converter para UTC)
function getLocalDateStr(d?: Date): string {
  const date = d ?? new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper: horário no formato 08:05
function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Helper: tempo decorrido desde a entrada (ex.: "3h 58min")
function formatElapsed(from: Date | string, now: number): string {
  const totalMin = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

type OpenEntry = { id: number; storeId: number; storeName: string | null; entryTime: Date | string } | null;

export default function PromoterClockPage() {
  useAuth();
  const utils = trpc.useUtils();
  const [selectedDate, setSelectedDate] = useState(() => getLocalDateStr());
  const [showModal, setShowModal] = useState(false);
  const [entryType, setEntryType] = useState<"entry" | "exit">("entry");
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const dayStartISO = `${selectedDate}T00:00:00`;
  const dayEndISO = `${selectedDate}T23:59:59`;

  const stores = trpc.stores.listForPromoter.useQuery();
  const entries = trpc.timeEntries.list.useQuery({ startDate: dayStartISO, endDate: dayEndISO });
  const dailySummary = trpc.timeEntries.dailySummary.useQuery({ startDate: dayStartISO, endDate: dayEndISO });
  const createEntry = trpc.timeEntries.create.useMutation();

  // Situação do ponto (entrada aberta ou não) — SEMPRE buscada do servidor.
  // O promotor costuma abrir o app horas depois (ex.: entrada 08h, saída 12h),
  // então rebusca ao abrir a tela, ao voltar para o app e a cada minuto.
  const openQuery = trpc.timeEntries.lastOpenEntry.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  });
  const openEntry = (openQuery.data ?? null) as OpenEntry;

  // Atualiza o contador "há X horas" a cada 30 segundos
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Ao voltar para o app (PWA reaberto), atualiza tudo imediatamente
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        utils.timeEntries.invalidate();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [utils]);

  const storeList = stores.data ?? [];
  const entryList = (entries.data ?? []) as any[];
  const summaryData = dailySummary.data as any;

  const storeMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const s of storeList as any[]) {
      map.set(s.id, s.name);
    }
    return map;
  }, [storeList]);

  const getStoreName = (entry: any): string => {
    if (entry.storeName) return entry.storeName;
    if (entry.storeId && storeMap.has(entry.storeId)) return storeMap.get(entry.storeId)!;
    return "Loja desconhecida";
  };

  const openStoreName = openEntry
    ? openEntry.storeName ?? storeMap.get(openEntry.storeId) ?? "Loja desconhecida"
    : "";

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), error ? 5000 : 3000);
  };

  const navigateDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + dir);
    setSelectedDate(getLocalDateStr(d));
  };

  const isToday = selectedDate === getLocalDateStr();

  const openModal = (type: "entry" | "exit") => {
    setEntryType(type);
    setSelectedStore(null);
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
    if (submitting) return; // evita toque duplo
    if (entryType === "entry" && !selectedStore) { showToast("Selecione uma loja", true); return; }
    setSubmitting(true);
    try {
      const result = await createEntry.mutateAsync({
        // Na saída, a loja é definida pelo servidor (mesma loja da entrada)
        storeId: entryType === "entry" ? selectedStore! : undefined,
        entryType,
        photoBase64: photoBase64 ?? undefined,
        photoFileType: "image/jpeg",
      });

      // Atualiza a tela na hora com o novo estado devolvido pelo servidor
      utils.timeEntries.lastOpenEntry.setData(undefined, result.openEntry as any);
      showToast(entryType === "entry" ? "Entrada registrada!" : "Saída registrada!");
      setShowModal(false);
    } catch (err: any) {
      // Ex.: já existe entrada aberta — mostra o motivo e corrige a tela
      showToast(err?.message ?? "Erro ao registrar", true);
      setShowModal(false);
    } finally {
      setSubmitting(false);
      // Confirma tudo com o servidor (lista, resumo e situação do ponto)
      utils.timeEntries.invalidate();
    }
  };

  const clearPhoto = () => {
    setPhotoBase64(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const bigButton = (color: string): React.CSSProperties => ({
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "16px", borderRadius: 12, border: "none", background: color,
    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
  });

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto", paddingBottom: 100 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: toast.error ? "#b91c1c" : "#065f46", color: "white", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", maxWidth: "90vw", textAlign: "center" }}>
          {toast.msg}
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

      {/* Ação do ponto — mostra SÓ o botão permitido no momento */}
      {isToday && (
        <div style={{ marginBottom: 24 }}>
          {openQuery.isLoading ? (
            <div style={{ textAlign: "center", padding: 20, color: "#9ca3af", fontSize: 13, background: "white", borderRadius: 12, border: "1px solid #e5e7eb" }}>
              <div style={{ width: 20, height: 20, border: "2px solid #e5e7eb", borderTopColor: "#1A56DB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
              Verificando seu ponto...
            </div>
          ) : openQuery.isError ? (
            <div style={{ textAlign: "center", padding: 16, background: "#fef2f2", borderRadius: 12, border: "1px solid #fecaca" }}>
              <p style={{ fontSize: 13, color: "#b91c1c", margin: "0 0 10px", fontWeight: 600 }}>Não foi possível verificar seu ponto. Confira sua internet.</p>
              <button onClick={() => openQuery.refetch()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "none", background: "#b91c1c", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                <RefreshCw size={14} /> Tentar novamente
              </button>
            </div>
          ) : openEntry ? (
            <div style={{ background: "#f0fdf4", borderRadius: 14, border: "1px solid #bbf7d0", padding: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#16a34a", margin: "0 0 6px", letterSpacing: 0.5 }}>● VOCÊ ESTÁ EM EXPEDIENTE</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <MapPin size={16} style={{ color: "#16a34a" }} />
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{openStoreName}</p>
              </div>
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 14px" }}>
                Entrada às {formatTime(openEntry.entryTime)} · há {formatElapsed(openEntry.entryTime, now)}
              </p>
              <button onClick={() => openModal("exit")} style={bigButton("#ef4444")}>
                <LogOut size={18} /> Registrar Saída
              </button>
            </div>
          ) : (
            <button onClick={() => openModal("entry")} style={bigButton("#1A56DB")}>
              <LogIn size={18} /> Registrar Entrada
            </button>
          )}
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

            {entryType === "entry" ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Selecione a Loja</label>
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
              </>
            ) : (
              <>
                {/* Na saída a loja é fixa: a mesma da entrada aberta */}
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Loja</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: 10, border: "2px solid #ef4444", background: "#fef2f2", marginBottom: 6 }}>
                  <MapPin size={16} style={{ color: "#ef4444" }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{openStoreName}</span>
                </div>
                <p style={{ fontSize: 11, color: "#6b7280", margin: "0 0 20px" }}>
                  A saída é registrada na mesma loja da sua entrada{openEntry ? ` (${formatTime(openEntry.entryTime)})` : ""}.
                </p>
              </>
            )}

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Foto (opcional)</label>
            <div style={{ marginBottom: 20 }}>
              {photoBase64 ? (
                <div style={{ position: "relative", width: 120, height: 90, borderRadius: 10, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`data:image/jpeg;base64,${photoBase64}`} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button onClick={clearPhoto} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={12} style={{ color: "white" }} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 10px", borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                    <Camera size={16} /> Câmera
                  </button>
                  <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>
                    <ImagePlus size={16} /> Galeria
                  </button>
                </div>
              )}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: "none" }} />
              <input ref={galleryRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || (entryType === "entry" && !selectedStore)}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: entryType === "entry" ? "#1A56DB" : "#ef4444",
                color: "white", fontSize: 15, fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting || (entryType === "entry" && !selectedStore) ? 0.6 : 1,
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
