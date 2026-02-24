"use client";

import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";
import { Camera, RefreshCw, CheckCircle, XCircle, Clock, Download, ExternalLink } from "lucide-react";
import { useState } from "react";

type PhotoStatus = "pending" | "approved" | "rejected" | "all";

function downloadFile(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export default function PhotosPage() {
  const [status, setStatus] = useState<PhotoStatus>("all");
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>(undefined);
  const [downloading, setDownloading] = useState<number | null>(null);

  const photos = trpc.photos.listAll.useQuery({
    status: status === "all" ? undefined : status,
    brandId: selectedBrand,
    limit: 100,
  });

  const brands = trpc.brandsAdmin.listAll.useQuery();
  const approvePhoto = trpc.photos.updateStatus.useMutation();

  const data = photos.data ?? [];
  const brandList = brands.data ?? [];

  const statusTabs: { key: PhotoStatus; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "Todas", icon: <Camera size={13} /> },
    { key: "pending", label: "Pendentes", icon: <Clock size={13} /> },
    { key: "approved", label: "Aprovadas", icon: <CheckCircle size={13} /> },
    { key: "rejected", label: "Rejeitadas", icon: <XCircle size={13} /> },
  ];

  const handleApprove = async (id: number) => {
    await approvePhoto.mutateAsync({ id, status: "approved" });
    photos.refetch();
  };

  const handleReject = async (id: number) => {
    const notes = window.prompt("Motivo da rejeição (opcional):");
    await approvePhoto.mutateAsync({ id, status: "rejected", managerNotes: notes ?? undefined });
    photos.refetch();
  };

  const handleDownload = async (photo: (typeof data)[0], idx: number) => {
    if (!photo.photoUrl) return;
    setDownloading(photo.id);
    try {
      const promoterName = ((photo as any).promoterName ?? "promotor").replace(/\s+/g, "-").toLowerCase();
      const storeName = ((photo as any).storeName ?? "pdv").replace(/\s+/g, "-").toLowerCase();
      const date = new Date(photo.createdAt ?? Date.now()).toISOString().slice(0, 10);
      const ext = photo.photoUrl.split("?")[0].split(".").pop() ?? "jpg";
      const filename = `foto-${promoterName}-${storeName}-${date}-${idx + 1}.${ext}`;

      // Fetch as blob to force download (avoids browser opening the image)
      const response = await fetch(photo.photoUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      downloadFile(objectUrl, filename);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch {
      // Fallback: open in new tab
      window.open(photo.photoUrl, "_blank");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    const approved = data.filter((p) => p.photoUrl);
    if (approved.length === 0) return;
    for (let i = 0; i < approved.length; i++) {
      await handleDownload(approved[i], i);
      // Small delay to avoid browser blocking multiple downloads
      if (i < approved.length - 1) await new Promise((r) => setTimeout(r, 400));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Fotos dos Promotores"
        subtitle={`${data.length} fotos encontradas`}
        icon={Camera}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
        actions={
          <div className="flex items-center gap-2">
            {data.filter((p) => p.photoUrl).length > 0 && (
              <button
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-3 py-2 text-sm text-purple-700 hover:text-purple-900 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                <Download size={14} />
                Baixar Todas ({data.filter((p) => p.photoUrl).length})
              </button>
            )}
            <button
              onClick={() => photos.refetch()}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={14} />
              Atualizar
            </button>
          </div>
        }
      />

      {/* Status Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatus(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === tab.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {/* Brand filter */}
        <select
          value={selectedBrand ?? ""}
          onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : undefined)}
          className="ml-auto px-3 py-1.5 text-xs border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Todas as marcas</option>
          {brandList.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Photos Grid */}
      {photos.isLoading ? (
        <div className="text-center py-20 text-gray-400">Carregando fotos...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Camera size={40} className="mx-auto mb-3 opacity-30" />
          <p>Nenhuma foto encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {data.map((photo, idx) => (
            <div key={photo.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
              {/* Image */}
              <div className="relative aspect-square bg-gray-100">
                {photo.photoUrl ? (
                  <>
                    <img
                      src={photo.photoUrl}
                      alt="Foto do promotor"
                      className="w-full h-full object-cover"
                    />
                    {/* Hover overlay with download + open */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => handleDownload(photo, idx)}
                        disabled={downloading === photo.id}
                        title="Baixar foto"
                        className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm disabled:opacity-60"
                      >
                        {downloading === photo.id ? (
                          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Download size={15} className="text-gray-700" />
                        )}
                      </button>
                      <a
                        href={photo.photoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir em nova aba"
                        className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors shadow-sm"
                      >
                        <ExternalLink size={15} className="text-gray-700" />
                      </a>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera size={24} className="text-gray-300" />
                  </div>
                )}
                {/* Status overlay */}
                <div className="absolute top-2 left-2">
                  <StatusBadge status={photo.status ?? "pending"} />
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {(photo as any).promoterName ?? "Promotor"}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {(photo as any).storeName ?? "PDV"} · {(photo as any).brandName ?? ""}
                </p>
                <p className="text-xs text-gray-400 mt-1">{formatDateTime(photo.createdAt)}</p>

                {/* Manager notes for rejected */}
                {photo.status === "rejected" && (photo as any).managerNotes && (
                  <p className="text-xs text-red-500 mt-1 italic truncate">
                    &ldquo;{(photo as any).managerNotes}&rdquo;
                  </p>
                )}

                {/* Actions for pending */}
                {photo.status === "pending" && (
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => handleApprove(photo.id)}
                      disabled={approvePhoto.isPending}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={11} />
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleReject(photo.id)}
                      disabled={approvePhoto.isPending}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={11} />
                      Rejeitar
                    </button>
                  </div>
                )}

                {/* Download button for approved photos */}
                {photo.status === "approved" && photo.photoUrl && (
                  <button
                    onClick={() => handleDownload(photo, idx)}
                    disabled={downloading === photo.id}
                    className="w-full flex items-center justify-center gap-1 py-1 mt-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors disabled:opacity-50"
                  >
                    {downloading === photo.id ? (
                      <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download size={11} />
                    )}
                    Baixar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
