import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
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
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

type FilterType = "brand" | "store" | "promoter" | "date" | "status";
type PhotoStatus = "pending" | "approved" | "rejected";

type PhotoItem = {
  id: number;
  photoUrl: string;
  status: string | null;
  photoTimestamp: string | Date | null;
  brandId?: number | null;
  storeId?: number | null;
  userId?: number | null;
};

export default function ManagerPhotosScreen() {
  const colors = useColors();
  const router = useRouter();
  const { appRole } = useRole();
  const isMaster = appRole === "master";
  const accentColor = isMaster ? "#7C3AED" : colors.primary;

  // Filters
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();
  const [selectedStoreId, setSelectedStoreId] = useState<number | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<PhotoStatus | undefined>();
  const [activeFilter, setActiveFilter] = useState<FilterType | null>(null);

  // Selected photo for preview + approval
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [approving, setApproving] = useState(false);
  const previewFlatListRef = useRef<FlatList<PhotoItem>>(null);

  // Data
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.list.useQuery();
  const { data: promoters } = trpc.storePerformance.promoters.useQuery();

  const startDate = selectedDate ? `${selectedDate}T00:00:00.000Z` : undefined;
  const endDate = selectedDate ? `${selectedDate}T23:59:59.999Z` : undefined;

  const { data: photos, isLoading, refetch } = trpc.photos.listAll.useQuery({
    brandId: selectedBrandId,
    storeId: selectedStoreId,
    userId: selectedUserId,
    startDate,
    endDate,
    status: selectedStatus,
    limit: 100,
  });

  const updateStatusMutation = trpc.photos.updateStatus.useMutation();

  // Sort: if date filter active → chronological; otherwise newest first
  const sortedPhotos = useMemo((): PhotoItem[] => {
    const arr: PhotoItem[] = (photos ?? []).map((p) => ({
      ...p,
      photoUrl: p.photoUrl ?? "",
      photoTimestamp: p.photoTimestamp ?? null,
    }));
    if (selectedDate) {
      return arr.sort((a, b) => new Date(a.photoTimestamp ?? 0).getTime() - new Date(b.photoTimestamp ?? 0).getTime());
    }
    return arr;
  }, [photos, selectedDate]);

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
    setSelectedDate(undefined);
    setSelectedStatus(undefined);
  }, []);

  const hasFilters = selectedBrandId || selectedStoreId || selectedUserId || selectedDate || selectedStatus;

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

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const renderFilterChip = (label: string, type: FilterType, active: boolean) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? accentColor : colors.surface,
          borderColor: active ? accentColor : colors.border,
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
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
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

    if (activeFilter === "date") {
      const today = new Date();
      const dates = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        return d.toISOString().split("T")[0];
      });
      return (
        <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
            <TouchableOpacity
              style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
              onPress={() => { setSelectedDate(undefined); setActiveFilter(null); }}
            >
              <Text style={[styles.dropdownItemText, { color: colors.muted }]}>Todas as datas</Text>
            </TouchableOpacity>
            {dates.map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dropdownItem,
                  { borderBottomColor: colors.border },
                  selectedDate === d && { backgroundColor: accentColor + "15" },
                ]}
                onPress={() => { setSelectedDate(d); setActiveFilter(null); }}
              >
                <Text style={[styles.dropdownItemText, { color: selectedDate === d ? accentColor : colors.foreground }]}>
                  {formatDate(d + "T00:00:00")}
                </Text>
                {selectedDate === d && <Ionicons name="checkmark" size={16} color={accentColor} />}
              </TouchableOpacity>
            ))}
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
        <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
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
                currentId === item.id && { backgroundColor: accentColor + "15" },
              ]}
              onPress={() => onSelect(item.id)}
            >
              <Text style={[styles.dropdownItemText, { color: currentId === item.id ? accentColor : colors.foreground }]}>
                {item.name ?? item.login ?? `#${item.id}`}
              </Text>
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
          <Text style={[styles.headerCount, { color: colors.muted }]}>
            {isLoading ? "Carregando..." : `${sortedPhotos.length} foto${sortedPhotos.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        {hasFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Ionicons name="close-circle" size={22} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {renderFilterChip(getBrandName(selectedBrandId), "brand", !!selectedBrandId)}
          {renderFilterChip(getStoreName(selectedStoreId), "store", !!selectedStoreId)}
          {renderFilterChip(getPromoterName(selectedUserId), "promoter", !!selectedUserId)}
          {renderFilterChip(
            selectedDate ? formatDate(selectedDate + "T00:00:00") : "Data",
            "date",
            !!selectedDate
          )}
          {renderFilterChip(
            getStatusLabel(selectedStatus),
            "status",
            !!selectedStatus
          )}
        </ScrollView>
      </View>

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
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : sortedPhotos.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="images-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {hasFilters ? "Nenhuma foto com esses filtros" : "Nenhuma foto enviada ainda"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedPhotos}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
              onPress={() => openPhoto(index)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: item.photoUrl }}
                style={styles.photoImage}
                contentFit="cover"
                transition={200}
              />
              {item.status === "approved" && (
                <View style={[styles.statusBadge, { backgroundColor: "#0E9F6E" }]}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              )}
              {item.status === "rejected" && (
                <View style={[styles.statusBadge, { backgroundColor: "#E02424" }]}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              )}
              {(!item.status || item.status === "pending") && (
                <View style={[styles.statusBadge, { backgroundColor: "#F59E0B" }]}>
                  <Ionicons name="time" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      {/* Photo Preview Modal with Swipe + Approve/Reject */}
      <Modal visible={previewVisible} transparent animationType="fade" onRequestClose={closePreview}>
        <View style={styles.previewOverlay}>
          {/* Close button */}
          <TouchableOpacity style={styles.previewClose} onPress={closePreview}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>

          {/* Counter: X / N */}
          <View style={styles.previewCounter}>
            <Text style={styles.previewCounterText}>
              {previewIndex + 1} / {sortedPhotos.length}
            </Text>
          </View>

          {/* Status badge for current photo */}
          {currentStatus && (
            <View style={[
              styles.previewStatusBadge,
              { backgroundColor: currentStatus === "approved" ? "#0E9F6E" : currentStatus === "rejected" ? "#E02424" : "#F59E0B" }
            ]}>
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

          {/* Swipeable photo list */}
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
              }
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, alignItems: "center", justifyContent: "center" }}>
                <Image
                  source={{ uri: item.photoUrl }}
                  style={styles.previewImage}
                  contentFit="contain"
                />
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
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          )}

          {/* Action buttons */}
          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.rejectBtn,
                currentStatus === "rejected" && styles.actionBtnActive,
                approving && styles.actionBtnDisabled,
              ]}
              onPress={handleReject}
              disabled={approving || currentStatus === "rejected"}
              activeOpacity={0.8}
            >
              {approving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={22} color="#fff" />
                  <Text style={styles.actionBtnText}>Rejeitar</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.approveBtn,
                currentStatus === "approved" && styles.actionBtnActive,
                approving && styles.actionBtnDisabled,
              ]}
              onPress={handleApprove}
              disabled={approving || currentStatus === "approved"}
              activeOpacity={0.8}
            >
              {approving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                  <Text style={styles.actionBtnText}>Aprovar</Text>
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
  clearBtn: { padding: 4 },
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
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
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
  previewStatusBadge: {
    position: "absolute",
    top: 54,
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
    top: "50%",
    marginTop: -24,
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
    top: "50%",
    marginTop: -24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 22,
    zIndex: 20,
  },
  previewActions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 24,
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
    maxWidth: 180,
  },
  rejectBtn: {
    backgroundColor: "#E02424",
  },
  approveBtn: {
    backgroundColor: "#0E9F6E",
  },
  actionBtnActive: {
    opacity: 0.5,
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
