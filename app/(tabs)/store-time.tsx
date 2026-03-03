import { Ionicons } from "@expo/vector-icons";
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
function fmtHours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PERIOD_OPTIONS = [
  { label: "Última semana", days: 7 },
  { label: "Últimas 2 semanas", days: 14 },
  { label: "Último mês", days: 30 },
  { label: "Últimos 3 meses", days: 90 },
  { label: "Últimos 6 meses", days: 180 },
];

// ─── component ───────────────────────────────────────────────────────────────
export default function StoreTimeScreen() {
  const colors = useColors();

  const [selectedPromoter, setSelectedPromoter] = useState<{ id: number; name: string } | null>(null);
  const [selectedPeriodDays, setSelectedPeriodDays] = useState(30);
  const [showPromoterPicker, setShowPromoterPicker] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);

  const { data: promoters = [], isLoading: loadingPromoters } = trpc.stores.listPromoterUsers.useQuery();

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - selectedPeriodDays);
    start.setHours(0, 0, 0, 0);
    // Truncate to day precision to avoid re-renders from millisecond differences
    return {
      startDate: start.toISOString().substring(0, 10) + "T00:00:00.000Z",
      endDate: end.toISOString().substring(0, 10) + "T23:59:59.999Z",
    };
  }, [selectedPeriodDays]);

  const { data: stats = [], isLoading: loadingStats } = trpc.timeEntries.storeTimeStats.useQuery(
    { promoterId: selectedPromoter?.id ?? 0, startDate, endDate },
    { enabled: selectedPromoter !== null }
  );

  const periodLabel = PERIOD_OPTIONS.find((p) => p.days === selectedPeriodDays)?.label ?? "Período";

  const totalMinutes = stats.reduce((s, v) => s + v.totalMinutes, 0);

  // accent colors for bars
  const BAR_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

  return (
    <ScreenContainer>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Tempo por Loja</Text>
        <Text style={[styles.subtitle, { color: colors.muted }]}>Média semanal por promotor</Text>
      </View>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: selectedPromoter ? colors.primary : colors.border }]}
          onPress={() => setShowPromoterPicker(true)}
        >
          <Ionicons name="person-outline" size={15} color={selectedPromoter ? colors.primary : colors.muted} />
          <Text style={[styles.filterBtnText, { color: selectedPromoter ? colors.primary : colors.foreground }]} numberOfLines={1}>
            {selectedPromoter ? selectedPromoter.name : "Selecionar Promotor"}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBtnSmall, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowPeriodPicker(true)}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.muted} />
          <Text style={[styles.filterBtnText, { color: colors.foreground }]}>{periodLabel}</Text>
          <Ionicons name="chevron-down" size={13} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      {!selectedPromoter ? (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Selecione um promotor</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Escolha um promotor acima para ver o tempo médio semanal por loja
          </Text>
          <TouchableOpacity
            style={[styles.selectBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowPromoterPicker(true)}
          >
            <Text style={styles.selectBtnText}>Selecionar Promotor</Text>
          </TouchableOpacity>
        </View>
      ) : loadingStats ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Calculando tempo...</Text>
        </View>
      ) : stats.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="time-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem registros</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhum registro de ponto encontrado{"\n"}para {selectedPromoter.name} no período selecionado
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Summary card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stats.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Lojas visitadas</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{fmtHours(totalMinutes)}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total no período</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{fmtHours(Math.round(totalMinutes / (selectedPeriodDays / 7)))}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Média semanal</Text>
              </View>
            </View>
          </View>

          {/* Store bars */}
          <Text style={[styles.sectionLabel, { color: colors.muted }]}>Distribuição por loja</Text>
          {stats.map((item, idx) => {
            const barColor = BAR_COLORS[idx % BAR_COLORS.length];
            return (
              <View key={item.storeId} style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.storeCardHeader}>
                  <View style={[styles.storeColorDot, { backgroundColor: barColor }]} />
                  <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{item.storeName}</Text>
                  <Text style={[styles.storePercent, { color: barColor }]}>{item.percentage}%</Text>
                </View>

                {/* Progress bar */}
                <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                  <View style={[styles.barFill, { width: `${item.percentage}%` as any, backgroundColor: barColor }]} />
                </View>

                {/* Stats row */}
                <View style={styles.storeStatsRow}>
                  <View style={styles.storeStat}>
                    <Ionicons name="time-outline" size={13} color={colors.muted} />
                    <Text style={[styles.storeStatText, { color: colors.muted }]}>
                      Total: <Text style={{ color: colors.foreground, fontWeight: "600" }}>{fmtHours(item.totalMinutes)}</Text>
                    </Text>
                  </View>
                  <View style={styles.storeStat}>
                    <Ionicons name="calendar-outline" size={13} color={colors.muted} />
                    <Text style={[styles.storeStatText, { color: colors.muted }]}>
                      Média/semana: <Text style={{ color: colors.foreground, fontWeight: "600" }}>{fmtHours(item.weeklyAvgMinutes)}</Text>
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ── Promoter Picker ──────────────────────────────────────────────── */}
      <Modal visible={showPromoterPicker} transparent animationType="slide" onRequestClose={() => setShowPromoterPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPromoterPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Selecionar Promotor</Text>
            {loadingPromoters ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <ScrollView>
                {promoters.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.sheetItem}
                    onPress={() => { setSelectedPromoter({ id: p.id, name: p.name }); setShowPromoterPicker(false); }}
                  >
                    <View style={styles.sheetItemLeft}>
                      <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "20" }]}>
                        <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                          {p.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.sheetItemText, { color: selectedPromoter?.id === p.id ? colors.primary : colors.foreground }]}>{p.name}</Text>
                    </View>
                    {selectedPromoter?.id === p.id && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

      {/* ── Period Picker ────────────────────────────────────────────────── */}
      <Modal visible={showPeriodPicker} transparent animationType="slide" onRequestClose={() => setShowPeriodPicker(false)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setShowPeriodPicker(false)}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Selecionar Período</Text>
            <ScrollView>
              {PERIOD_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={styles.sheetItem}
                  onPress={() => { setSelectedPeriodDays(opt.days); setShowPeriodPicker(false); }}
                >
                  <Text style={[styles.sheetItemText, { color: selectedPeriodDays === opt.days ? colors.primary : colors.foreground }]}>{opt.label}</Text>
                  {selectedPeriodDays === opt.days && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
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
  subtitle: { fontSize: 13, marginTop: 2 },
  filterBar: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  filterBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterBtnSmall: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
  },
  filterBtnText: { fontSize: 13, fontWeight: "500", flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
  selectBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  selectBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  content: { padding: 16, gap: 12 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 20, fontWeight: "800" },
  summaryLabel: { fontSize: 11, marginTop: 2, textAlign: "center" },
  summaryDivider: { width: 1, height: 36 },
  sectionLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  storeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  storeCardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  storeColorDot: { width: 10, height: 10, borderRadius: 5 },
  storeName: { flex: 1, fontSize: 15, fontWeight: "600" },
  storePercent: { fontSize: 16, fontWeight: "800" },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  storeStatsRow: { flexDirection: "row", gap: 16 },
  storeStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  storeStatText: { fontSize: 12 },
  // sheet
  sheetOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  sheetTitle: { fontSize: 17, fontWeight: "700", marginBottom: 16 },
  sheetItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#33333320" },
  sheetItemLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  sheetItemText: { fontSize: 15 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 16, fontWeight: "700" },
});
