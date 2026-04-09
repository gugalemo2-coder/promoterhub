"use client";

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/lib/auth-context";
import { FolderOpen, RefreshCw, Upload, Download, FileText, Image, Grid, File, X, Loader2, Trash2 } from "lucide-react";
import { useState, useRef } from "react";

function formatFileSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType?.includes("pdf")) return { Icon: FileText, color: "#E02424", bg: "#FEE2E2" };
  if (fileType?.includes("image")) return { Icon: Image, color: "#3B82F6", bg: "#DBEAFE" };
  if (fileType?.includes("excel") || fileType?.includes("spreadsheet")) return { Icon: Grid, color: "#0E9F6E", bg: "#D1FAE5" };
  return { Icon: File, color: "#6B7280", bg: "#F3F4F6" };
}

export default function FilesPage() {
  const { user } = useAuth();
  const isManager = user?.appRole === "manager" || user?.appRole === "master";

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBrandId, setUploadBrandId] = useState<number | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string; size: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: files, isLoading, refetch } = trpc.stockFiles.list.useQuery({
    brandId: selectedBrandId ?? undefined,
  });
  const uploadMutation = trpc.stockFiles.upload.useMutation();
  const deleteMutation = trpc.stockFiles.delete.useMutation({ onSuccess: () => refetch() });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      setSelectedFile({ name: file.name, base64, type: file.type, size: file.size });
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadBrandId) return;
    setUploading(true);
    try {
      await uploadMutation.mutateAsync({
        brandId: uploadBrandId,
        fileBase64: selectedFile.base64,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        description: uploadDesc.trim() || undefined,
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDesc("");
      setUploadBrandId(null);
      refetch();
    } finally {
      setUploading(false);
    }
  };

  const closeModal = () => {
    setShowUploadModal(false);
    setSelectedFile(null);
    setUploadDesc("");
    setUploadBrandId(null);
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 800, margin: "0 auto", paddingBottom: 100, overflowX: "hidden", boxSizing: "border-box", width: "100%" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FolderOpen size={20} style={{ color: "#D97706" }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>Arquivos</h1>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Documentos e materiais por marca</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => refetch()}
            style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid #e5e7eb", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <RefreshCw size={14} style={{ color: "#6b7280" }} />
          </button>
          {isManager && (
            <button
              onClick={() => setShowUploadModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "none", background: "#D97706", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
            >
              <Upload size={14} />
              Enviar
            </button>
          )}
        </div>
      </div>

      {/* Brand Filter */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
        <button
          onClick={() => setSelectedBrandId(null)}
          style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
            border: "none", cursor: "pointer", flexShrink: 0,
            background: selectedBrandId === null ? "#D97706" : "white",
            color: selectedBrandId === null ? "white" : "#6b7280",
            boxShadow: selectedBrandId === null ? "none" : "0 0 0 1px #e5e7eb",
          }}
        >
          Todos
        </button>
        {brands?.map((brand: any) => (
          <button
            key={brand.id}
            onClick={() => setSelectedBrandId(brand.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
              border: "none", cursor: "pointer", flexShrink: 0,
              background: selectedBrandId === brand.id ? (brand.colorHex ?? "#6B7280") : "white",
              color: selectedBrandId === brand.id ? "white" : "#6b7280",
              boxShadow: selectedBrandId === brand.id ? "none" : "0 0 0 1px #e5e7eb",
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: selectedBrandId === brand.id ? "rgba(255,255,255,0.7)" : (brand.colorHex ?? "#6B7280"), flexShrink: 0 }} />
            {brand.name}
          </button>
        ))}
      </div>

      {/* Upload Modal - only for managers */}
      {showUploadModal && isManager && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div style={{ background: "white", borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #f3f4f6" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>Enviar Arquivo</h2>
              <button onClick={closeModal} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={16} style={{ color: "#6b7280" }} />
              </button>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 8, display: "block" }}>Marca *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {brands?.map((b: any) => (
                    <button key={b.id} onClick={() => setUploadBrandId(b.id)} style={{
                      padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      border: `2px solid ${uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : "#E5E7EB"}`,
                      background: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") + "15" : "transparent",
                      color: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : "#6B7280",
                    }}>
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Descrição (opcional)</label>
                <input type="text" value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} placeholder="Descreva o arquivo..." style={{ width: "100%", border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6, display: "block" }}>Arquivo *</label>
                <input ref={fileInputRef} type="file" accept=".pdf,image/*,.xls,.xlsx" style={{ display: "none" }} onChange={handleFileChange} />
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: "100%", border: `2px dashed ${selectedFile ? "#D97706" : "#e5e7eb"}`, borderRadius: 12, padding: 16,
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
                  background: selectedFile ? "#FEF3C7" : "#f9fafb", boxSizing: "border-box",
                }}>
                  <Upload size={18} style={{ color: selectedFile ? "#D97706" : "#9ca3af", flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                    {selectedFile ? (
                      <>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedFile.name}</p>
                        <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0" }}>{formatFileSize(selectedFile.size)}</p>
                      </>
                    ) : (
                      <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>PDF, imagem ou Excel</p>
                    )}
                  </div>
                </button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, padding: "16px 20px", borderTop: "1px solid #f3f4f6" }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white", fontSize: 13, fontWeight: 600, color: "#6b7280", cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleUpload} disabled={uploading || !selectedFile || !uploadBrandId} style={{
                flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "#D97706", color: "white",
                fontSize: 13, fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer",
                opacity: uploading || !selectedFile || !uploadBrandId ? 0.5 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                {uploading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
                {uploading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List - Card layout */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <Loader2 size={28} style={{ color: "#D97706", animation: "spin 1s linear infinite", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>Carregando...</p>
        </div>
      ) : !files || files.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <FolderOpen size={24} style={{ color: "#D97706" }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Nenhum arquivo encontrado</p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {isManager ? "Clique em \"Enviar\" para distribuir documentos." : "Ainda não há arquivos disponíveis."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {files.map((file: any, idx: number) => {
            const brand = brands?.find((b: any) => b.id === file.brandId);
            const { Icon, color, bg } = getFileIcon(file.fileType ?? "");
            return (
              <a
                key={`${file.id}-${idx}`}
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: "white", borderRadius: 14, padding: "14px 16px",
                  border: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 12,
                  textDecoration: "none", color: "inherit", boxSizing: "border-box",
                  width: "100%", minWidth: 0,
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.fileName}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                    {brand && (
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 600, color: brand.colorHex ?? "#6B7280",
                        background: (brand.colorHex ?? "#6B7280") + "18", padding: "1px 8px", borderRadius: 10,
                      }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: brand.colorHex ?? "#6B7280" }} />
                        {brand.name}
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{formatFileSize(file.fileSize ?? 0)}</span>
                  </div>
                </div>
                <Download size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
                {isManager && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (confirm(`Excluir "${file.fileName}"?`)) {
                        deleteMutation.mutate({ id: file.id });
                      }
                    }}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 4,
                      flexShrink: 0, borderRadius: 6,
                    }}
                  >
                    <Trash2 size={16} style={{ color: "#ef4444" }} />
                  </button>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
