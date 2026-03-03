import { Ionicons } from "@expo/vector-icons";
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
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

// ─── helpers ─────────────────────────────────────────────────────────────────
function startOfMonth(y: number, m: number) {
  return new Date(y, m, 1);
}
function endOfMonth(y: number, m: number) {
  return new Date(y, m + 1, 0, 23, 59, 59, 999);
}
function fmtDate(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type EntryTypeFilter = "all" | "entry" | "exit";

// ─── component ───────────────────────────────────────────────────────────────
export default function AuditClockScreen() {
  const colors = useColors();
  const now = new Date();

  // ── filter state ──────────────────────────────────────────────────────────
  const [selectedPromoter, setSelectedPromoter] = useState<number | null>(null);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [selectedEntryType, setSelectedEntryType] = useState<EntryTypeFilter>("all");
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // ── modal state ───────────────────────────────────────────────────────────
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [showPromoterPicker, setShowPromoterPicker] = useState(false);
  const [showStorePicker, setShowStorePicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // ── queries ───────────────────────────────────────────────────────────────
  const { data: promoters = [] } = trpc.stores.listPromoterUsers.useQuery();
  const { data: storesForPromoter = [] } = trpc.stores.listForPromoterById.useQuery(
    { promoterId: selectedPromoter! },
    { enabled: selectedPromoter !== null }
  );
  const { data: allStores = [] } = trpc.stores.list.useQuery(undefined, {
    enabled: selectedPromoter === null,
  });
  const availableStores = selectedPromoter !== null ? storesForPromoter : allStores;

  const { startDate, endDate } = useMemo(() => ({
    startDate: startOfMonth(selectedYear, selectedMonth).toISOString(),
    endDate: endOfMonth(selectedYear, selectedMonth).toISOString(),
  }), [selectedYear, selectedMonth]);

  const { data: rawEntries = [], isLoading } = trpc.timeEntries.audit.useQuery({
    promoterId: selectedPromoter ?? undefined,
    storeId: selectedStore ?? undefined,
    startDate,
    endDate,
  });

  // filter by entryType and only entries with photos
  const photosEntries = useMemo(() => {
    return rawEntries.filter((e) => {
      if (!e.photoUrl) return false;
      if (selectedEntryType !== "all" && e.entryType !== selectedEntryType) return false;
      return true;
    });
  }, [rawEntries, selectedEntryType]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const promoterName = (id: number | null) =>
    id ? (promoters.find((p) => p.id === id)?.name ?? "Promotor") : "Todos";
  const storeName = (id: number | null) =>
    id ? (availableStores.find((s) => s.id === id)?.name ?? "Loja") : "Todas";

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  const entryTypeLabel = selectedEntryType === "entry" ? "Entrada" : selectedEntryType === "exit" ? "Saída" : "Tipo";
  const entryTypeActive = selectedEntryType !== "all";

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Auditoria de Ponto</Text>
      </View>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <View style={[styles.filterContainer, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {/* Promotor */}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: selectedPromoter ? colors.primary : colors.border }]}
            onPress={() => setShowPromoterPicker(true)}
          >
            <Ionicons name="person-outline" size={14} color={selectedPromoter ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: selectedPromoter ? colors.primary : colors.foreground }]} numberOfLines={1}>
              {promoterName(selectedPromoter)}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </TouchableOpacity>

          {/* Loja */}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.surface, borderColor: selectedStore ? colors.primary : colors.border }]}
            onPress={() => setShowStorePicker(true)}
          >
            <Ionicons name="storefront-outline" size={14} color={selectedStore ? colors.primary : colors.muted} />
            <Text style={[styles.filterChipText, { color: selectedStore ? colors.primary : colors.foreground }]} numberOfLines={1}>
              {storeName(selectedStore)}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.muted} />
          </TouchableOpacity>

          {/* Período: mês */}
          <TouchableOpacity
            style={[styles.filterChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary }]}
            onPress={() => setShowMonthPicker(true)}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={[styles.filterChipText, { color: colors.primary }]}>
              {MONTHS[selectedMonth].slice(0, 3)} {selectedYear}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </TouchableOpacity>

          {/* Tipo: Entrada / Saída */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: entryTypeActive
                  ? (selectedEntryType === "entry" ? "#22C55E18" : "#EF444418")
                  : colors.surface,
                borderColor: entryTypeActive
                  ? (selectedEntryType === "entry" ? "#22C55E" : "#EF4444")
                  : colors.border,
              },
            ]}
            onPress={() => {
              // cycle: all → entry → exit → all
              setSelectedEntryType((prev) =>
                prev === "all" ? "entry" : prev === "entry" ? "exit" : "all"
              );
            }}
          >
            <Ionicons
              name={selectedEntryType === "entry" ? "log-in-outline" : selectedEntryType === "exit" ? "log-out-outline" : "swap-horizontal-outline"}
              size={14}
              color={entryTypeActive ? (selectedEntryType === "entry" ? "#22C55E" : "#EF4444") : colors.muted}
            />
            <Text
              style={[
                styles.filterChipText,
                {
                  color: entryTypeActive
                    ? (selectedEntryType === "entry" ? "#22C55E" : "#EF4444")
                    : colors.foreground,
                },
              ]}
            >
              {entryTypeLabel}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Carregando registros...</Text>
        </View>
      ) : photosEntries.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhuma foto encontrada{"\n"}para os filtros selecionados
          </Text>
        </View>
      ) : (
        <FlatList
          data={photosEntries}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => {
            const entryDate = new Date(item.entryTime);
            return (
              <TouchableOpacity
                style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setPreviewPhoto(item.photoUrl!)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.photoUrl! }}
                  style={styles.photoThumb}
                  contentFit="cover"
                  transition={200}
                />
                <View style={[styles.photoMeta, { backgroundColor: colors.surface }]}>
                  <View style={[styles.entryBadge, { backgroundColor: item.entryType === "entry" ? "#22C55E18" : "#EF444418" }]}>
                    <Text style={[styles.entryBadgeText, { color: item.entryType === "entry" ? "#22C55E" : "#EF4444" }]}>
                      {item.entryType === "entry" ? "Entrada" : "Saída"}
                    </Text>
                  </View>
                  <Text style={[styles.photoPromoter, { color: colors.foreground }]} numberOfLines={1}>
                    {item.promoterName ?? "—"}
                  </Text>
                  <Text style={[styles.photoStore, { color: colors.muted }]} numberOfLines={1}>
                    {item.storeName ?? "—"}
                  </Text>
                  <Text style={[styles.photoDate, { color: colors.muted }]}>
                    {fmtDate(entryDate)} · {fmtTime(entryDate)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ── Photo Preview Modal ──────────────────────────────────────────── */}
      <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <Pressable style={styles.previewOverlay} onPress={() => setPreviewPhoto(null)}>
          <Image source={{ uri: previewPhoto! }} style={styles.previewImage} contentFit="contain" />
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* ── Promoter Picker Modal ────────────────────────────────────────── */}
      <Modal visible={showPromoterPicker} transparent animationType="slide" onRequestClose={() => setShowPromoterPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPromoterPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Selecionar Promotor</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetItem} onPress={() => { setSelectedPromoter(null); setSelectedStore(null); setShowPromoterPicker(false); }}>
                <Text style={[styles.sheetItemText, { color: !selectedPromoter ? colors.primary : colors.foreground }]}>Todos os promotores</Text>
                {!selectedPromoter && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {promoters.map((p) => (
                <TouchableOpacity key={p.id} style={styles.sheetItem} onPress={() => { setSelectedPromoter(p.id); setSelectedStore(null); setShowPromoterPicker(false); }}>
                  <Text style={[styles.sheetItemText, { color: selectedPromoter === p.id ? colors.primary : colors.foreground }]}>{p.name}</Text>
                  {selectedPromoter === p.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Store Picker Modal ───────────────────────────────────────────── */}
      <Modal visible={showStorePicker} transparent animationType="slide" onRequestClose={() => setShowStorePicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowStorePicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Selecionar Loja</Text>
            <ScrollView>
              <TouchableOpacity style={styles.sheetItem} onPress={() => { setSelectedStore(null); setShowStorePicker(false); }}>
                <Text style={[styles.sheetItemText, { color: !selectedStore ? colors.primary : colors.foreground }]}>Todas as lojas</Text>
                {!selectedStore && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
              {availableStores.map((s) => (
                <TouchableOpacity key={s.id} style={styles.sheetItem} onPress={() => { setSelectedStore(s.id); setShowStorePicker(false); }}>
                  <Text style={[styles.sheetItemText, { color: selectedStore === s.id ? colors.primary : colors.foreground }]}>{s.name}</Text>
                  {selectedStore === s.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Month Picker Modal ───────────────────────────────────────────── */}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 0.5 },
  title: { fontSize: 22, fontWeight: "700" },
  // Fixed filter container with proper height so chips don't get clipped
  filterContainer: {
    height: 56,
    borderBottomWidth: 0.5,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    height: 56,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    height: 34,
  },
  filterChipText: { fontSize: 13, fontWeight: "500", maxWidth: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  grid: { padding: 12 },
  gridRow: { gap: 10, marginBottom: 10 },
  photoCard: { flex: 1, borderRadius: 14, overflow: "hidden", borderWidth: 1 },
  photoThumb: { width: "100%", aspectRatio: 1 },
  photoMeta: { padding: 8, gap: 3 },
  entryBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginBottom: 2 },
  entryBadgeText: { fontSize: 11, fontWeight: "700" },
  photoPromoter: { fontSize: 13, fontWeight: "600" },
  photoStore: { fontSize: 12 },
  photoDate: { fontSize: 11 },
  // preview
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  previewImage: { width: "100%", height: "80%" },
  previewClose: { position: "absolute", top: 52, right: 20 },
  // sheet
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  sheetItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#33333320" },
  sheetItemText: { fontSize: 15 },
});
