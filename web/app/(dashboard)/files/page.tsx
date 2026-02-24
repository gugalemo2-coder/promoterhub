"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { FolderOpen, RefreshCw, Upload, Download, FileText, Image, Grid, File, X, Loader2 } from "lucide-react";
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
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Arquivos"
        subtitle="Documentos e materiais distribuídos por marca"
        icon={FolderOpen}
        iconColor="text-yellow-600"
        iconBg="bg-yellow-50"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              <Upload size={14} />
              Enviar Arquivo
            </button>
          </div>
        }
      />

      {/* Brand Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedBrandId(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
            selectedBrandId === null
              ? "bg-yellow-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          Todos
        </button>
        {brands?.map((brand) => (
          <button
            key={brand.id}
            onClick={() => setSelectedBrandId(brand.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              selectedBrandId === brand.id
                ? "text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            style={selectedBrandId === brand.id ? { backgroundColor: brand.colorHex ?? "#6B7280" } : {}}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selectedBrandId === brand.id ? "rgba(255,255,255,0.7)" : (brand.colorHex ?? "#6B7280") }}
            />
            {brand.name}
          </button>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Enviar Arquivo</h2>
              <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Brand selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {brands?.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setUploadBrandId(b.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-colors"
                      style={{
                        borderColor: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : "#E5E7EB",
                        backgroundColor: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") + "15" : "transparent",
                        color: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : "#6B7280",
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição (opcional)</label>
                <input
                  type="text"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  placeholder="Descreva o arquivo..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              {/* File picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Arquivo <span className="text-red-500">*</span></label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/*,.xls,.xlsx"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl p-4 flex items-center gap-3 transition-colors ${
                    selectedFile
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Upload size={20} className={selectedFile ? "text-yellow-600" : "text-gray-400"} />
                  <div className="flex-1 text-left">
                    {selectedFile ? (
                      <>
                        <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">Clique para selecionar um arquivo (PDF, imagem, Excel)</p>
                    )}
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !uploadBrandId}
                className="flex-1 px-4 py-2.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
        </div>
      ) : !files || files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-16 h-16 bg-yellow-50 rounded-2xl flex items-center justify-center">
            <FolderOpen size={28} className="text-yellow-400" />
          </div>
          <p className="text-lg font-semibold text-gray-700">Nenhum arquivo encontrado</p>
          <p className="text-sm text-gray-400">Clique em &quot;Enviar Arquivo&quot; para distribuir documentos aos promotores.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Arquivo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Marca</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Tamanho</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Data</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {files.map((file, idx) => {
                const brand = brands?.find((b) => b.id === file.brandId);
                const { Icon, color, bg } = getFileIcon(file.fileType ?? "");
                return (
                  <tr key={`${file.id}-${idx}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bg }}>
                          <Icon size={20} style={{ color }} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.fileName}</p>
                          {file.description && (
                            <p className="text-xs text-gray-400 truncate max-w-xs">{file.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      {brand ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: (brand.colorHex ?? "#6B7280") + "20", color: brand.colorHex ?? "#6B7280" }}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: brand.colorHex ?? "#6B7280" }} />
                          {brand.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{formatFileSize(file.fileSize ?? 0)}</span>
                    </td>
                    <td className="px-4 py-4 text-center hidden lg:table-cell">
                      <span className="text-xs text-gray-500">
                        {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        <Download size={12} />
                        Abrir
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
