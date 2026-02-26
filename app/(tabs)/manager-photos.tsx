import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null);
  const [approving, setApproving] = useState(false);

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
  const sortedPhotos = useMemo(() => {
    if (!photos) return [];
    const arr = [...photos] as PhotoItem[];
    if (selectedDate) {
      arr.sort((a, b) => new Date(a.photoTimestamp ?? 0).getTime() - new Date(b.photoTimestamp ?? 0).getTime());
    } else {
      arr.sort((a, b) => new Date(b.photoTimestamp ?? 0).getTime() - new Date(a.photoTimestamp ?? 0).getTime());
    }
    return arr;
  }, [photos, selectedDate]);

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
    const p = promoters?.find((p) => p.id === id);
    return p ? (p.name ?? (p as any).login ?? `Promotor ${p.id}`) : "Todos";
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const handleApprove = async () => {
    if (!previewPhoto) return;
    setApproving(true);
    try {
      await updateStatusMutation.mutateAsync({ id: previewPhoto.id, status: "approved" });
      await refetch();
      setPreviewPhoto((prev) => prev ? { ...prev, status: "approved" } : null);
      Alert.alert("Foto Aprovada", "A foto foi aprovada e o score do promotor foi atualizado.");
    } catch {
      Alert.alert("Erro", "Não foi possível aprovar a foto.");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!previewPhoto) return;
    setApproving(true);
    try {
      await updateStatusMutation.mutateAsync({ id: previewPhoto.id, status: "rejected" });
      await refetch();
      setPreviewPhoto((prev) => prev ? { ...prev, status: "rejected" } : null);
      Alert.alert("Foto Rejeitada", "A foto foi rejeitada e o promotor será notificado.");
    } catch {
      Alert.alert("Erro", "Não foi possível rejeitar a foto.");
    } finally {
      setApproving(false);
    }
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
      activeOpacity={0.75}
    >
      <Text style={[styles.filterChipText, { color: active ? "#fff" : colors.foreground }]}>
        {label}
      </Text>
      {active && <Ionicons name="chevron-down" size={12} color="#fff" />}
    </TouchableOpacity>
  );

  const renderFilterDropdown = () => {
    if (!activeFilter) return null;

    let items: { id: number; label: string }[] = [];
    let onSelect: (id: number | undefined) => void = () => {};
    let currentId: number | undefined;

    if (activeFilter === "brand") {
      items = (brands ?? []).map((b) => ({ id: b.id, label: b.name }));
      onSelect = (id) => { setSelectedBrandId(id); setActiveFilter(null); };
      currentId = selectedBrandId;
    } else if (activeFilter === "store") {
      items = (stores ?? []).map((s) => ({ id: s.id, label: s.name }));
      onSelect = (id) => { setSelectedStoreId(id); setActiveFilter(null); };
      currentId = selectedStoreId;
    } else if (activeFilter === "promoter") {
      items = (promoters ?? []).map((p) => ({ id: p.id, label: p.name ?? (p as any).login ?? `Promotor ${p.id}` }));
      onSelect = (id) => { setSelectedUserId(id); setActiveFilter(null); };
      currentId = selectedUserId;
    }

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
      const days = Array.from({ length: 14 }, (_, i) => {
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
            {days.map((d) => {
              const [year, month, day] = d.split("-");
              const label = `${day}/${month}/${year}`;
              return (
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
                    {label}
                  </Text>
                  {selectedDate === d && <Ionicons name="checkmark" size={16} color={accentColor} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
          <TouchableOpacity
            style={[styles.dropdownItem, { borderBottomColor: colors.border }]}
            onPress={() => { onSelect(undefined); }}
          >
            <Text style={[styles.dropdownItemText, { color: colors.muted }]}>
              {activeFilter === "brand" ? "Todas as marcas" : activeFilter === "store" ? "Todas as lojas" : "Todos os promotores"}
            </Text>
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
                {item.label}
              </Text>
              {currentId === item.id && <Ionicons name="checkmark" size={16} color={accentColor} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const currentStatus = previewPhoto?.status;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Fotos dos Promotores</Text>
          <Text style={[styles.headerCount, { color: colors.muted }]}>
            {isLoading ? "Carregando..." : `${sortedPhotos.length} foto${sortedPhotos.length !== 1 ? "s" : ""}`}
          </Text>
        </View>
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {renderFilterChip(
            selectedBrandId ? getBrandName(selectedBrandId) : "Marca",
            "brand",
            !!selectedBrandId
          )}
          {renderFilterChip(
            selectedStoreId ? getStoreName(selectedStoreId) : "Loja",
            "store",
            !!selectedStoreId
          )}
          {renderFilterChip(
            selectedUserId ? getPromoterName(selectedUserId) : "Promotor",
            "promoter",
            !!selectedUserId
          )}
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

      {/* Dropdown */}
      {activeFilter && (
        <Pressable style={styles.dropdownOverlay} onPress={() => setActiveFilter(null)}>
          <View style={styles.dropdownContainer}>
            {renderFilterDropdown()}
          </View>
        </Pressable>
      )}

      {/* Photo Grid */}
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
              onPress={() => setPreviewPhoto(item)}
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

      {/* Photo Preview Modal with Approve/Reject */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.previewOverlay}>
          {/* Close button */}
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>

          {/* Status badge */}
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

          {/* Photo */}
          <Image
            source={{ uri: previewPhoto?.photoUrl ?? "" }}
            style={styles.previewImage}
            contentFit="contain"
          />

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
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: { width: "100%", height: "70%" },
  previewClose: { position: "absolute", top: 50, right: 16, zIndex: 10 },
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
    zIndex: 10,
  },
  previewStatusText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  previewActions: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 16,
    justifyContent: "center",
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
