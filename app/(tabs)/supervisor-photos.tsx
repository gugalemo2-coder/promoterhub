import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

// Cor de destaque do Supervisor
const SUPERVISOR_COLOR = "#D97706"; // âmbar

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

// ─── Zoomable Image Component ─────────────────────────────────────────────────
function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 1), 4);
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
      } else {
        savedScale.value = scale.value;
      }
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withTiming(1, { duration: 200 });
        savedScale.value = 1;
      } else {
        scale.value = withTiming(2.5, { duration: 200 });
        savedScale.value = 2.5;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SupervisorPhotosScreen() {
  const colors = useColors();
  const router = useRouter();

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
  const [showInfo, setShowInfo] = useState(false);
  const previewFlatListRef = useRef<FlatList<PhotoItem>>(null);

  // Batch selection state (download only)
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

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

  const { data: photos, isLoading } = trpc.photos.listAllWithDetails.useQuery({
    brandId: selectedBrandId,
    storeId: selectedStoreId,
    userId: selectedUserId,
    startDate,
    endDate,
    status: selectedStatus,
    limit: 200,
  });

  // Sort: newest first always
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
    setShowInfo(false);
    setPreviewVisible(true);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
    setShowInfo(false);
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

  // Download helper
  const downloadPhoto = useCallback(async (url: string) => {
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
    if (ok) Alert.alert("Salvo!", "Foto salva na galeria.");
    else Alert.alert("Erro", "Não foi possível salvar a foto.");
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
    Alert.alert("Download concluído", `${successCount} de ${photosToDownload.length} foto${photosToDownload.length !== 1 ? "s" : ""} salva${photosToDownload.length !== 1 ? "s" : ""} na galeria.`);
  }, [selectedIds, sortedPhotos, downloadPhoto, exitSelectionMode]);

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
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? SUPERVISOR_COLOR : colors.surface,
          borderColor: active ? SUPERVISOR_COLOR : colors.border,
        },
      ]}
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
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
              onPress={() => { setSelectedStatus(undefined); setActiveFilter(null); }}
            >
              <Text style={[styles.dropdownItemText, { color: colors.muted }]}>Todos os status</Text>
            </TouchableOpacity>
            {statusOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                  selectedStatus === opt.value && { backgroundColor: opt.color + "15" },
                ]}
                onPress={() => { setSelectedStatus(opt.value); setActiveFilter(null); }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: opt.color }} />
                  <Text style={[styles.dropdownItemText, { color: selectedStatus === opt.value ? opt.color : colors.foreground }]}>
                    {opt.label}
                  </Text>
                </View>
                {selectedStatus === opt.value && <Ionicons name="checkmark" size={16} color={opt.color} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (activeFilter === "month") {
      const MONTHS = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
      ];
      const now = new Date();
      const currentYear = now.getFullYear();
      const years = [currentYear, currentYear - 1, currentYear - 2];
      return (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border, maxHeight: 340 }]}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator nestedScrollEnabled>
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
              onPress={() => { setSelectedMonth(undefined); setSelectedYear(undefined); setActiveFilter(null); }}
            >
              <Text style={[styles.dropdownItemText, { color: colors.muted }]}>Todos os meses</Text>
            </TouchableOpacity>
            {years.map((year) =>
              MONTHS.map((monthName, monthIndex) => {
                const isSelected = selectedMonth === monthIndex && selectedYear === year;
                if (year === currentYear && monthIndex > now.getMonth()) return null;
                return (
                  <TouchableOpacity
                    key={`${year}-${monthIndex}`}
                    style={[
                      styles.dropdownItem,
                      { borderBottomColor: colors.border },
                      isSelected && { backgroundColor: SUPERVISOR_COLOR + "15" },
                    ]}
                    onPress={() => { setSelectedMonth(monthIndex); setSelectedYear(year); setActiveFilter(null); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: isSelected ? SUPERVISOR_COLOR : colors.foreground }]}>
                      {monthName} {year}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color={SUPERVISOR_COLOR} />}
                  </TouchableOpacity>
                );
              })
            )}
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
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
            onPress={() => onSelect(undefined)}
          >
            <Text style={[styles.dropdownItemText, { color: colors.muted }]}>{allLabel}</Text>
          </TouchableOpacity>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.dropdownItem,
                { borderBottomColor: colors.border },
                currentId === item.id && { backgroundColor: SUPERVISOR_COLOR + "15" },
              ]}
              onPress={() => onSelect(item.id)}
            >
              <Text style={[styles.dropdownItemText, { color: currentId === item.id ? SUPERVISOR_COLOR : colors.foreground }]}>
                {item.name ?? item.login ?? `#${item.id}`}
              </Text>
              {currentId === item.id && <Ionicons name="checkmark" size={16} color={SUPERVISOR_COLOR} />}
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
          <Ionicons name="chevron-back" size={24} color={SUPERVISOR_COLOR} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Fotos dos Promotores</Text>
            <View style={styles.supervisorBadge}>
              <Text style={styles.supervisorBadgeText}>Supervisor</Text>
            </View>
          </View>
          {isLoading ? (
            <Text style={[styles.headerCount, { color: colors.muted }]}>Carregando...</Text>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
              <Text style={[styles.headerCount, { color: "#F59E0B" }]}>
                {sortedPhotos.filter((p) => p.status === "pending").length} pendente{sortedPhotos.filter((p) => p.status === "pending").length !== 1 ? "s" : ""}
              </Text>
              <Text style={[styles.headerCount, { color: "#0E9F6E" }]}>
                {sortedPhotos.filter((p) => p.status === "approved").length} aprovada{sortedPhotos.filter((p) => p.status === "approved").length !== 1 ? "s" : ""}
              </Text>
              <Text style={[styles.headerCount, { color: "#E02424" }]}>
                {sortedPhotos.filter((p) => p.status === "rejected").length} rejeitada{sortedPhotos.filter((p) => p.status === "rejected").length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>
        {/* Batch select toggle (download only) */}
        {!selectionMode ? (
          <TouchableOpacity
            style={[styles.batchBtn, { borderColor: SUPERVISOR_COLOR }]}
            onPress={() => setSelectionMode(true)}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={SUPERVISOR_COLOR} />
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

      {/* Batch action bar — download only */}
      {selectionMode && (
        <View style={[styles.batchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Text style={[styles.batchBarText, { color: colors.foreground }]}>
            {selectedIds.size === 0 ? "Toque para selecionar" : `${selectedIds.size} selecionada${selectedIds.size > 1 ? "s" : ""}`}
          </Text>
          <TouchableOpacity
            style={[styles.batchActionBtn, { backgroundColor: SUPERVISOR_COLOR, opacity: selectedIds.size === 0 || batchProcessing ? 0.4 : 1 }]}
            onPress={handleDownloadBatch}
            disabled={selectedIds.size === 0 || batchProcessing}
          >
            {batchProcessing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="download-outline" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      )}

      {/* Filter bar */}
      {!selectionMode && (
        <View style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {renderFilterChip(getBrandName(selectedBrandId), "brand", !!selectedBrandId)}
            {renderFilterChip(getStoreName(selectedStoreId), "store", !!selectedStoreId)}
            {renderFilterChip(getPromoterName(selectedUserId), "promoter", !!selectedUserId)}
            {renderFilterChip(
              selectedMonth !== undefined && selectedYear !== undefined
                ? `${["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"][selectedMonth]} ${selectedYear}`
                : "Mês",
              "month",
              selectedMonth !== undefined
            )}
            {renderFilterChip(getStatusLabel(selectedStatus), "status", !!selectedStatus)}
          </ScrollView>
        </View>
      )}

      {/* Dropdown overlay */}
      {activeFilter && (
        <Pressable style={styles.dropdownOverlay} onPress={() => setActiveFilter(null)}>
          <View style={styles.dropdownContainer}>
            {renderDropdown()}
          </View>
        </Pressable>
      )}

      {/* Photo grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={SUPERVISOR_COLOR} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Carregando fotos...</Text>
        </View>
      ) : sortedPhotos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhuma foto encontrada</Text>
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
                style={[
                  styles.photoCell,
                  { width: PHOTO_SIZE, height: PHOTO_SIZE },
                  isSelected && styles.photoCellSelected,
                ]}
                onPress={() => {
                  if (selectionMode) {
                    toggleSelection(item.id);
                  } else {
                    openPhoto(index);
                  }
                }}
                onLongPress={() => {
                  if (!selectionMode) {
                    setSelectionMode(true);
                    toggleSelection(item.id);
                  }
                }}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.photoUrl }}
                  style={[styles.photoImage, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                  contentFit="cover"
                />
                {/* Status badge */}
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        item.status === "approved" ? "#0E9F6E" :
                        item.status === "rejected" ? "#E02424" : "#F59E0B",
                    },
                  ]}
                >
                  <Ionicons
                    name={item.status === "approved" ? "checkmark" : item.status === "rejected" ? "close" : "time"}
                    size={10}
                    color="#fff"
                  />
                </View>
                {/* Selection overlay */}
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

      {/* Preview Modal */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.previewOverlay}>
          {/* Close */}
          <TouchableOpacity style={styles.previewClose} onPress={closePreview}>
            <Ionicons name="close-circle" size={34} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Counter */}
          <View style={styles.previewCounter}>
            <Text style={styles.previewCounterText}>{previewIndex + 1} / {sortedPhotos.length}</Text>
          </View>

          {/* Info toggle */}
          <TouchableOpacity style={styles.infoToggleBtn} onPress={() => setShowInfo((v) => !v)}>
            <Ionicons name="information-circle-outline" size={30} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>

          {/* Status badge */}
          {currentStatus && (
            <View
              style={[
                styles.previewStatusBadge,
                {
                  backgroundColor:
                    currentStatus === "approved" ? "#0E9F6E" :
                    currentStatus === "rejected" ? "#E02424" : "#F59E0B",
                },
              ]}
            >
              <Ionicons
                name={currentStatus === "approved" ? "checkmark-circle" : currentStatus === "rejected" ? "close-circle" : "time"}
                size={14}
                color="#fff"
              />
              <Text style={styles.previewStatusText}>
                {currentStatus === "approved" ? "Aprovada" : currentStatus === "rejected" ? "Rejeitada" : "Pendente"}
              </Text>
            </View>
          )}

          {/* Swipeable photo list with zoom */}
          <FlatList
            ref={previewFlatListRef}
            data={sortedPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => String(item.id)}
            initialScrollIndex={previewIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIndex >= 0 && newIndex < sortedPhotos.length) {
                setPreviewIndex(newIndex);
                setShowInfo(false);
              }
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <ZoomableImage uri={item.photoUrl} />
              </View>
            )}
            style={{ width: SCREEN_WIDTH }}
          />

          {/* Navigation arrows */}
          {previewIndex > 0 && (
            <TouchableOpacity
              style={styles.navArrowLeft}
              onPress={() => {
                const newIdx = previewIndex - 1;
                previewFlatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                setPreviewIndex(newIdx);
                setShowInfo(false);
              }}
            >
              <Ionicons name="chevron-back" size={32} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}
          {previewIndex < sortedPhotos.length - 1 && (
            <TouchableOpacity
              style={styles.navArrowRight}
              onPress={() => {
                const newIdx = previewIndex + 1;
                previewFlatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
                setPreviewIndex(newIdx);
                setShowInfo(false);
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}

          {/* Info panel */}
          {showInfo && currentPhoto && (
            <View style={styles.infoPanel}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="#ccc" />
                <Text style={styles.infoText}>{currentPhoto.userName ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="storefront-outline" size={16} color="#ccc" />
                <Text style={styles.infoText}>{currentPhoto.storeName ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="pricetag-outline" size={16} color="#ccc" />
                <Text style={styles.infoText}>{currentPhoto.brandName ?? "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="#ccc" />
                <Text style={styles.infoText}>{formatDate(currentPhoto.photoTimestamp)}</Text>
              </View>
            </View>
          )}

          {/* Action buttons — download only (no approve/reject) */}
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: SUPERVISOR_COLOR, opacity: downloading ? 0.5 : 1 }]}
              onPress={handleDownloadSingle}
              disabled={downloading}
              activeOpacity={0.8}
            >
              {downloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="download-outline" size={22} color="#fff" />
                  <Text style={styles.actionBtnText}>Salvar foto</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerCount: { fontSize: 13, marginTop: 1 },
  supervisorBadge: {
    backgroundColor: "#D97706",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  supervisorBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  clearBtn: { padding: 4 },
  batchBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  batchBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  batchBarText: { fontSize: 14, fontWeight: "500", flex: 1 },
  batchActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterBar: { borderBottomWidth: 0.5 },
  filterScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  dropdownContainer: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    zIndex: 101,
  },
  dropdown: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  dropdownScroll: {
    maxHeight: 260,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  dropdownItemText: { fontSize: 15 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
  grid: { padding: 16, gap: 4 },
  row: { gap: 4 },
  photoCell: { borderRadius: 8, overflow: "hidden" },
  photoCellSelected: {
    borderWidth: 3,
    borderColor: "#D97706",
    borderRadius: 8,
  },
  photoImage: { width: "100%", height: "100%" },
  statusBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  selectionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  selectionOverlayActive: {
    backgroundColor: "rgba(217,119,6,0.45)",
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.65,
  },
  previewClose: {
    position: "absolute",
    top: 50,
    right: 16,
    zIndex: 20,
  },
  previewCounter: {
    position: "absolute",
    top: 56,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  previewCounterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  infoToggleBtn: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 20,
  },
  previewStatusBadge: {
    position: "absolute",
    top: 96,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  previewStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  navArrowLeft: {
    position: "absolute",
    left: 8,
    top: "45%",
    marginTop: -22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 22,
    zIndex: 20,
  },
  navArrowRight: {
    position: "absolute",
    right: 8,
    top: "45%",
    marginTop: -22,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 22,
    zIndex: 20,
  },
  infoPanel: {
    position: "absolute",
    bottom: 130,
    left: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    zIndex: 20,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
  },
  previewActions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 48,
    gap: 16,
    justifyContent: "center",
    zIndex: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    maxWidth: 220,
  },
  actionBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
