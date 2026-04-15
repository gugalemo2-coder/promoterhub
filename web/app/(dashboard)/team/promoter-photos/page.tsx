"use client";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/utils";
import { Camera, ImagePlus, Plus, X, MessageSquare, Filter } from "lucide-react";
import { useState, useRef, useCallback } from "react";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    approved: { label: "Aprovada", bg: "#d1fae5", color: "#065f46" },
    rejected: { label: "Rejeitada", bg: "#fee2e2", color: "#991b1b" },
    pending: { label: "Pendente", bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[status] ?? map.pending;
  return <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20 }}>{s.label}</span>;
}

/* ── Read-only Comment Panel (modal) for promoter ── */
function ReadOnlyCommentPanel({ photoId, onClose }: { photoId: number; onClose: () => void }) {
  const comments = trpc.photos.listComments.useQuery({ photoId });
  const list = (comments.data ?? []) as any[];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{
        background: "white", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 500,
        maxHeight: "70vh", display: "flex", flexDirection: "column",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb", flexShrink: 0 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Comentários</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={14} style={{ color: "#6b7280" }} />
          </button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
          {comments.isLoading ? (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af", fontSize: 12 }}>
              <div style={{ width: 20, height: 20, border: "2px solid #e5e7eb", borderTopColor: "#1A56DB", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
              Carregando...
            </div>
          ) : list.length === 0 ? (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af", fontSize: 12 }}>
              <MessageSquare size={28} style={{ color: "#d1d5db", margin: "0 auto 8px" }} />
              <p style={{ margin: 0 }}>Nenhum comentário nesta foto</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {list.map((c: any) => (
                <div key={c.id} style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{c.userName ?? "Gestor"}</span>
                    <span style={{ fontSize: 9, color: "#9ca3af" }}>{formatDateTime(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PromoterPhotosPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>(undefined);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadBrand, setUploadBrand] = useState<number | null>(null);
  const [uploadStore, setUploadStore] = useState<number | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
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

  const clearUploadPhoto = () => {
    setUploadBase64(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
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
                <button onClick={() => setCommentPhotoId(photo.id)} style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, padding: 0, border: "none", background: "none", cursor: "pointer", fontSize: 11, color: "#6b7280" }}>
                  <MessageSquare size={12} /> Comentários
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read-only Comment Modal */}
      {commentPhotoId && (
        <ReadOnlyCommentPanel photoId={commentPhotoId} onClose={() => setCommentPhotoId(null)} />
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
                <button onClick={clearUploadPhoto} style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={12} style={{ color: "white" }} /></button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <button onClick={() => cameraRef.current?.click()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 10px", borderRadius: 10, border: "1px solid #bfdbfe", background: "#eff6ff", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#1d4ed8" }}>
                  <Camera size={16} /> Câmera
                </button>
                <button onClick={() => galleryRef.current?.click()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "14px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f9fafb", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#6b7280" }}>
                  <ImagePlus size={16} /> Galeria
                </button>
              </div>
            )}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
            <input ref={galleryRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />

            <button onClick={handleUpload} disabled={uploading || !uploadBrand || !uploadStore || !uploadBase64} style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: "#1A56DB", color: "white", fontSize: 15, fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading || !uploadBrand || !uploadStore || !uploadBase64 ? 0.6 : 1 }}>
              {uploading ? "Enviando..." : "Enviar Foto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
