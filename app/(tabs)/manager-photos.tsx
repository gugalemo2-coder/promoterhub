import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  clamp,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

type FilterType = "brand" | "store" | "promoter" | "month" | "status";
type PhotoStatus = "pending" | "approved" | "rejected";

type PhotoItem = {
  id: number;
  photoUrl: string;
  status: string | null;
  photoTimestamp: string | Date | null;
  brandId?: number | null;
  storeId?: number | null;
  userId?: number | null;
  brandName?: string | null;
  storeName?: string | null;
  userName?: string | null;
};

// ─── Zoomable Image com Pan + Pinch (estilo galeria iPhone) ──────────────────
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Limites de pan baseados no zoom atual
  const getMaxTranslation = (currentScale: number) => {
    const maxX = (SCREEN_WIDTH * (currentScale - 1)) / 2;
    const maxY = (SCREEN_HEIGHT * 0.65 * (currentScale - 1)) / 2;
    return { maxX, maxY };
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = Math.min(Math.max(savedScale.value * e.scale, 1), 5);
      scale.value = newScale;
      // Reajusta a posição quando o zoom diminui para não sair dos limites
      const { maxX, maxY } = getMaxTranslation(newScale);
      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedX.value = 0;
        savedY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value <= 1.05) return; // Não pan se não há zoom
      const { maxX, maxY } = getMaxTranslation(scale.value);
      translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        // Reset zoom e posição
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 200 });
        translateY.value = withTiming(0, { duration: 200 });
        savedX.value = 0;
        savedY.value = 0;
      } else {
        scale.value = withTiming(2.5, { duration: 200 });
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(
    Gesture.Simultaneous(pinchGesture, panGesture),
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Reanimated.View style={[styles.previewImage, animatedStyle]}>
        <Image
          source={{ uri }}
          style={{ width: "100%", height: "100%" }}
          contentFit="contain"
        />
      </Reanimated.View>
    </GestureDetector>
  );
}

// ─── Web download helper ───────────────────────────────────────────────────────
async function webDownloadPhoto(url: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) return false;
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const filename = url.split("/").pop()?.split("?")[0] ?? `photo_${Date.now()}.jpg`;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    return true;
  } catch {
    return false;
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ManagerPhotosScreen() {
  const colors = useColors();
  const router = useRouter();
  const { appRole } = useRole();
  const isMaster = appRole === "master";
  const isManager = appRole === "manager" || appRole === "master";
  const accentColor = isMaster ? "#7C3AED" : colors.primary;

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>();
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<PhotoStatus | undefined>();
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // Preview modal state
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [approving, setApproving] = useState(false);

  // Batch selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  // Comment modal state
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [commentPhotoId, setCommentPhotoId] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    onConfirm: () => void;
  }>({ visible: false, title: "", message: "", confirmLabel: "", confirmColor: "", onConfirm: () => {} });

  // Download state
  const [downloading, setDownloading] = useState(false);
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  // Data
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.list.useQuery();
  const { data: promoters } = trpc.storePerformance.promoters.useQuery();

  const startDate = (selectedMonth !== undefined && selectedYear !== undefined)
    ? new Date(selectedYear, selectedMonth, 1).toISOString()
    : undefined;
  const endDate = (selectedMonth !== undefined && selectedYear !== undefined)
    ? new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999).toISOString()
    : undefined;

  const { data: photos, isLoading, refetch } = trpc.photos.listAllWithDetails.useQuery({
    brandId: selectedBrandId,
    storeId: selectedStoreId,
    userId: selectedUserId,
    startDate,
    endDate,
    status: selectedStatus,
    limit: 200,
  });

  // Comentários da foto selecionada
  const { data: comments, refetch: refetchComments } = trpc.photos.listComments.useQuery(
    { photoId: commentPhotoId ?? 0 },
    { enabled: commentModalVisible && commentPhotoId !== null }
  );

  const addCommentMutation = trpc.photos.addComment.useMutation();
  const deleteCommentMutation = trpc.photos.deleteComment.useMutation();
  const updateStatusMutation = trpc.photos.updateStatus.useMutation();
  const updateStatusBatchMutation = trpc.photos.updateStatusBatch.useMutation();

  const sortedPhotos = useMemo((): PhotoItem[] => {
    const arr: PhotoItem[] = (photos ?? []).map((p) => ({
      ...p,
      photoUrl: p.photoUrl ?? "",
      photoTimestamp: p.photoTimestamp ?? null,
    }));
    return arr.sort((a, b) => new Date(b.photoTimestamp ?? 0).getTime() - new Date(a.photoTimestamp ?? 0).getTime());
  }, [photos]);

  const openPhoto = useCallback((index: number) => {
    setPreviewIndex(index);
    setPreviewVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedBrandId(undefined);
    setSelectedStoreId(undefined);
    setSelectedUserId(undefined);
    setSelectedMonth(undefined);
    setSelectedYear(undefined);
    setSelectedStatus(undefined);
  }, []);

  const hasFilters = selectedBrandId || selectedStoreId || selectedUserId || selectedMonth !== undefined || selectedStatus;

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchAction = (status: PhotoStatus) => {
    if (selectedIds.size === 0) return;
    const label = status === "approved" ? "aprovar" : "rejeitar";
    const count = selectedIds.size;
    setConfirmModal({
      visible: true,
      title: "Confirmar",
      message: `Deseja ${label} ${count} foto${count > 1 ? "s" : ""}?`,
      confirmLabel: status === "approved" ? "Aprovar" : "Rejeitar",
      confirmColor: status === "approved" ? "#0E9F6E" : "#E02424",
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        setBatchProcessing(true);
        try {
          await updateStatusBatchMutation.mutateAsync({ ids: Array.from(selectedIds), status });
          await refetch();
          exitSelectionMode();
        } catch {
          Alert.alert("Erro", "Não foi possível processar as fotos.");
        } finally {
          setBatchProcessing(false);
        }
      },
    });
  };

  // ── Comentários ────────────────────────────────────────────────────────────
  const openCommentModal = useCallback((photoId: number) => {
    setCommentPhotoId(photoId);
    setNewComment("");
    setCommentModalVisible(true);
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !commentPhotoId) return;
    setSubmittingComment(true);
    try {
      await addCommentMutation.mutateAsync({ photoId: commentPhotoId, comment: newComment.trim() });
      setNewComment("");
      await refetchComments();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar o comentário.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteCommentMutation.mutateAsync({ id: commentId });
      await refetchComments();
    } catch {
      Alert.alert("Erro", "Não foi possível excluir o comentário.");
    }
  };

  // ── Download ───────────────────────────────────────────────────────────────
  const downloadPhoto = useCallback(async (url: string): Promise<boolean> => {
    if (Platform.OS === "web") return webDownloadPhoto(url);
    try {
      let perm = mediaPermission;
      if (!perm?.granted) {
        perm = await requestMediaPermission();
        if (!perm?.granted) {
          Alert.alert("Permissão necessária", "Permita o acesso à galeria para salvar fotos.");
          return false;
        }
      }
      const filename = url.split("/").pop()?.split("?")[0] ?? `photo_${Date.now()}.jpg`;
      const localUri = FileSystem.documentDirectory + filename;
      await FileSystem.downloadAsync(url, localUri);
      await MediaLibrary.saveToLibraryAsync(localUri);
      return true;
    } catch {
      return false;
    }
  }, [mediaPermission, requestMediaPermission]);

  const handleDownloadSingle = useCallback(async () => {
    const photo = sortedPhotos[previewIndex];
    if (!photo?.photoUrl) return;
    setDownloading(true);
    const ok = await downloadPhoto(photo.photoUrl);
    setDownloading(false);
    if (!ok) Alert.alert("Erro", "Não foi possível baixar a foto.");
    else if (Platform.OS !== "web") Alert.alert("Salvo!", "Foto salva na galeria.");
  }, [sortedPhotos, previewIndex, downloadPhoto]);

  const handleDownloadBatch = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    const photosToDownload = sortedPhotos.filter((p) => selectedIds.has(p.id));
    let successCount = 0;
    for (const photo of photosToDownload) {
      if (photo.photoUrl) {
        const ok = await downloadPhoto(photo.photoUrl);
        if (ok) successCount++;
      }
    }
    setBatchProcessing(false);
    exitSelectionMode();
    if (Platform.OS !== "web") {
      Alert.alert("Download concluído", `${successCount} de ${photosToDownload.length} foto${photosToDownload.length !== 1 ? "s" : ""} salva${photosToDownload.length !== 1 ? "s" : ""} na galeria.`);
    }
  }, [selectedIds, sortedPhotos, downloadPhoto, exitSelectionMode]);

  const handleApprove = async () => {
    const photo = sortedPhotos[previewIndex];
    if (!photo) return;
    setApproving(true);
    try {
      await updateStatusMutation.mutateAsync({ id: photo.id, status: "approved" });
      await refetch();
    } catch {
      Alert.alert("Erro", "Não foi possível aprovar a foto.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const photo = sortedPhotos[previewIndex];
    if (!photo) return;
    setApproving(true);
    try {
      await updateStatusMutation.mutateAsync({ id: photo.id, status: "rejected" });
      await refetch();
    } catch {
      Alert.alert("Erro", "Não foi possível rejeitar a foto.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusLabel = (s?: PhotoStatus) => {
    if (s === "approved") return "Aprovadas";
    if (s === "rejected") return "Rejeitadas";
    if (s === "pending") return "Pendentes";
    return "Status";
  };

  const getBrandName = (id?: number) => brands?.find((b) => b.id === id)?.name ?? "Todas";
  const getStoreName = (id?: number) => stores?.find((s) => s.id === id)?.name ?? "Todas";
  const getPromoterName = (id?: number) => {
    const p = promoters?.find((u) => u.id === id);
    return p ? (p.name ?? p.login ?? `Promotor ${p.id}`) : "Todos";
  };

  const formatDate = (iso: string | Date | null) => {
    if (!iso) return "—";
    const d = new Date(iso as string);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const renderFilterChip = (label: string, type: FilterType, active: boolean) => (
    <TouchableOpacity
      key={type}
      style={[styles.filterChip, { backgroundColor: active ? accentColor : colors.surface, borderColor: active ? accentColor : colors.border }]}
      onPress={() => setActiveFilter(activeFilter === type ? null : type)}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>{label}</Text>
      <Ionicons name="chevron-down" size={14} color={active ? "#fff" : colors.muted} />
    </TouchableOpacity>
  );

  const renderDropdown = () => {
    if (!activeFilter) return null;

    if (activeFilter === "status") {
      const statusOptions: { value: PhotoStatus; label: string; color: string }[] = [
        { value: "approved", label: "Aprovadas", color: "#0E9F6E" },
        { value: "rejected", label: "Rejeitadas", color: "#E02424" },
        { value: "pending", label: "Pendentes", color: "#F59E0B" },
      ];
      return (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator nestedScrollEnabled>
            <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setSelectedStatus(undefined); setActiveFilter(null); }}>
              <Text style={[styles.dropdownItemText, { color: colors.muted }]}>Todos os status</Text>
            </TouchableOpacity>
            {statusOptions.map((opt) => (
              <TouchableOpacity key={opt.value} style={[styles.dropdownItem, { borderBottomColor: colors.border }, selectedStatus === opt.value && { backgroundColor: opt.color + "15" }]} onPress={() => { setSelectedStatus(opt.value); setActiveFilter(null); }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.color }} />
                  <Text style={[styles.dropdownItemText, { color: selectedStatus === opt.value ? opt.color : colors.foreground }]}>{opt.label}</Text>
                </View>
                {selectedStatus === opt.value && <Ionicons name="checkmark" size={16} color={opt.color} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (activeFilter === "month") {
      const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
      const now = new Date();
      const currentYear = now.getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2];
      return (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 340 }]}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator nestedScrollEnabled>
            <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => { setSelectedMonth(undefined); setSelectedYear(undefined); setActiveFilter(null); }}>
              <Text style={[styles.dropdownItemText, { color: colors.muted }]}>Todos os meses</Text>
            </TouchableOpacity>
            {years.map((year) => MONTHS.map((monthName, monthIndex) => {
              const isSelected = selectedMonth === monthIndex && selectedYear === year;
              if (year === currentYear && monthIndex > now.getMonth()) return null;
              return (
                <TouchableOpacity key={`${year}-${monthIndex}`} style={[styles.dropdownItem, { borderBottomColor: colors.border }, isSelected && { backgroundColor: accentColor + "15" }]} onPress={() => { setSelectedMonth(monthIndex); setSelectedYear(year); setActiveFilter(null); }}>
                  <Text style={[styles.dropdownItemText, { color: isSelected ? accentColor : colors.foreground }]}>{monthName} {year}</Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color={accentColor} />}
                </TouchableOpacity>
              );
            }))}
          </ScrollView>
        </View>
      );
    }

    type ListItem = { id: number; name: string | null; login?: string | null };
    let items: ListItem[] = [];
    let onSelect: (id: number | undefined) => void = () => {};
    let currentId: number | undefined;
    let allLabel = "Todos";

    if (activeFilter === "brand") {
      items = (brands ?? []).map((b) => ({ id: b.id, name: b.name }));
      onSelect = (id) => { setSelectedBrandId(id); setActiveFilter(null); };
      currentId = selectedBrandId;
      allLabel = "Todas as marcas";
    } else if (activeFilter === "store") {
      items = (stores ?? []).map((s) => ({ id: s.id, name: s.name }));
      onSelect = (id) => { setSelectedStoreId(id); setActiveFilter(null); };
      currentId = selectedStoreId;
      allLabel = "Todas as lojas";
    } else if (activeFilter === "promoter") {
      items = (promoters ?? []).map((p) => ({ id: p.id, name: p.name, login: p.login }));
      onSelect = (id) => { setSelectedUserId(id); setActiveFilter(null); };
      currentId = selectedUserId;
      allLabel = "Todos os promotores";
    }

    return (
      <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator nestedScrollEnabled>
          <TouchableOpacity style={[styles.dropdownItem, { borderBottomColor: colors.border }]} onPress={() => onSelect(undefined)}>
            <Text style={[styles.dropdownItemText, { color: colors.muted }]}>{allLabel}</Text>
          </TouchableOpacity>
          {items.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.dropdownItem, { borderBottomColor: colors.border }, currentId === item.id && { backgroundColor: accentColor + "15" }]} onPress={() => onSelect(item.id)}>
              <Text style={[styles.dropdownItemText, { color: currentId === item.id ? accentColor : colors.foreground }]}>{item.name ?? item.login ?? `#${item.id}`}</Text>
              {currentId === item.id && <Ionicons name="checkmark" size={16} color={accentColor} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const currentPhoto = sortedPhotos[previewIndex];
  const currentStatus = currentPhoto?.status;

  return (
    <ScreenContainer containerClassName="flex-1">
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={accentColor} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Fotos dos Promotores</Text>
          {isLoading ? (
            <Text style={[styles.headerCount, { color: colors.muted }]}>Carregando...</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
              <Text style={[styles.headerCount, { color: colors.warning }]}>{sortedPhotos.filter((p) => p.status === "pending").length} pendente{sortedPhotos.filter((p) => p.status === "pending").length !== 1 ? "s" : ""}</Text>
              <Text style={[styles.headerCount, { color: colors.success }]}>{sortedPhotos.filter((p) => p.status === "approved").length} aprovada{sortedPhotos.filter((p) => p.status === "approved").length !== 1 ? "s" : ""}</Text>
              <Text style={[styles.headerCount, { color: colors.error }]}>{sortedPhotos.filter((p) => p.status === "rejected").length} rejeitada{sortedPhotos.filter((p) => p.status === "rejected").length !== 1 ? "s" : ""}</Text>
            </View>
          )}
        </View>
        {!selectionMode ? (
          <TouchableOpacity style={[styles.batchBtn, { borderColor: accentColor }]} onPress={() => setSelectionMode(true)}>
            <Ionicons name="checkmark-done-outline" size={18} color={accentColor} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.clearBtn} onPress={exitSelectionMode}>
            <Ionicons name="close-circle" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
        {hasFilters && !selectionMode && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Ionicons name="funnel-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Batch action bar */}
      {selectionMode && (
        <View style={[styles.batchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.batchBarText, { color: colors.foreground }]}>
            {selectedIds.size === 0 ? "Toque para selecionar" : `${selectedIds.size} selecionada${selectedIds.size > 1 ? "s" : ""}`}
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={[styles.batchActionBtn, { backgroundColor: accentColor, opacity: selectedIds.size === 0 || batchProcessing ? 0.4 : 1 }]} onPress={handleDownloadBatch} disabled={selectedIds.size === 0 || batchProcessing}>
              {batchProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="download-outline" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.batchActionBtn, { backgroundColor: "#E02424", opacity: selectedIds.size === 0 || batchProcessing ? 0.4 : 1 }]} onPress={() => handleBatchAction("rejected")} disabled={selectedIds.size === 0 || batchProcessing}>
              {batchProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.batchActionText}>Rejeitar</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.batchActionBtn, { backgroundColor: "#0E9F6E", opacity: selectedIds.size === 0 || batchProcessing ? 0.4 : 1 }]} onPress={() => handleBatchAction("approved")} disabled={selectedIds.size === 0 || batchProcessing}>
              {batchProcessing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.batchActionText}>Aprovar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter bar */}
      {!selectionMode && (
        <View style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {renderFilterChip(getBrandName(selectedBrandId), "brand", !!selectedBrandId)}
            {renderFilterChip(getStoreName(selectedStoreId), "store", !!selectedStoreId)}
            {renderFilterChip(getPromoterName(selectedUserId), "promoter", !!selectedUserId)}
            {renderFilterChip(selectedMonth !== undefined && selectedYear !== undefined ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][selectedMonth] + " " + selectedYear : "Mês/Ano", "month", selectedMonth !== undefined)}
            {renderFilterChip(getStatusLabel(selectedStatus), "status", !!selectedStatus)}
          </ScrollView>
        </View>
      )}

      {/* Dropdown overlay */}
      {activeFilter && (
        <Pressable style={styles.dropdownOverlay} onPress={() => setActiveFilter(null)}>
          <View style={styles.dropdownContainer}>{renderDropdown()}</View>
        </Pressable>
      )}

      {/* Photo grid */}
      {isLoading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={accentColor} /></View>
      ) : sortedPhotos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>{hasFilters ? "Nenhuma foto com esses filtros" : "Nenhuma foto enviada ainda"}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedPhotos}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <TouchableOpacity
                style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }, isSelected && styles.photoCellSelected]}
                onPress={() => { if (selectionMode) toggleSelection(item.id); else openPhoto(index); }}
                onLongPress={() => { if (!selectionMode) { setSelectionMode(true); setSelectedIds(new Set([item.id])); } }}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.photoUrl }} style={styles.photoImage} contentFit="cover" transition={200} />
                {item.status === "approved" && <View style={[styles.statusBadge, { backgroundColor: "#0E9F6E" }]}><Ionicons name="checkmark" size={10} color="#fff" /></View>}
                {item.status === "rejected" && <View style={[styles.statusBadge, { backgroundColor: "#E02424" }]}><Ionicons name="close" size={10} color="#fff" /></View>}
                {(!item.status || item.status === "pending") && <View style={[styles.statusBadge, { backgroundColor: "#F59E0B" }]}><Ionicons name="time" size={10} color="#fff" /></View>}
                {selectionMode && (
                  <View style={[styles.selectionOverlay, isSelected && styles.selectionOverlayActive]}>
                    {isSelected && <Ionicons name="checkmark-circle" size={28} color="#fff" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Photo Preview Modal ── */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.previewOverlay}>
          <TouchableOpacity style={styles.previewClose} onPress={closePreview}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>

          <View style={styles.previewCounter}>
            <Text style={styles.previewCounterText}>{previewIndex + 1} / {sortedPhotos.length}</Text>
          </View>

          {currentStatus && (
            <View style={[styles.previewStatusBadge, { backgroundColor: currentStatus === "approved" ? "#0E9F6E" : currentStatus === "rejected" ? "#E02424" : "#F59E0B" }]}>
              <Ionicons name={currentStatus === "approved" ? "checkmark-circle" : currentStatus === "rejected" ? "close-circle" : "time"} size={14} color="#fff" />
              <Text style={styles.previewStatusText}>{currentStatus === "approved" ? "Aprovada" : currentStatus === "rejected" ? "Rejeitada" : "Pendente"}</Text>
            </View>
          )}

          {sortedPhotos[previewIndex] && (
            <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <ZoomableImage key={previewIndex} uri={sortedPhotos[previewIndex].photoUrl} />
            </View>
          )}

          {previewIndex > 0 && (
            <TouchableOpacity style={styles.navArrowLeft} onPress={() => setPreviewIndex(previewIndex - 1)}>
              <Ionicons name="chevron-back" size={32} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
          {previewIndex < sortedPhotos.length - 1 && (
            <TouchableOpacity style={styles.navArrowRight} onPress={() => setPreviewIndex(previewIndex + 1)}>
              <Ionicons name="chevron-forward" size={32} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}

          {currentPhoto && (
            <View style={styles.infoStrip}>
              <View style={styles.infoStripRow}>
                <View style={styles.infoStripItem}>
                  <Ionicons name="person" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.infoStripLabel}>Promotor</Text>
                  <Text style={styles.infoStripValue} numberOfLines={1}>{currentPhoto.userName ?? "—"}</Text>
                </View>
                <View style={styles.infoStripDivider} />
                <View style={styles.infoStripItem}>
                  <Ionicons name="storefront" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.infoStripLabel}>Loja</Text>
                  <Text style={styles.infoStripValue} numberOfLines={1}>{currentPhoto.storeName ?? "—"}</Text>
                </View>
                <View style={styles.infoStripDivider} />
                <View style={styles.infoStripItem}>
                  <Ionicons name="pricetag" size={13} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.infoStripLabel}>Marca</Text>
                  <Text style={styles.infoStripValue} numberOfLines={1}>{currentPhoto.brandName ?? "—"}</Text>
                </View>
              </View>
              <Text style={styles.infoStripDate}>{formatDate(currentPhoto.photoTimestamp)}</Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.previewActions}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.15)", opacity: downloading ? 0.5 : 1 }]} onPress={handleDownloadSingle} disabled={downloading} activeOpacity={0.8}>
              {downloading ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="download-outline" size={22} color="#fff" /><Text style={styles.actionBtnText}>Salvar</Text></>}
            </TouchableOpacity>

            {/* Botão de Comentário — só para gestores/master */}
            {isManager && currentPhoto && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#6366F1" }]}
                onPress={() => { closePreview(); setTimeout(() => openCommentModal(currentPhoto.id), 300); }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#fff" />
                <Text style={styles.actionBtnText}>Comentar</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn, currentStatus === "rejected" && styles.actionBtnActive, approving && styles.actionBtnDisabled]} onPress={handleReject} disabled={approving || currentStatus === "rejected"} activeOpacity={0.8}>
              {approving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="close-circle-outline" size={22} color="#fff" /><Text style={styles.actionBtnText}>Rejeitar</Text></>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn, currentStatus === "approved" && styles.actionBtnActive, approving && styles.actionBtnDisabled]} onPress={handleApprove} disabled={approving || currentStatus === "approved"} activeOpacity={0.8}>
              {approving ? <ActivityIndicator size="small" color="#fff" /> : <><Ionicons name="checkmark-circle-outline" size={22} color="#fff" /><Text style={styles.actionBtnText}>Aprovar</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Comment Modal ── */}
      <Modal visible={commentModalVisible} transparent animationType="slide" onRequestClose={() => setCommentModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.commentOverlay} onPress={() => setCommentModalVisible(false)}>
            <Pressable style={[styles.commentSheet, { backgroundColor: colors.background }]} onPress={() => {}}>
              {/* Header */}
              <View style={[styles.commentHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.commentTitle, { color: colors.foreground }]}>Comentários</Text>
                <TouchableOpacity onPress={() => setCommentModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.muted} />
                </TouchableOpacity>
              </View>

              {/* Lista de comentários */}
              <ScrollView style={styles.commentList} showsVerticalScrollIndicator={false}>
                {!comments || comments.length === 0 ? (
                  <View style={styles.commentEmpty}>
                    <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
                    <Text style={[styles.commentEmptyText, { color: colors.muted }]}>Nenhum comentário ainda</Text>
                  </View>
                ) : (
                  comments.map((c) => (
                    <View key={c.id} style={[styles.commentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={styles.commentItemHeader}>
                        <View style={[styles.commentAvatar, { backgroundColor: accentColor + "20" }]}>
                          <Ionicons name="person" size={14} color={accentColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.commentUserName, { color: colors.foreground }]}>{c.userName ?? "Gestor"}</Text>
                          <Text style={[styles.commentDate, { color: colors.muted }]}>{formatDate(c.createdAt)}</Text>
                        </View>
                        {isManager && (
                          <TouchableOpacity onPress={() => handleDeleteComment(c.id)} style={styles.commentDeleteBtn}>
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={[styles.commentText, { color: colors.foreground }]}>{c.comment}</Text>
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Input de novo comentário */}
              {isManager && (
                <View style={[styles.commentInputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    style={[styles.commentInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                    value={newComment}
                    onChangeText={setNewComment}
                    placeholder="Escreva um comentário..."
                    placeholderTextColor={colors.muted}
                    multiline
                    maxLength={1000}
                    editable={!submittingComment}
                  />
                  <TouchableOpacity
                    style={[styles.commentSendBtn, { backgroundColor: accentColor, opacity: !newComment.trim() || submittingComment ? 0.4 : 1 }]}
                    onPress={handleSubmitComment}
                    disabled={!newComment.trim() || submittingComment}
                  >
                    {submittingComment ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
                  </TouchableOpacity>
                </View>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Confirmation Modal ── */}
      <Modal visible={confirmModal.visible} transparent animationType="fade" onRequestClose={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}>
        <View style={styles.confirmOverlay}>
          <View style={[styles.confirmBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.confirmTitle, { color: colors.foreground }]}>{confirmModal.title}</Text>
            <Text style={[styles.confirmMessage, { color: colors.muted }]}>{confirmModal.message}</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.border }]} onPress={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}>
                <Text style={[styles.confirmBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: confirmModal.confirmColor }]} onPress={confirmModal.onConfirm}>
                <Text style={[styles.confirmBtnText, { color: "#fff" }]}>{confirmModal.confirmLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, gap: 12 },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerCount: { fontSize: 13, marginTop: 1 },
  clearBtn: { padding: 4 },
  batchBtn: { padding: 6, borderRadius: 8, borderWidth: 1 },
  batchBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, gap: 12 },
  batchBarText: { fontSize: 14, fontWeight: "500", flex: 1 },
  batchActionBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  batchActionText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  filterBar: { borderBottomWidth: 0.5 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  dropdownOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 },
  dropdownContainer: { position: "absolute", top: 110, left: 16, right: 16, zIndex: 101 },
  dropdown: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  dropdownScroll: { maxHeight: 260 },
  dropdownItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5 },
  dropdownItemText: { fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
  grid: { padding: 16, gap: 4 },
  row: { gap: 4 },
  photoCell: { borderRadius: 8, overflow: "hidden" },
  photoCellSelected: { borderWidth: 3, borderColor: "#7C3AED", borderRadius: 8 },
  photoImage: { width: "100%", height: "100%" },
  statusBadge: { position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  selectionOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)", alignItems: "center", justifyContent: "center" },
  selectionOverlayActive: { backgroundColor: "rgba(124,58,237,0.45)" },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  previewImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65 },
  previewClose: { position: "absolute", top: 50, right: 16, zIndex: 20 },
  previewCounter: { position: "absolute", top: 56, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, zIndex: 20 },
  previewCounterText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  previewStatusBadge: { position: "absolute", top: 96, left: 16, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, zIndex: 20 },
  previewStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  navArrowLeft: { position: "absolute", left: 8, top: "45%", marginTop: -22, width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 22, zIndex: 20 },
  navArrowRight: { position: "absolute", right: 8, top: "45%", marginTop: -22, width: 44, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.35)", borderRadius: 22, zIndex: 20 },
  infoStrip: { position: "absolute", bottom: 110, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.72)", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, zIndex: 20, borderTopWidth: 0.5, borderTopColor: "rgba(255,255,255,0.12)" },
  infoStripRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 },
  infoStripItem: { flex: 1, alignItems: "center", gap: 2 },
  infoStripDivider: { width: 0.5, height: 36, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center" },
  infoStripLabel: { color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  infoStripValue: { color: "#fff", fontSize: 13, fontWeight: "700", textAlign: "center", paddingHorizontal: 4 },
  infoStripDate: { color: "rgba(255,255,255,0.5)", fontSize: 11, textAlign: "center", marginTop: 2 },
  previewActions: { position: "absolute", bottom: 28, left: 0, right: 0, flexDirection: "row", paddingHorizontal: 16, gap: 8, justifyContent: "center", zIndex: 20 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, maxWidth: 160 },
  rejectBtn: { backgroundColor: "#E02424" },
  approveBtn: { backgroundColor: "#0E9F6E" },
  actionBtnActive: { opacity: 0.5 },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  // Comment modal
  commentOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  commentSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: SCREEN_HEIGHT * 0.75, minHeight: 300 },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5 },
  commentTitle: { fontSize: 18, fontWeight: "700" },
  commentList: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  commentEmpty: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 12 },
  commentEmptyText: { fontSize: 15 },
  commentItem: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  commentItemHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  commentUserName: { fontSize: 14, fontWeight: "700" },
  commentDate: { fontSize: 11, marginTop: 1 },
  commentDeleteBtn: { padding: 4 },
  commentText: { fontSize: 15, lineHeight: 22 },
  commentInputRow: { flexDirection: "row", alignItems: "flex-end", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 0.5 },
  commentInput: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, maxHeight: 100 },
  commentSendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  // Confirmation modal
  confirmOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 24 },
  confirmBox: { width: "100%", maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 24, gap: 12 },
  confirmTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  confirmMessage: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  confirmButtons: { flexDirection: "row", gap: 12, marginTop: 8 },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { fontSize: 15, fontWeight: "600" },
});
