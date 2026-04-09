"use client";
import { trpc } from "@/lib/trpc";
import { formatDateTime } from "@/lib/utils";
import {
  Camera, RefreshCw, CheckCircle, XCircle, Download,
  ExternalLink, Filter, X, CheckSquare, Square, Archive,
  MessageSquare, Send, Maximize2,
} from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import JSZip from "jszip";

type PhotoStatus = "pending" | "approved" | "rejected" | "all";

interface Photo {
  id: number;
  photoUrl?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  brandId?: number | null;
  userId?: number | null;
  storeId?: number | null;
  [key: string]: unknown;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    approved: { label: "Aprovada", bg: "#d1fae5", color: "#065f46" },
    rejected: { label: "Rejeitada", bg: "#fee2e2", color: "#991b1b" },
    pending:  { label: "Pendente",  bg: "#fef3c7", color: "#92400e" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700, padding: "2px 7px",
      borderRadius: 20, whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function PhotoCard({
  photo, idx, selected, onSelect, onApprove, onReject, onDownload, downloading, selectMode,
  onOpenComments, commentPhotoId, onOpenGallery,
}: {
  photo: Photo; idx: number; selected: boolean;
  onSelect: (id: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  onDownload: (photo: Photo, idx: number) => void;
  downloading: number | null;
  selectMode: boolean;
  onOpenComments: (id: number) => void;
  commentPhotoId: number | null;
  onOpenGallery: (idx: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const promoterName = (photo.promoterName as string) ?? "Promotor";
  const storeName = (photo.storeName as string) ?? "PDV";
  const brandName = (photo.brandName as string) ?? "";
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => selectMode && onSelect(photo.id)}
      style={{
        background: "white", borderRadius: 12, overflow: "hidden",
        border: selected ? "2px solid #1A56DB" : "2px solid transparent",
        boxShadow: hovered ? "0 4px 20px rgba(0,0,0,0.10)" : "0 1px 4px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s, border-color 0.15s",
        cursor: selectMode ? "pointer" : "default", position: "relative",
      }}
    >
      <div style={{ position: "relative", aspectRatio: "4/3", background: "#f3f4f6", overflow: "hidden", cursor: "pointer" }}
        onClick={() => { if (!selectMode && photo.photoUrl) onOpenGallery(idx); }}
      >
        {photo.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.photoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={28} style={{ color: "#d1d5db" }} />
          </div>
        )}
        {(hovered || selected) && !selectMode && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); onOpenGallery(idx); }} title="Ver em tela cheia"
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Maximize2 size={15} style={{ color: "#374151" }} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDownload(photo, idx); }} disabled={downloading === photo.id} title="Baixar"
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {downloading === photo.id ? <div style={{ width: 14, height: 14, border: "2px solid #6b7280", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <Download size={15} style={{ color: "#374151" }} />}
            </button>
            <a href={photo.photoUrl ?? "#"} target="_blank" rel="noopener noreferrer" title="Abrir em nova aba"
              onClick={(e) => e.stopPropagation()}
              style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.9)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
              <ExternalLink size={15} style={{ color: "#374151" }} />
            </a>
          </div>
        )}
        <div onClick={(e) => { e.stopPropagation(); onSelect(photo.id); }}
          style={{ position: "absolute", top: 8, left: 8, opacity: selectMode || selected ? 1 : hovered ? 0.8 : 0, transition: "opacity 0.15s", cursor: "pointer" }}>
          {selected ? <CheckSquare size={20} style={{ color: "#1A56DB", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} /> : <Square size={20} style={{ color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }} />}
        </div>
        <div style={{ position: "absolute", top: 8, right: 8 }}><StatusPill status={photo.status ?? "pending"} /></div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{promoterName}</p>
        <p style={{ fontSize: 11, color: "#6b7280", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{storeName}{brandName ? ` · ${brandName}` : ""}</p>
        <p style={{ fontSize: 10, color: "#9ca3af", margin: "3px 0 0" }}>{formatDateTime(photo.createdAt as string)}</p>
        <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
          {photo.status === "pending" && (
            <>
              <button onClick={() => onApprove(photo.id)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "#d1fae5", color: "#065f46", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                <CheckCircle size={11} /> Aprovar
              </button>
              <button onClick={() => onReject(photo.id)} style={{ flex: 1, padding: "6px 0", borderRadius: 7, border: "none", background: "#fee2e2", color: "#991b1b", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                <XCircle size={11} /> Rejeitar
              </button>
            </>
          )}
          <button onClick={() => onOpenComments(photo.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #e5e7eb", background: commentPhotoId === photo.id ? "#eff6ff" : "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MessageSquare size={12} style={{ color: commentPhotoId === photo.id ? "#1A56DB" : "#9ca3af" }} />
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentPanel({ photoId, onClose }: { photoId: number; onClose: () => void }) {
  const [text, setText] = useState("");
  const comments = trpc.photos.listComments.useQuery({ photoId });
  const addComment = trpc.photos.addComment.useMutation();
  const deleteComment = trpc.photos.deleteComment.useMutation();

  const handleAdd = async () => {
    if (!text.trim()) return;
    await addComment.mutateAsync({ photoId, comment: text.trim() });
    setText("");
    comments.refetch();
  };

  const handleDelete = async (id: number) => {
    await deleteComment.mutateAsync({ id });
    comments.refetch();
  };

  const list = (comments.data ?? []) as any[];

  return (
    <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 340, background: "white", boxShadow: "-4px 0 20px rgba(0,0,0,0.1)", zIndex: 60, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>Comentários</h3>
        <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "#f3f4f6", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} style={{ color: "#6b7280" }} /></button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
        {comments.isLoading ? (
          <p style={{ fontSize: 12, color: "#9ca3af" }}>Carregando...</p>
        ) : list.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", paddingTop: 20 }}>Nenhum comentário ainda</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((c: any) => (
              <div key={c.id} style={{ padding: "8px 10px", background: "#f9fafb", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{c.userName ?? "Usuário"}</span>
                  <button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                    <X size={12} style={{ color: "#d1d5db" }} />
                  </button>
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{c.text}</p>
                <p style={{ fontSize: 9, color: "#9ca3af", margin: "4px 0 0" }}>{formatDateTime(c.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e7eb", display: "flex", gap: 8 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escrever comentário..." onKeyDown={(e) => e.key === "Enter" && handleAdd()} style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, outline: "none" }} />
        <button onClick={handleAdd} disabled={!text.trim()} style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: "#1A56DB", color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: text.trim() ? 1 : 0.5 }}><Send size={14} /></button>
      </div>
    </div>
  );
}

/* ── iPhone-style Fullscreen Gallery ── */
function FullscreenGallery({
  data, initialIndex, onClose, onApprove, onReject, onComment,
}: {
  data: Photo[]; initialIndex: number; onClose: () => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number) => Promise<void>;
  onComment: (id: number) => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);

  // Zoom/pan state via ref for 60fps touch performance
  const stateRef = useRef({
    scale: 1, tx: 0, ty: 0,
    // Pinch
    pinchStartDist: 0, pinchStartScale: 1,
    pinchCenterX: 0, pinchCenterY: 0,
    // Pan
    panStartX: 0, panStartY: 0, panStartTx: 0, panStartTy: 0,
    isPanning: false, isPinching: false,
    // Swipe
    swipeStartX: 0, swipeStartY: 0, swipeStartTime: 0,
    // Double-tap
    lastTapTime: 0, lastTapX: 0, lastTapY: 0,
    // Animation
    animating: false,
  });

  // Force re-render for scale display
  const [, forceUpdate] = useState(0);

  const photo = data[index];
  if (!photo) { onClose(); return null; }

  const promoterName = (photo.promoterName as string) ?? "Promotor";
  const storeName = (photo.storeName as string) ?? "PDV";
  const brandName = (photo.brandName as string) ?? "";
  const dateStr = formatDateTime(photo.createdAt as string);
  const isPending = photo.status === "pending";

  const applyTransform = () => {
    const img = containerRef.current?.querySelector("img");
    if (!img) return;
    const s = stateRef.current;
    img.style.transform = `translate(${s.tx}px, ${s.ty}px) scale(${s.scale})`;
    img.style.transition = s.animating ? "transform 0.3s cubic-bezier(0.2, 0, 0, 1)" : "none";
  };

  const clampPan = () => {
    const s = stateRef.current;
    if (s.scale <= 1) { s.tx = 0; s.ty = 0; return; }
    const el = containerRef.current;
    if (!el) return;
    const img = el.querySelector("img");
    if (!img) return;
    const rect = el.getBoundingClientRect();
    const imgW = img.naturalWidth > 0 ? Math.min(img.offsetWidth * s.scale, rect.width * s.scale) : rect.width * s.scale;
    const imgH = img.naturalHeight > 0 ? Math.min(img.offsetHeight * s.scale, rect.height * s.scale) : rect.height * s.scale;
    const maxTx = Math.max(0, (imgW - rect.width) / 2);
    const maxTy = Math.max(0, (imgH - rect.height) / 2);
    s.tx = Math.max(-maxTx, Math.min(maxTx, s.tx));
    s.ty = Math.max(-maxTy, Math.min(maxTy, s.ty));
  };

  const resetZoom = (animate = true) => {
    const s = stateRef.current;
    s.scale = 1; s.tx = 0; s.ty = 0;
    s.animating = animate;
    applyTransform();
    if (animate) setTimeout(() => { s.animating = false; }, 300);
    forceUpdate((n) => n + 1);
  };

  const animateToScale = (newScale: number, focusX: number, focusY: number) => {
    const s = stateRef.current;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = focusX - rect.left - rect.width / 2;
    const cy = focusY - rect.top - rect.height / 2;

    if (newScale <= 1) {
      s.scale = 1; s.tx = 0; s.ty = 0;
    } else {
      // Zoom towards the tap point
      const ratio = newScale / s.scale;
      s.tx = cx - ratio * (cx - s.tx);
      s.ty = cy - ratio * (cy - s.ty);
      s.scale = newScale;
      clampPan();
    }
    s.animating = true;
    applyTransform();
    setTimeout(() => { s.animating = false; }, 300);
    forceUpdate((n) => n + 1);
  };

  const goTo = (newIdx: number) => {
    resetZoom(false);
    setIndex(newIdx);
  };

  const getTouchDist = (t1: React.Touch, t2: React.Touch) => {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const s = stateRef.current;
    if (e.touches.length === 2) {
      // Pinch start
      s.isPinching = true;
      s.isPanning = false;
      s.pinchStartDist = getTouchDist(e.touches[0], e.touches[1]);
      s.pinchStartScale = s.scale;
      s.pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      s.pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      // Also record pan start for combined pinch+pan
      s.panStartTx = s.tx;
      s.panStartTy = s.ty;
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      s.swipeStartX = t.clientX;
      s.swipeStartY = t.clientY;
      s.swipeStartTime = Date.now();

      // Double-tap detection
      const now = Date.now();
      if (now - s.lastTapTime < 300 && Math.abs(t.clientX - s.lastTapX) < 30 && Math.abs(t.clientY - s.lastTapY) < 30) {
        // Double-tap: toggle between 1x and 2.5x
        e.preventDefault();
        if (s.scale > 1.1) {
          resetZoom(true);
        } else {
          animateToScale(2.5, t.clientX, t.clientY);
        }
        s.lastTapTime = 0; // Reset so triple-tap doesn't trigger
        return;
      }
      s.lastTapTime = now;
      s.lastTapX = t.clientX;
      s.lastTapY = t.clientY;

      // Pan start (when zoomed)
      if (s.scale > 1) {
        s.isPanning = true;
        s.panStartX = t.clientX;
        s.panStartY = t.clientY;
        s.panStartTx = s.tx;
        s.panStartTy = s.ty;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const s = stateRef.current;

    if (e.touches.length === 2 && s.isPinching) {
      e.preventDefault();
      const dist = getTouchDist(e.touches[0], e.touches[1]);
      const newScale = Math.max(1, Math.min(5, s.pinchStartScale * (dist / s.pinchStartDist)));

      // Pinch zoom toward center of fingers
      const el = containerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const newCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const newCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const cx = s.pinchCenterX - rect.left - rect.width / 2;
        const cy = s.pinchCenterY - rect.top - rect.height / 2;
        const ratio = newScale / s.pinchStartScale;
        s.tx = s.panStartTx + (newCenterX - s.pinchCenterX) + cx * (1 - ratio);
        s.ty = s.panStartTy + (newCenterY - s.pinchCenterY) + cy * (1 - ratio);
      }

      s.scale = newScale;
      if (s.scale <= 1) { s.tx = 0; s.ty = 0; }
      else clampPan();
      s.animating = false;
      applyTransform();
      forceUpdate((n) => n + 1);
    } else if (e.touches.length === 1 && s.isPanning && s.scale > 1) {
      e.preventDefault();
      const t = e.touches[0];
      s.tx = s.panStartTx + (t.clientX - s.panStartX);
      s.ty = s.panStartTy + (t.clientY - s.panStartY);
      clampPan();
      s.animating = false;
      applyTransform();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const s = stateRef.current;

    if (s.isPinching && e.touches.length < 2) {
      s.isPinching = false;
      // Snap to 1x if close
      if (s.scale < 1.05) {
        resetZoom(true);
      } else {
        clampPan();
        s.animating = true;
        applyTransform();
        setTimeout(() => { s.animating = false; }, 300);
      }
      forceUpdate((n) => n + 1);
      return;
    }

    s.isPanning = false;

    // Swipe detection (only when not zoomed)
    if (s.scale <= 1.05 && e.changedTouches.length === 1) {
      const t = e.changedTouches[0];
      const diffX = t.clientX - s.swipeStartX;
      const diffY = t.clientY - s.swipeStartY;
      const elapsed = Date.now() - s.swipeStartTime;
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 1.5 && elapsed < 400) {
        if (diffX < 0 && index < data.length - 1) goTo(index + 1);
        if (diffX > 0 && index > 0) goTo(index - 1);
      }
    } else if (s.scale > 1) {
      // Snap pan after release
      clampPan();
      s.animating = true;
      applyTransform();
      setTimeout(() => { s.animating = false; }, 300);
    }
  };

  // Desktop: scroll wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    const newScale = Math.max(1, Math.min(5, s.scale + delta));
    animateToScale(newScale, e.clientX, e.clientY);
  };

  // Desktop: double click
  const handleDoubleClick = (e: React.MouseEvent) => {
    const s = stateRef.current;
    if (s.scale > 1.1) {
      resetZoom(true);
    } else {
      animateToScale(2.5, e.clientX, e.clientY);
    }
  };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) goTo(index - 1);
      if (e.key === "ArrowRight" && index < data.length - 1) goTo(index + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, data.length]);

  // Reset zoom on index change
  useEffect(() => {
    const s = stateRef.current;
    s.scale = 1; s.tx = 0; s.ty = 0; s.animating = false;
    applyTransform();
    forceUpdate((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const currentScale = stateRef.current.scale;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.97)",
      display: "flex", flexDirection: "column",
      zIndex: 9999, userSelect: "none",
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", flexShrink: 0 }}>
        <span style={{ color: "white", fontSize: 13, fontWeight: 600 }}>{index + 1} / {data.length}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {currentScale > 1.05 && (
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
              {Math.round(currentScale * 100)}%
            </span>
          )}
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={18} style={{ color: "white" }} />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", position: "relative",
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        {/* Arrows (only when not zoomed) */}
        {index > 0 && currentScale <= 1.05 && (
          <button onClick={() => goTo(index - 1)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <span style={{ color: "white", fontSize: 20 }}>‹</span>
          </button>
        )}
        {photo.photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.photoUrl}
            alt="Foto"
            draggable={false}
            style={{
              maxWidth: "100%", maxHeight: "65vh", objectFit: "contain",
              borderRadius: 4,
              transformOrigin: "center center",
              willChange: "transform",
            }}
          />
        )}
        {index < data.length - 1 && currentScale <= 1.05 && (
          <button onClick={() => goTo(index + 1)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <span style={{ color: "white", fontSize: 20 }}>›</span>
          </button>
        )}
      </div>

      {/* Bottom: info + action buttons */}
      <div style={{ padding: "10px 16px 20px", flexShrink: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.9))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <p style={{ color: "white", fontSize: 14, fontWeight: 600, margin: 0, flex: 1 }}>{storeName}</p>
          <StatusPill status={photo.status ?? "pending"} />
        </div>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "0 0 2px" }}>
          {promoterName}{brandName ? ` · ${brandName}` : ""}
        </p>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, margin: "0 0 10px" }}>{dateStr}</p>

        <div style={{ display: "flex", gap: 8 }}>
          {isPending && (
            <>
              <button
                onClick={async () => {
                  await onApprove(photo.id);
                  if (index < data.length - 1) goTo(index);
                  else if (data.length <= 1) onClose();
                  else goTo(Math.max(0, index - 1));
                }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#10b981", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                <CheckCircle size={14} /> Aprovar
              </button>
              <button
                onClick={async () => {
                  await onReject(photo.id);
                  if (index < data.length - 1) goTo(index);
                  else if (data.length <= 1) onClose();
                  else goTo(Math.max(0, index - 1));
                }}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#ef4444", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              >
                <XCircle size={14} /> Recusar
              </button>
            </>
          )}
          <button
            onClick={() => { onComment(photo.id); onClose(); }}
            style={{ flex: isPending ? 0 : 1, minWidth: isPending ? 48 : undefined, padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
          >
            <MessageSquare size={14} /> {!isPending && "Comentar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhotosPage() {
  const [status, setStatus] = useState<PhotoStatus>("all");
  const [selectedBrand, setSelectedBrand] = useState<number | undefined>(undefined);
  const [selectedPromoter, setSelectedPromoter] = useState<number | undefined>(undefined);
  const [selectedStore, setSelectedStore] = useState<number | undefined>(undefined);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const photos = trpc.photos.listAllWithDetails.useQuery({
    status: status === "all" ? undefined : status,
    brandId: selectedBrand,
    userId: selectedPromoter,
    storeId: selectedStore,
    limit: 200,
  });
  const brands = trpc.brandsAdmin.listAll.useQuery();
  const promoters = trpc.stores.listPromoterUsers.useQuery();
  const stores = trpc.stores.list.useQuery();
  const updateStatus = trpc.photos.updateStatus.useMutation();
  const updateBatch = trpc.photos.updateStatusBatch.useMutation();

  const data: Photo[] = (photos.data ?? []) as Photo[];
  const brandList = brands.data ?? [];
  const promoterList = (promoters.data ?? []) as any[];
  const storeList = (stores.data ?? []) as any[];
  const selectMode = selected.size > 0;

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(data.map((p) => p.id)));
  const clearSelection = () => setSelected(new Set());

  const handleApprove = async (id: number) => {
    await updateStatus.mutateAsync({ id, status: "approved" });
    photos.refetch();
    showToast("Foto aprovada com sucesso!");
  };

  const handleReject = async (id: number) => {
    const notes = window.prompt("Motivo da rejeição (opcional):");
    await updateStatus.mutateAsync({ id, status: "rejected", managerNotes: notes ?? undefined });
    photos.refetch();
    showToast("Foto rejeitada.");
  };

  const handleBatchApprove = async () => {
    if (selected.size === 0) return;
    setBatchLoading(true);
    try {
      await updateBatch.mutateAsync({ ids: Array.from(selected), status: "approved" });
      photos.refetch();
      showToast(`${selected.size} foto(s) aprovada(s)!`);
      clearSelection();
    } finally { setBatchLoading(false); }
  };

  const handleBatchReject = async () => {
    if (selected.size === 0) return;
    const notes = window.prompt("Motivo da rejeição em lote (opcional):");
    setBatchLoading(true);
    try {
      await updateBatch.mutateAsync({ ids: Array.from(selected), status: "rejected", managerNotes: notes ?? undefined });
      photos.refetch();
      showToast(`${selected.size} foto(s) rejeitada(s).`);
      clearSelection();
    } finally { setBatchLoading(false); }
  };

  const downloadSingle = useCallback(async (photo: Photo, idx: number) => {
    if (!photo.photoUrl) return;
    setDownloading(photo.id);
    try {
      const res = await fetch(photo.photoUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = photo.photoUrl.split(".").pop()?.split("?")[0] ?? "jpg";
      a.download = `foto-${photo.id}.${ext}`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally { setDownloading(null); }
  }, []);

  const handleBatchDownload = async () => {
    if (selected.size === 0) return;
    setBatchLoading(true);
    try {
      const zip = new JSZip();
      const toDownload = data.filter((p) => selected.has(p.id) && p.photoUrl);
      await Promise.all(
        toDownload.map(async (photo, idx) => {
          const res = await fetch(photo.photoUrl!);
          const blob = await res.blob();
          const ext = photo.photoUrl!.split(".").pop()?.split("?")[0] ?? "jpg";
          const pName = ((photo.promoterName as string) ?? "promotor").replace(/\s+/g, "-");
          const date = photo.createdAt ? new Date(photo.createdAt as string).toISOString().slice(0, 10) : "sem-data";
          zip.file(`foto-${pName}-${date}-${idx + 1}.${ext}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url; a.download = `fotos-selecionadas-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      showToast(`${toDownload.length} foto(s) baixada(s) em ZIP!`);
      clearSelection();
    } finally { setBatchLoading(false); }
  };

  const statusTabs = [
    { key: "all" as PhotoStatus, label: "Todas" },
    { key: "pending" as PhotoStatus, label: "Pendentes" },
    { key: "approved" as PhotoStatus, label: "Aprovadas" },
    { key: "rejected" as PhotoStatus, label: "Rejeitadas" },
  ];

  return (
    <div style={{ padding: "16px", maxWidth: 1400, margin: "0 auto", paddingRight: commentPhotoId ? 360 : 16 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @media (min-width: 640px) { .photos-container { padding: 28px 32px !important; padding-right: ${commentPhotoId ? '360px' : '32px'} !important; } }`}</style>

      {toast && (
        <div style={{
          position: "fixed", top: 20, right: commentPhotoId ? 364 : 24, zIndex: 9999,
          background: toast.type === "success" ? "#065f46" : "#991b1b",
          color: "white", padding: "10px 18px", borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        }}>{toast.msg}</div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>Fotos dos Promotores</h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            {data.length} foto(s) · {data.filter((p) => p.status === "pending").length} pendente(s)
          </p>
        </div>
        <button onClick={() => photos.refetch()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 13, color: "#374151", cursor: "pointer", fontWeight: 500 }}>
          <RefreshCw size={14} style={{ animation: photos.isFetching ? "spin 0.8s linear infinite" : "none" }} />
          Atualizar
        </button>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Filter size={15} style={{ color: "#9ca3af" }} />
        <div style={{ display: "flex", gap: 4 }}>
          {statusTabs.map((tab) => (
            <button key={tab.key} onClick={() => setStatus(tab.key)} style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: status === tab.key ? "#1A56DB" : "#f3f4f6", color: status === tab.key ? "white" : "#6b7280" }}>
              {tab.label}
            </button>
          ))}
        </div>
        <select value={selectedBrand ?? ""} onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", background: "white", cursor: "pointer", outline: "none" }}>
          <option value="">Todas as marcas</option>
          {brandList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select value={selectedPromoter ?? ""} onChange={(e) => setSelectedPromoter(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", background: "white", cursor: "pointer", outline: "none" }}>
          <option value="">Todos promotores</option>
          {promoterList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={selectedStore ?? ""} onChange={(e) => setSelectedStore(e.target.value ? Number(e.target.value) : undefined)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", background: "white", cursor: "pointer", outline: "none" }}>
          <option value="">Todas as lojas</option>
          {storeList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {data.length > 0 && (
          <button onClick={selectAll} style={{ marginLeft: "auto", padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12, color: "#374151", background: "white", cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
            <CheckSquare size={13} /> Selecionar todas
          </button>
        )}
      </div>

      {selectMode && (
        <div style={{ background: "#1e3a8a", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, boxShadow: "0 4px 16px rgba(30,58,138,0.25)", flexWrap: "wrap" }}>
          <span style={{ color: "white", fontSize: 13, fontWeight: 600, flex: 1 }}>{selected.size} foto(s) selecionada(s)</span>
          <button onClick={handleBatchApprove} disabled={batchLoading} style={{ background: "#10b981", border: "none", color: "white", padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><CheckCircle size={13} /> Aprovar</button>
          <button onClick={handleBatchReject} disabled={batchLoading} style={{ background: "#ef4444", border: "none", color: "white", padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><XCircle size={13} /> Rejeitar</button>
          <button onClick={handleBatchDownload} disabled={batchLoading} style={{ background: "#7c3aed", border: "none", color: "white", padding: "6px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><Archive size={13} /> Baixar ZIP</button>
          <button onClick={clearSelection} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.3)", color: "white", padding: "6px 10px", borderRadius: 7, fontSize: 12, cursor: "pointer" }}><X size={13} /></button>
        </div>
      )}

      {photos.isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af", fontSize: 14, flexDirection: "column", gap: 12 }}>
          <div style={{ width: 32, height: 32, border: "3px solid #e5e7eb", borderTopColor: "#1A56DB", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          Carregando fotos...
        </div>
      ) : data.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#9ca3af", fontSize: 14, flexDirection: "column", gap: 8 }}>
          <Camera size={40} style={{ color: "#d1d5db" }} />
          <p style={{ margin: 0 }}>Nenhuma foto encontrada</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
          {data.map((photo, idx) => (
            <PhotoCard
              key={photo.id} photo={photo} idx={idx}
              selected={selected.has(photo.id)} onSelect={toggleSelect}
              onApprove={handleApprove} onReject={handleReject}
              onDownload={downloadSingle} downloading={downloading}
              selectMode={selectMode}
              onOpenComments={(id) => setCommentPhotoId(commentPhotoId === id ? null : id)}
              commentPhotoId={commentPhotoId}
              onOpenGallery={(i) => setGalleryIndex(i)}
            />
          ))}
        </div>
      )}

      {!selectMode && data.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 11, color: "#9ca3af", marginTop: 20 }}>
          Clique no ícone de seleção em qualquer foto para ativar a seleção múltipla
        </p>
      )}

      {galleryIndex !== null && data[galleryIndex] && (
        <FullscreenGallery
          data={data} initialIndex={galleryIndex} onClose={() => setGalleryIndex(null)}
          onApprove={handleApprove} onReject={handleReject}
          onComment={(id) => setCommentPhotoId(id)}
        />
      )}

      {commentPhotoId && <CommentPanel photoId={commentPhotoId} onClose={() => setCommentPhotoId(null)} />}
    </div>
  );
}
