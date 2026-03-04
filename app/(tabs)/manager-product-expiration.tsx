import { Image } from "expo-image";
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function startOfMonth(y: number, m: number) { return new Date(y, m, 1); }
function endOfMonth(y: number, m: number) { return new Date(y, m + 1, 0, 23, 59, 59, 999); }

function statusColor(status: string) {
  if (status === "approved") return "#0E9F6E";
  if (status === "rejected") return "#E02424";
  return "#D97706";
}
function statusLabel(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Recusado";
  return "Pendente";
}
function statusIcon(status: string): "checkmark-circle" | "close-circle" | "time" {
  if (status === "approved") return "checkmark-circle";
  if (status === "rejected") return "close-circle";
  return "time";
}

// ─── Review Modal ─────────────────────────────────────────────────────────────
function ReviewModal({
  item,
  visible,
  onClose,
  onApprove,
  onReject,
  loading,
  colors,
}: {
  item: {
    id: number;
    brandName: string | null;
    storeName: string | null;
    promoterName: string | null;
    description: string | null;
    status: string;
    managerNotes: string | null;
    createdAt: Date | string;
    photos: { id: number; photoUrl: string; sortOrder: number }[];
  } | null;
  visible: boolean;
  onClose: () => void;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  loading: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  const [notes, setNotes] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (!item) return null;

  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const handleClose = () => { setNotes(""); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[rStyles.modal, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[rStyles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[rStyles.title, { color: colors.foreground }]}>Revisar Registro</Text>
          <View style={[rStyles.statusPill, { backgroundColor: statusColor(item.status) + "20" }]}>
            <Text style={[rStyles.statusPillText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={rStyles.content}>
          {/* Info */}
          <View style={[rStyles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={rStyles.infoRow}>
              <Ionicons name="person-outline" size={15} color={colors.muted} />
              <Text style={[rStyles.infoLabel, { color: colors.muted }]}>Promotor:</Text>
              <Text style={[rStyles.infoValue, { color: colors.foreground }]}>{item.promoterName ?? "—"}</Text>
            </View>
            <View style={rStyles.infoRow}>
              <Ionicons name="pricetag-outline" size={15} color={colors.muted} />
              <Text style={[rStyles.infoLabel, { color: colors.muted }]}>Marca:</Text>
              <Text style={[rStyles.infoValue, { color: colors.foreground }]}>{item.brandName ?? "—"}</Text>
            </View>
            <View style={rStyles.infoRow}>
              <Ionicons name="storefront-outline" size={15} color={colors.muted} />
              <Text style={[rStyles.infoLabel, { color: colors.muted }]}>Loja:</Text>
              <Text style={[rStyles.infoValue, { color: colors.foreground }]}>{item.storeName ?? "—"}</Text>
            </View>
            <View style={rStyles.infoRow}>
              <Ionicons name="calendar-outline" size={15} color={colors.muted} />
              <Text style={[rStyles.infoLabel, { color: colors.muted }]}>Enviado:</Text>
              <Text style={[rStyles.infoValue, { color: colors.foreground }]}>{dateStr} às {timeStr}</Text>
            </View>
          </View>

          {/* Photos */}
          {item.photos.length > 0 && (
            <View style={rStyles.section}>
              <Text style={[rStyles.sectionTitle, { color: colors.foreground }]}>Fotos ({item.photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.photos.map((p, i) => (
                  <Pressable key={p.id} onPress={() => setPreviewIndex(i)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, marginRight: 10 }]}>
                    <Image source={{ uri: p.photoUrl }} style={rStyles.photoThumb} contentFit="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Description */}
          {item.description ? (
            <View style={rStyles.section}>
              <Text style={[rStyles.sectionTitle, { color: colors.foreground }]}>Descrição</Text>
              <View style={[rStyles.descBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[rStyles.descText, { color: colors.foreground }]}>{item.description}</Text>
              </View>
            </View>
          ) : null}

          {/* Notes input */}
          {item.status === "pending" && (
            <View style={rStyles.section}>
              <Text style={[rStyles.sectionTitle, { color: colors.foreground }]}>Observações (opcional)</Text>
              <TextInput
                style={[rStyles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Adicione um comentário para o promotor..."
                placeholderTextColor={colors.muted}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Previous notes */}
          {item.managerNotes && item.status !== "pending" ? (
            <View style={[rStyles.prevNotes, { backgroundColor: statusColor(item.status) + "12", borderColor: statusColor(item.status) + "40" }]}>
              <Ionicons name="chatbubble-outline" size={14} color={statusColor(item.status)} />
              <Text style={[rStyles.prevNotesText, { color: colors.foreground }]}>{item.managerNotes}</Text>
            </View>
          ) : null}

          {/* Action Buttons */}
          {item.status === "pending" && (
            <View style={rStyles.actionRow}>
              <Pressable
                style={({ pressed }) => [rStyles.rejectBtn, { opacity: pressed || loading ? 0.7 : 1 }]}
                onPress={() => onReject(notes)}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={rStyles.actionBtnText}>Recusar</Text>
                  </>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [rStyles.approveBtn, { opacity: pressed || loading ? 0.7 : 1 }]}
                onPress={() => onApprove(notes)}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                    <Text style={rStyles.actionBtnText}>Aprovar</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Photo Preview */}
        {previewIndex !== null && (
          <Modal visible animationType="fade" transparent onRequestClose={() => setPreviewIndex(null)}>
            <View style={rStyles.previewOverlay}>
              <Pressable style={rStyles.previewClose} onPress={() => setPreviewIndex(null)}>
                <Ionicons name="close-circle" size={32} color="#FFFFFF" />
              </Pressable>
              <Image source={{ uri: item.photos[previewIndex].photoUrl }} style={rStyles.previewImage} contentFit="contain" />
              <View style={rStyles.previewCounter}>
                <Text style={rStyles.previewCounterText}>{previewIndex + 1} / {item.photos.length}</Text>
              </View>
              {item.photos.length > 1 && (
                <View style={rStyles.previewNav}>
                  <Pressable
                    style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => setPreviewIndex((i) => Math.max(0, (i ?? 0) - 1))}
                    disabled={previewIndex === 0}
                  >
                    <Ionicons name="chevron-back" size={28} color={previewIndex === 0 ? "#666" : "#FFF"} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}
                    onPress={() => setPreviewIndex((i) => Math.min(item.photos.length - 1, (i ?? 0) + 1))}
                    disabled={previewIndex === item.photos.length - 1}
                  >
                    <Ionicons name="chevron-forward" size={28} color={previewIndex === item.photos.length - 1 ? "#666" : "#FFF"} />
                  </Pressable>
                </View>
              )}
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
type ExpirationItem = {
  id: number;
  brandName: string | null;
  storeName: string | null;
  promoterName: string | null;
  description: string | null;
  status: string;
  managerNotes: string | null;
  createdAt: Date | string;
  photos: { id: number; photoUrl: string; sortOrder: number }[];
};

export default function ManagerProductExpirationScreen() {
  const colors = useColors();
  const now = new Date();

  // ── filter state ──────────────────────────────────────────────────────────
  const [filterBrandId, setFilterBrandId] = useState<number | null>(null);
  const [filterStoreId, setFilterStoreId] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // ── picker modals ─────────────────────────────────────────────────────────
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [showPromoterPicker, setShowPromoterPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // ── review modal ──────────────────────────────────────────────────────────
  const [reviewItem, setReviewItem] = useState<ExpirationItem | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: brands = [] } = trpc.brands.list.useQuery();
  const { data: stores = [] } = trpc.stores.list.useQuery();
  const { data: promoters = [] } = trpc.stores.listPromoterUsers.useQuery();

  const { startDate, endDate } = useMemo(() => {
    if (selectedYear === null || selectedMonth === null) return { startDate: undefined, endDate: undefined };
    return {
      startDate: startOfMonth(selectedYear, selectedMonth).toISOString(),
      endDate: endOfMonth(selectedYear, selectedMonth).toISOString(),
    };
  }, [selectedYear, selectedMonth]);

  const { data: expirations = [], isLoading, refetch } = trpc.productExpirations.listAll.useQuery({
    brandId: filterBrandId ?? undefined,
    storeId: filterStoreId ?? undefined,
    userId: filterUserId ?? undefined,
    status: filterStatus ?? undefined,
    startDate,
    endDate,
    limit: 100,
  });

  const updateStatusMutation = trpc.productExpirations.updateStatus.useMutation();

  const handleApprove = async (notes: string) => {
    if (!reviewItem) return;
    setReviewLoading(true);
    try {
      await updateStatusMutation.mutateAsync({ id: reviewItem.id, status: "approved", managerNotes: notes || undefined });
      setReviewVisible(false);
      setReviewItem(null);
      refetch();
    } finally {
      setReviewLoading(false);
    }
  };

  const handleReject = async (notes: string) => {
    if (!reviewItem) return;
    setReviewLoading(true);
    try {
      await updateStatusMutation.mutateAsync({ id: reviewItem.id, status: "rejected", managerNotes: notes || undefined });
      setReviewVisible(false);
      setReviewItem(null);
      refetch();
    } finally {
      setReviewLoading(false);
    }
  };

  const pendingCount = expirations.filter((e) => e.status === "pending").length;

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const selectedBrandName = filterBrandId ? (brands.find((b) => b.id === filterBrandId)?.name ?? "Marca") : "Marca";
  const selectedStoreName = filterStoreId ? (stores.find((s) => s.id === filterStoreId)?.name ?? "Loja") : "Loja";
  const selectedPromoterName = filterUserId ? (promoters.find((p) => p.id === filterUserId)?.name ?? "Promotor") : "Promotor";
  const selectedDateLabel = selectedYear !== null && selectedMonth !== null
    ? `${MONTHS[selectedMonth].slice(0, 3)} ${selectedYear}`
    : "Data";

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>Vencimento de Produtos</Text>
          {pendingCount > 0 && (
            <Text style={[styles.subtitle, { color: "#D97706" }]}>{pendingCount} pendente{pendingCount > 1 ? "s" : ""} aguardando revisão</Text>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {/* Brand */}
          <Pressable
            style={({ pressed }) => [styles.filterChip, { backgroundColor: filterBrandId ? colors.primary + "20" : colors.surface, borderColor: filterBrandId ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => setShowBrandPicker(true)}
          >
            <Ionicons name="pricetag-outline" size={13} color={filterBrandId ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: filterBrandId ? colors.primary : colors.foreground }]} numberOfLines={1}>{selectedBrandName}</Text>
            <Ionicons name="chevron-down" size={12} color={filterBrandId ? colors.primary : colors.muted} />
          </Pressable>

          {/* Store */}
          <Pressable
            style={({ pressed }) => [styles.filterChip, { backgroundColor: filterStoreId ? colors.primary + "20" : colors.surface, borderColor: filterStoreId ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => setShowStorePicker(true)}
          >
            <Ionicons name="storefront-outline" size={13} color={filterStoreId ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: filterStoreId ? colors.primary : colors.foreground }]} numberOfLines={1}>{selectedStoreName}</Text>
            <Ionicons name="chevron-down" size={12} color={filterStoreId ? colors.primary : colors.muted} />
          </Pressable>

          {/* Promoter */}
          <Pressable
            style={({ pressed }) => [styles.filterChip, { backgroundColor: filterUserId ? colors.primary + "20" : colors.surface, borderColor: filterUserId ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => setShowPromoterPicker(true)}
          >
            <Ionicons name="person-outline" size={13} color={filterUserId ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: filterUserId ? colors.primary : colors.foreground }]} numberOfLines={1}>{selectedPromoterName}</Text>
            <Ionicons name="chevron-down" size={12} color={filterUserId ? colors.primary : colors.muted} />
          </Pressable>

          {/* Status */}
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <Pressable
              key={s}
              style={({ pressed }) => [styles.filterChip, { backgroundColor: filterStatus === s ? statusColor(s) : colors.surface, borderColor: filterStatus === s ? statusColor(s) : colors.border }, pressed && { opacity: 0.8 }]}
              onPress={() => setFilterStatus(filterStatus === s ? null : s)}
            >
              <Text style={[styles.filterChipText, { color: filterStatus === s ? "#FFFFFF" : colors.foreground }]}>{statusLabel(s)}</Text>
            </Pressable>
          ))}

          {/* Date */}
          <Pressable
            style={({ pressed }) => [styles.filterChip, { backgroundColor: selectedYear !== null ? colors.primary + "20" : colors.surface, borderColor: selectedYear !== null ? colors.primary : colors.border }, pressed && { opacity: 0.8 }]}
            onPress={() => setShowMonthPicker(true)}
          >
            <Ionicons name="calendar-outline" size={13} color={selectedYear !== null ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: selectedYear !== null ? colors.primary : colors.foreground }]}>{selectedDateLabel}</Text>
            {selectedYear !== null && (
              <Pressable onPress={(e) => { e.stopPropagation(); setSelectedYear(null); setSelectedMonth(null); }}>
                <Ionicons name="close-circle" size={14} color={colors.primary} />
              </Pressable>
            )}
          </Pressable>
        </ScrollView>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Carregando registros...</Text>
        </View>
      ) : expirations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum registro encontrado{"\n"}para os filtros selecionados.</Text>
        </View>
      ) : (
        <FlatList
          data={expirations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const date = new Date(item.createdAt);
            const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
            const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
            return (
              <Pressable
                style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => { setReviewItem(item as any); setReviewVisible(true); }}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.cardBrand, { color: colors.foreground }]}>{item.brandName ?? "—"}</Text>
                    <Text style={[styles.cardMeta, { color: colors.muted }]}>{item.promoterName ?? "—"} · {item.storeName ?? "—"}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                    <Ionicons name={statusIcon(item.status)} size={13} color={statusColor(item.status)} />
                    <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>

                {/* Date */}
                <View style={styles.cardDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={colors.muted} />
                  <Text style={[styles.cardDate, { color: colors.muted }]}>{dateStr} às {timeStr}</Text>
                </View>

                {/* Photos thumbnails */}
                {item.photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {item.photos.map((p) => (
                      <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.cardThumb} contentFit="cover" />
                    ))}
                  </ScrollView>
                )}

                {/* Description */}
                {item.description ? (
                  <Text style={[styles.cardDesc, { color: colors.foreground }]} numberOfLines={2}>{item.description}</Text>
                ) : null}

                {/* Tap hint for pending */}
                {item.status === "pending" && (
                  <View style={styles.tapHint}>
                    <Text style={[styles.tapHintText, { color: colors.primary }]}>Toque para revisar</Text>
                    <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {/* ── Brand Picker ─────────────────────────────────────────────────── */}
      <Modal visible={showBrandPicker} transparent animationType="slide" onRequestClose={() => setShowBrandPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowBrandPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filtrar por Marca</Text>
            <TouchableOpacity style={styles.sheetItem} onPress={() => { setFilterBrandId(null); setShowBrandPicker(false); }}>
              <Text style={[styles.sheetItemText, { color: !filterBrandId ? colors.primary : colors.foreground }]}>Todas as marcas</Text>
              {!filterBrandId && <Ionicons name="checkmark" size={18} color={colors.primary} />}
            </TouchableOpacity>
            {brands.map((b) => (
              <TouchableOpacity key={b.id} style={styles.sheetItem} onPress={() => { setFilterBrandId(b.id); setShowBrandPicker(false); }}>
                <Text style={[styles.sheetItemText, { color: filterBrandId === b.id ? colors.primary : colors.foreground }]}>{b.name}</Text>
                {filterBrandId === b.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Store Picker ──────────────────────────────────────────────────── */}
      <Modal visible={showStorePicker} transparent animationType="slide" onRequestClose={() => setShowStorePicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowStorePicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filtrar por Loja</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetItem} onPress={() => { setFilterStoreId(null); setShowStorePicker(false); }}>
                <Text style={[styles.sheetItemText, { color: !filterStoreId ? colors.primary : colors.foreground }]}>Todas as lojas</Text>
                {!filterStoreId && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {stores.map((s) => (
                <TouchableOpacity key={s.id} style={styles.sheetItem} onPress={() => { setFilterStoreId(s.id); setShowStorePicker(false); }}>
                  <Text style={[styles.sheetItemText, { color: filterStoreId === s.id ? colors.primary : colors.foreground }]}>{s.name}</Text>
                  {filterStoreId === s.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Promoter Picker ───────────────────────────────────────────────── */}
      <Modal visible={showPromoterPicker} transparent animationType="slide" onRequestClose={() => setShowPromoterPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPromoterPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Filtrar por Promotor</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetItem} onPress={() => { setFilterUserId(null); setShowPromoterPicker(false); }}>
                <Text style={[styles.sheetItemText, { color: !filterUserId ? colors.primary : colors.foreground }]}>Todos os promotores</Text>
                {!filterUserId && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {promoters.map((p) => (
                <TouchableOpacity key={p.id} style={styles.sheetItem} onPress={() => { setFilterUserId(p.id); setShowPromoterPicker(false); }}>
                  <Text style={[styles.sheetItemText, { color: filterUserId === p.id ? colors.primary : colors.foreground }]}>{p.name ?? p.login}</Text>
                  {filterUserId === p.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Month Picker ──────────────────────────────────────────────────── */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowMonthPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Selecionar Período</Text>
            <ScrollView>
              {years.map((y) =>
                MONTHS.map((m, mi) => (
                  <TouchableOpacity
                    key={`${y}-${mi}`}
                    style={styles.sheetItem}
                    onPress={() => { setSelectedYear(y); setSelectedMonth(mi); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.sheetItemText, { color: selectedYear === y && selectedMonth === mi ? colors.primary : colors.foreground }]}>
                      {m} {y}
                    </Text>
                    {selectedYear === y && selectedMonth === mi && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Review Modal ──────────────────────────────────────────────────── */}
      <ReviewModal
        item={reviewItem as any}
        visible={reviewVisible}
        onClose={() => { setReviewVisible(false); setReviewItem(null); }}
        onApprove={handleApprove}
        onReject={handleReject}
        loading={reviewLoading}
        colors={colors}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2, fontWeight: "500" },
  filterContainer: { height: 56, borderBottomWidth: 0.5 },
  filterRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, gap: 8, height: 56 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, height: 34 },
  filterChipText: { fontSize: 12, fontWeight: "500", maxWidth: 90 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  list: { padding: 12, gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardBrand: { fontSize: 15, fontWeight: "700" },
  cardMeta: { fontSize: 12 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardDate: { fontSize: 12 },
  cardThumb: { width: 64, height: 64, borderRadius: 8, marginRight: 8 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end" },
  tapHintText: { fontSize: 12, fontWeight: "500" },
  // Sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  sheetTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  sheetItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "rgba(128,128,128,0.2)" },
  sheetItemText: { fontSize: 15 },
});

const rStyles = StyleSheet.create({
  modal: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  title: { fontSize: 17, fontWeight: "700", flex: 1, marginLeft: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusPillText: { fontSize: 12, fontWeight: "600" },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  infoCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: 13, width: 65 },
  infoValue: { fontSize: 13, fontWeight: "500", flex: 1 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  photoThumb: { width: 100, height: 100, borderRadius: 10 },
  descBox: { borderRadius: 10, borderWidth: 1, padding: 12 },
  descText: { fontSize: 13, lineHeight: 19 },
  notesInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80 },
  prevNotes: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  prevNotesText: { fontSize: 13, flex: 1, lineHeight: 18 },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  rejectBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#E02424" },
  approveBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: "#0E9F6E" },
  actionBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  previewClose: { position: "absolute", top: 48, right: 20, zIndex: 10 },
  previewImage: { width: "100%", height: "70%" },
  previewCounter: { position: "absolute", bottom: 80, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  previewCounterText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  previewNav: { position: "absolute", bottom: 40, flexDirection: "row", gap: 40 },
});
