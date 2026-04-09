"use client";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/utils";
import { useState, useRef, useCallback } from "react";
import {
  AlertTriangle, Camera, ImagePlus, X, Upload, Loader2, MapPin, Trash2,
} from "lucide-react";

type PickedPhoto = { base64: string; fileType: string; preview: string };

export default function ProductExpirationPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [pickedPhotos, setPickedPhotos] = useState<PickedPhoto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.listForPromoter.useQuery();
  const { data: myExpirations, refetch } = trpc.productExpirations.list.useQuery({ limit: 50 });
  const createMutation = trpc.productExpirations.create.useMutation();
  const deleteMutation = trpc.productExpirations.delete.useMutation();

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setPickedPhotos((prev) => [...prev, {
          base64: result.split(",")[1],
          fileType: file.type || "image/jpeg",
          preview: result,
        }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }, []);

  const handleSubmit = async () => {
    if (!selectedBrandId) { showToast("Selecione a marca", "error"); return; }
    if (!selectedStoreId) { showToast("Selecione a loja", "error"); return; }
    if (pickedPhotos.length === 0) { showToast("Adicione pelo menos uma foto", "error"); return; }
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        brandId: selectedBrandId,
        storeId: selectedStoreId,
        description: description || undefined,
        photos: pickedPhotos.map((p) => ({
          fileBase64: p.base64,
          fileType: p.fileType,
          fileName: `expiration-${Date.now()}.jpg`,
        })),
      });
      setShowModal(false);
      setPickedPhotos([]);
      setSelectedBrandId(null);
      setSelectedStoreId(null);
      setDescription("");
      refetch();
      showToast("Registro enviado!", "success");
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao enviar", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este registro?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      refetch();
      showToast("Registro excluído", "success");
    } catch {
      showToast("Erro ao excluir", "error");
    }
  };

  const statusColor = (s: string) => s === "approved" ? "#0E9F6E" : s === "rejected" ? "#E02424" : "#D97706";
  const statusLabel = (s: string) => s === "approved" ? "Aprovado" : s === "rejected" ? "Recusado" : "Pendente";
  const items = (myExpirations ?? []) as any[];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", position: "relative" }}>
      {/* Hidden file inputs — camera vs gallery */}
      <input type="file" ref={cameraRef} accept="image/*" capture="environment" multiple style={{ display: "none" }} onChange={handleFileSelect} />
      <input type="file" ref={galleryRef} accept="image/*" multiple style={{ display: "none" }} onChange={handleFileSelect} />

      {toast && (
        <div style={{
          position: "fixed", top: 16, left: 16, right: 16, zIndex: 999, borderRadius: 12,
          padding: "12px 18px", background: toast.type === "success" ? "#0E9F6E" : "#EF4444",
          color: "white", fontSize: 14, fontWeight: 700, textAlign: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        background: "#1A56DB", padding: "14px 20px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "white", margin: 0 }}>Vencimento de Produtos</h1>
        <button onClick={() => setShowModal(true)} style={{
          background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10,
          padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          color: "white", fontSize: 12, fontWeight: 600,
        }}>
          <AlertTriangle size={14} /> Novo
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 24px" }}>
          <AlertTriangle size={48} style={{ color: "#d1d5db", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Nenhum registro</p>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 16px" }}>Registre produtos próximos do vencimento</p>
          <button onClick={() => setShowModal(true)} style={{
            background: "#1A56DB", border: "none", borderRadius: 14, padding: "10px 20px",
            color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Novo Registro</button>
        </div>
      ) : (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item: any) => (
            <div key={item.id} style={{
              background: "white", borderRadius: 14, padding: 14, border: "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                  background: statusColor(item.status) + "20", color: statusColor(item.status),
                }}>{statusLabel(item.status)}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatDateTime(item.createdAt)}</span>
              </div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: "0 0 4px" }}>
                {item.brandName ?? "Marca"} · {item.storeName ?? "Loja"}
              </p>
              {item.description && <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>{item.description}</p>}
              {item.photos && item.photos.length > 0 && (
                <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 8 }}>
                  {(item.photos as any[]).map((ph: any) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={ph.id} src={ph.photoUrl} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                  ))}
                </div>
              )}
              {item.managerNotes && (
                <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontStyle: "italic" }}>Obs: {item.managerNotes}</p>
              )}
              {item.status === "pending" && (
                <button onClick={() => handleDelete(item.id)} style={{
                  background: "#EF444415", border: "none", borderRadius: 8, padding: "6px 12px",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  color: "#EF4444", fontSize: 11, fontWeight: 600,
                }}><Trash2 size={12} /> Excluir</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
              <button onClick={() => { setShowModal(false); setPickedPhotos([]); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} style={{ color: "#6b7280" }} />
              </button>
              <span style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Registrar Vencimento</span>
              <div style={{ width: 22 }} />
            </div>
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Brand */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Marca</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(brands ?? []).map((b: any) => (
                    <button key={b.id} onClick={() => setSelectedBrandId(b.id)} style={{
                      padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      background: selectedBrandId === b.id ? (b.colorHex ?? "#1A56DB") : (b.colorHex ?? "#1A56DB") + "18",
                      color: selectedBrandId === b.id ? "white" : (b.colorHex ?? "#1A56DB"),
                      fontSize: 12, fontWeight: 600,
                    }}>{b.name}</button>
                  ))}
                </div>
              </div>

              {/* Store */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Loja</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(stores as any[] ?? []).map((s: any) => (
                    <button key={s.id} onClick={() => setSelectedStoreId(s.id)} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: 10, borderRadius: 12,
                      border: selectedStoreId === s.id ? "2px solid #1A56DB" : "1px solid #e5e7eb",
                      background: selectedStoreId === s.id ? "#1A56DB10" : "white", cursor: "pointer", textAlign: "left",
                    }}>
                      <MapPin size={14} style={{ color: selectedStoreId === s.id ? "#1A56DB" : "#9ca3af" }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Descrição (opcional)</p>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                  placeholder="Detalhes sobre os produtos vencidos..."
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb",
                    fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit",
                  }}
                />
              </div>

              {/* Photos — single button that opens option sheet */}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 6px" }}>Fotos ({pickedPhotos.length})</p>
                <button onClick={() => setShowPhotoOptions(true)} style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  border: "1px dashed #d1d5db", background: "#f9fafb",
                  cursor: "pointer", fontSize: 13, color: "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                  <Camera size={16} /> Tirar foto / Selecionar da galeria
                </button>
                {pickedPhotos.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, overflowX: "auto" }}>
                    {pickedPhotos.map((p, i) => (
                      <div key={i} style={{ position: "relative", flexShrink: 0 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.preview} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                        <button onClick={() => setPickedPhotos((prev) => prev.filter((_, idx) => idx !== i))} style={{
                          position: "absolute", top: -4, right: -4, background: "#EF4444", border: "none",
                          borderRadius: "50%", width: 18, height: 18, cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}><X size={10} style={{ color: "white" }} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: "0 20px 20px" }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                width: "100%", padding: "14px 0", borderRadius: 14, border: "none",
                background: "#1A56DB", color: "white", fontSize: 15, fontWeight: 700,
                cursor: submitting ? "wait" : "pointer", opacity: submitting ? 0.7 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {submitting ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={16} />}
                {submitting ? "Enviando..." : "Enviar Registro"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Options Bottom Sheet */}
      {showPhotoOptions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          onClick={() => setShowPhotoOptions(false)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, padding: "20px 20px", paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#d1d5db", margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 14px", textAlign: "center" }}>Adicionar Foto</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button onClick={() => { setShowPhotoOptions(false); setTimeout(() => cameraRef.current?.click(), 100); }} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#111827", width: "100%",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1A56DB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Camera size={18} style={{ color: "white" }} />
                </div>
                Tirar Foto com Câmera
              </button>
              <button onClick={() => { setShowPhotoOptions(false); setTimeout(() => galleryRef.current?.click(), 100); }} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12,
                border: "1px solid #e5e7eb", background: "white", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#111827", width: "100%",
              }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ImagePlus size={18} style={{ color: "white" }} />
                </div>
                Escolher da Galeria
              </button>
            </div>
            <button onClick={() => setShowPhotoOptions(false)} style={{
              width: "100%", padding: "12px", borderRadius: 12, border: "none",
              background: "#f3f4f6", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 10,
            }}>Cancelar</button>
          </div>
        </div>
      )}

      <style>{"@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"}</style>
    </div>
  );
}
