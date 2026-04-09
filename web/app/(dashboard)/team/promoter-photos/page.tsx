"use client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/utils";
import { Camera, ImagePlus, Plus, X, MessageSquare, Send, Filter } from "lucide-react";
import { useState, useRef, useCallback } from "react";

type TabKey = "photos" | "comments";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    approved: { label: "Aprovada", bg: "#d1fae5", color: "#065f46" },
    rejected: { label: "Rejeitada", bg: "#fee2e2", color: "#991b1b" },
    pending: { label: "Pendente", bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[status] ?? map.pending;
  return <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{s.label}</span>;
}

export default function PromoterPhotosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("photos");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>(undefined);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBrand, setUploadBrand] = useState<number | null>(null);
  const [uploadStore, setUploadStore] = useState<number | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [commentText, setCommentText] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<number | null>(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const photos = trpc.photos.list.useQuery({
    status: statusFilter === "all" ? undefined : (statusFilter as any),
    brandId: selectedBrand,
    limit: 100,
  });
  const brands = trpc.brands.list.useQuery();
  const stores = trpc.stores.listForPromoter.useQuery();
  const upload = trpc.photos.upload.useMutation();

  const comments = trpc.photos.listComments.useQuery(
    { photoId: selectedPhotoId! },
    { enabled: !!selectedPhotoId }
  );
  const addComment = trpc.photos.addComment.useMutation();

  const photoList = (photos.data ?? []) as any[];
  const brandList = (brands.data ?? []) as any[];
  const storeList = (stores.data ?? []) as any[];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadBase64(result.split(",")[1] ?? result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const handleUpload = async () => {
    if (!uploadBrand || !uploadStore || !uploadBase64) { showToast("Preencha todos os campos"); return; }
    setUploading(true);
    try {
      await upload.mutateAsync({ brandId: uploadBrand, storeId: uploadStore, fileBase64: uploadBase64, fileType: "image/jpeg" });
      showToast("Foto enviada com sucesso!");
      setShowUpload(false);
      setUploadBase64(null);
      setUploadBrand(null);
      setUploadStore(null);
      photos.refetch();
    } catch (err: any) {
      showToast(err?.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedPhotoId || !commentText.trim()) return;
    try {
      await addComment.mutateAsync({ photoId: selectedPhotoId, comment: commentText.trim() });
      setCommentText("");
      comments.refetch();
    } catch { showToast("Erro ao comentar"); }
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 600, margin: "0 auto" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#065f46", color: "white", padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)" }}>{toast}</div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Minhas Fotos</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "2px 0 0" }}>{photoList.length} foto(s)</p>
        </div>
        <button onClick={() => setShowUpload(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", background: "#1A56DB", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          <Plus size={16} /> Enviar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {[{ key: "photos" as TabKey, label: "Fotos" }, { key: "comments" as TabKey, label: "Comentários" }].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "7px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: tab === t.key ? "#1A56DB" : "#f3f4f6", color: tab === t.key ? "white" : "#6b7280" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "photos" && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Filter size={14} style={{ color: "#9ca3af" }} />
            {["all", "pending", "approved", "rejected"].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "4px 12px", borderRadius: 16, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: statusFilter === s ? "#1A56DB" : "#f3f4f6", color: statusFilter === s ? "white" : "#6b7280" }}>
                {s === "all" ? "Todas" : s === "pending" ? "Pendentes" : s === "approved" ? "Aprovadas" : "Rejeitadas"}
              </button>
            ))}
            <select value={selectedBrand ?? ""} onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "5px 8px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 11, color: "#374151", background: "white", cursor: "pointer" }}>
              <option value="">Todas marcas</option>
              {brandList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Photo Grid */}
          {photos.isLoading ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 13 }}>
              <div style={{ width: 24, height: 24, border: "2px solid #e5e7eb", borderTopColor: "#1A56DB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
              Carregando...
            </div>
          ) : photoList.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#9ca3af", fontSize: 13 }}>
              <Camera size={36} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
              Nenhuma foto encontrada
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
              {photoList.map((photo: any) => (
                <div key={photo.id} style={{ background: "white", borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                  <div style={{ position: "relative", aspectRatio: "4/3", background: "#f3f4f6" }}>
                    {photo.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Camera size={24} style={{ color: "#d1d5db" }} /></div>
                    )}
                    <div style={{ position: "absolute", top: 6, right: 6 }}><StatusPill status={photo.status ?? "pending"} /></div>
                  </div>
                  <div style={{ padding: "8px 10px" }}>
                    <p style={{ fontSize: 11, color: "#6b7280", margin: 0 }}>{photo.brandName ?? ""}{photo.storeName ? ` · ${photo.storeName}` : ""}</p>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: "2px 0 0" }}>{formatDateTime(photo.createdAt)}</p>
                    <button onClick={() => setSelectedPhotoId(selectedPhotoId === photo.id ? null : photo.id)} style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>
                      <MessageSquare size={12} /> Comentários
                    </button>
                  </div>
                  {selectedPhotoId === photo.id && (
                    <div style={{ borderTop: "1px solid #f3f4f6", padding: "8px 10px" }}>
                      {comments.isLoading ? (
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>Carregando...</p>
                      ) : (comments.data ?? []).length === 0 ? (
                        <p style={{ fontSize: 11, color: "#9ca3af" }}>Sem comentários</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6, maxHeight: 120, overflow: "auto" }}>
                          {(comments.data ?? []).map((c: any) => (
                            <div key={c.id} style={{ fontSize: 11, color: "#374151" }}>
                              <span style={{ fontWeight: 600 }}>{c.userName ?? "Usuário"}</span>: {c.text}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 6 }}>
                        <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Comentar..." style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 11, outline: "none" }} onKeyDown={(e) => e.key === "Enter" && handleAddComment()} />
                        <button onClick={handleAddComment} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#1A56DB", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={12} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "comments" && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af", fontSize: 13 }}>
          <MessageSquare size={32} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
          <p style={{ margin: 0 }}>Clique em &quot;Comentários&quot; em qualquer foto na aba Fotos para ver e adicionar comentários.</p>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500, padding: "24px 20px", paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))", maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0 }}>Enviar Foto</h3>
              <button onClick={() => setShowUpload(false)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={16} style={{ color: "#6b7280" }} /></button>
            </div>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Marca</label>
            <select value={uploadBrand ?? ""} onChange={(e) => setUploadBrand(e.target.value ? Number(e.target.value) : null)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 14 }}>
              <option value="">Selecione...</option>
              {brandList.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Loja</label>
            <select value={uploadStore ?? ""} onChange={(e) => setUploadStore(e.target.value ? Number(e.target.value) : null)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 13, marginBottom: 14 }}>
              <option value="">Selecione...</option>
              {storeList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Foto</label>
            {uploadBase64 ? (
              <div style={{ position: "relative", width: 140, height: 105, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/jpeg;base64,${uploadBase64}`} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                <button onClick={() => { setUploadBase64(null); if (cameraRef.current) cameraRef.current.value = ""; if (galleryRef.current) galleryRef.current.value = ""; }} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} style={{ color: "white" }} /></button>
              </div>
            ) : (
              <button onClick={() => setShowPhotoOptions(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderRadius: 10, border: "1px dashed #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: 13, color: "#6b7280", marginBottom: 14, width: "100%" }}>
                <Camera size={16} /> Tirar foto / Selecionar
              </button>
            )}
            {/* Hidden file inputs — camera vs gallery */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
            <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

            <button onClick={handleUpload} disabled={uploading || !uploadBrand || !uploadStore || !uploadBase64} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#1A56DB", color: "white", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading || !uploadBrand || !uploadStore || !uploadBase64 ? 0.6 : 1 }}>
              {uploading ? "Enviando..." : "Enviar Foto"}
            </button>
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
    </div>
  );
}
