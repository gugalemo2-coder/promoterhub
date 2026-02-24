import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

// ─── Visit Card ───────────────────────────────────────────────────────────────
function VisitCard({
  item,
}: {
  item: {
    visitDate: string;
    userId: number;
    userName: string;
    entryTime: Date;
    exitTime: Date | null;
    hoursWorked: number;
    photosCount: number;
    approvedPhotosCount: number;
    materialsCount: number;
    hasGeoAlert: boolean;
  };
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const entryTime = new Date(item.entryTime);
  const exitTime = item.exitTime ? new Date(item.exitTime) : null;

  const formatTime = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  };

  const initials = item.userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const approvalRate =
    item.photosCount > 0
      ? Math.round((item.approvedPhotosCount / item.photosCount) * 100)
      : 0;

  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={({ pressed }) => [
        styles.visitCard,
        {
          backgroundColor: colors.surface,
          borderColor: item.hasGeoAlert ? colors.error + "40" : colors.border,
          borderWidth: item.hasGeoAlert ? 1.5 : 1,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      {/* Top row */}
      <View style={styles.visitTop}>
        {/* Date badge */}
        <View style={[styles.dateBadge, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.dateBadgeText, { color: colors.primary }]}>
            {formatDate(item.visitDate)}
          </Text>
        </View>

        {/* Promoter avatar */}
        <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{initials || "?"}</Text>
        </View>

        {/* Info */}
        <View style={styles.visitInfo}>
          <Text style={[styles.visitName, { color: colors.foreground }]} numberOfLines={1}>
            {item.userName}
          </Text>
          <View style={styles.visitTimes}>
            <Ionicons name="log-in-outline" size={12} color={colors.success} />
            <Text style={[styles.visitTimeText, { color: colors.muted }]}>
              {formatTime(entryTime)}
            </Text>
            {exitTime && (
              <>
                <Ionicons name="log-out-outline" size={12} color={colors.error} />
                <Text style={[styles.visitTimeText, { color: colors.muted }]}>
                  {formatTime(exitTime)}
                </Text>
              </>
            )}
            {!exitTime && (
              <Text style={[styles.visitTimeText, { color: colors.warning }]}>
                Sem saída registrada
              </Text>
            )}
          </View>
        </View>

        {/* Hours badge */}
        <View style={[styles.hoursBadge, { backgroundColor: colors.success + "15" }]}>
          <Text style={[styles.hoursBadgeText, { color: colors.success }]}>
            {item.hoursWorked}h
          </Text>
        </View>

        {/* Alert icon */}
        {item.hasGeoAlert && (
          <Ionicons name="warning" size={18} color={colors.error} />
        )}
      </View>

      {/* Quick stats row */}
      <View style={styles.quickStatsRow}>
        <View style={styles.quickStat}>
          <Ionicons name="camera" size={13} color="#8B5CF6" />
          <Text style={[styles.quickStatText, { color: colors.muted }]}>
            {item.photosCount} foto{item.photosCount !== 1 ? "s" : ""}
          </Text>
        </View>
        {item.photosCount > 0 && (
          <View style={styles.quickStat}>
            <Ionicons name="checkmark-circle" size={13} color={colors.success} />
            <Text style={[styles.quickStatText, { color: colors.muted }]}>
              {item.approvedPhotosCount} aprovada{item.approvedPhotosCount !== 1 ? "s" : ""}
            </Text>
          </View>
        )}
        {item.materialsCount > 0 && (
          <View style={styles.quickStat}>
            <Ionicons name="cube" size={13} color={colors.warning} />
            <Text style={[styles.quickStatText, { color: colors.muted }]}>
              {item.materialsCount} material{item.materialsCount !== 1 ? "is" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          {/* Approval rate bar */}
          {item.photosCount > 0 && (
            <View style={styles.approvalRow}>
              <Text style={[styles.approvalLabel, { color: colors.muted }]}>
                Taxa de aprovação de fotos
              </Text>
              <View style={styles.approvalBarBg}>
                <View
                  style={[
                    styles.approvalBarFill,
                    {
                      width: `${approvalRate}%` as unknown as number,
                      backgroundColor:
                        approvalRate >= 70
                          ? colors.success
                          : approvalRate >= 40
                          ? colors.warning
                          : colors.error,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.approvalPct, { color: colors.foreground }]}>
                {approvalRate}%
              </Text>
            </View>
          )}

          {/* Geo alert warning */}
          {item.hasGeoAlert && (
            <View style={[styles.alertBanner, { backgroundColor: colors.error + "15" }]}>
              <Ionicons name="warning" size={16} color={colors.error} />
              <Text style={[styles.alertBannerText, { color: colors.error }]}>
                Alerta de geolocalização registrado nesta visita
              </Text>
            </View>
          )}

          {/* No data */}
          {item.photosCount === 0 && item.materialsCount === 0 && !item.hasGeoAlert && (
            <Text style={[styles.noDataText, { color: colors.muted }]}>
              Nenhuma foto ou material registrado nesta visita.
            </Text>
          )}

          <Text style={[styles.expandHint, { color: colors.muted }]}>Toque para recolher</Text>
        </View>
      )}

      {!expanded && (
        <Text style={[styles.expandHintSmall, { color: colors.muted }]}>
          Toque para ver detalhes
        </Text>
      )}
    </Pressable>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StoreVisitsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storePickerOpen, setStorePickerOpen] = useState(false);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const { data: stores } = trpc.stores.list.useQuery(undefined, { enabled: !!user });

  const { data: visits, isLoading } = trpc.storeVisits.history.useQuery(
    { storeId: selectedStoreId ?? 0, year, month },
    { enabled: !!user && !!selectedStoreId }
  );

  const selectedStore = stores?.find((s) => s.id === selectedStoreId);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  // Summary stats
  const totalVisits = visits?.length ?? 0;
  const totalHours = visits?.reduce((s, v) => s + v.hoursWorked, 0) ?? 0;
  const totalPhotos = visits?.reduce((s, v) => s + v.approvedPhotosCount, 0) ?? 0;
  const totalMaterials = visits?.reduce((s, v) => s + v.materialsCount, 0) ?? 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Histórico de Visitas</Text>
          {selectedStore && (
            <Text style={[styles.headerSub, { color: colors.muted }]} numberOfLines={1}>
              {selectedStore.name}
            </Text>
          )}
        </View>
        <Ionicons name="time" size={26} color={colors.primary} />
      </View>

      {/* Store picker */}
      <Pressable
        onPress={() => setStorePickerOpen((o) => !o)}
        style={({ pressed }) => [
          styles.storePicker,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="storefront-outline" size={18} color={colors.primary} />
        <Text style={[styles.storePickerText, { color: selectedStoreId ? colors.foreground : colors.muted }]}>
          {selectedStore ? selectedStore.name : "Selecione uma loja"}
        </Text>
        <Ionicons
          name={storePickerOpen ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.muted}
        />
      </Pressable>

      {/* Store dropdown */}
      {storePickerOpen && (
        <View style={[styles.storeDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(stores ?? []).map((store) => (
            <Pressable
              key={store.id}
              onPress={() => {
                setSelectedStoreId(store.id);
                setStorePickerOpen(false);
              }}
              style={({ pressed }) => [
                styles.storeOption,
                {
                  backgroundColor:
                    store.id === selectedStoreId
                      ? colors.primary + "15"
                      : pressed
                      ? colors.border
                      : "transparent",
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.storeOptionText, { color: colors.foreground }]}>
                {store.name}
              </Text>
              {store.id === selectedStoreId && (
                <Ionicons name="checkmark" size={16} color={colors.primary} />
              )}
            </Pressable>
          ))}
          {(stores ?? []).length === 0 && (
            <Text style={[styles.noStoresText, { color: colors.muted }]}>
              Nenhuma loja cadastrada
            </Text>
          )}
        </View>
      )}

      {/* Month picker */}
      <View style={[styles.monthPicker, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={prevMonth} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {MONTHS[month - 1]} {year}
        </Text>
        <Pressable onPress={nextMonth} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {!selectedStoreId ? (
        <View style={styles.emptyState}>
          <Ionicons name="storefront-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Selecione uma loja</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Escolha uma loja acima para ver o histórico de visitas dos promotores.
          </Text>
        </View>
      ) : isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando visitas...</Text>
        </View>
      ) : (visits ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem visitas neste mês</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhum promotor visitou esta loja em {MONTHS[month - 1]} {year}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => `${item.userId}-${item.visitDate}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <VisitCard item={item} />}
          ListHeaderComponent={
            <View style={styles.summaryRow}>
              {[
                { icon: "calendar", label: "Visitas", value: String(totalVisits), color: colors.primary },
                { icon: "time", label: "Horas", value: `${Math.round(totalHours * 10) / 10}h`, color: colors.success },
                { icon: "checkmark-circle", label: "Fotos apr.", value: String(totalPhotos), color: "#8B5CF6" },
                { icon: "cube", label: "Materiais", value: String(totalMaterials), color: colors.warning },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                  <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stat.value}</Text>
                  <Text style={[styles.summaryLabel, { color: colors.muted }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          }
          ListFooterComponent={<View style={{ height: 32 }} />}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 2 },
  storePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  storePickerText: { flex: 1, fontSize: 15 },
  storeDropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginHorizontal: 12,
    marginTop: 4,
    overflow: "hidden",
    zIndex: 10,
    maxHeight: 200,
  },
  storeOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  storeOptionText: { fontSize: 14 },
  noStoresText: { padding: 16, textAlign: "center", fontSize: 14 },
  monthPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  monthBtn: { padding: 6 },
  monthLabel: { fontSize: 15, fontWeight: "600" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  list: { padding: 16, gap: 12 },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  summaryValue: { fontSize: 16, fontWeight: "800" },
  summaryLabel: { fontSize: 10 },
  visitCard: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  visitTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dateBadgeText: { fontSize: 12, fontWeight: "700" },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 14, fontWeight: "800" },
  visitInfo: { flex: 1, gap: 3 },
  visitName: { fontSize: 14, fontWeight: "700" },
  visitTimes: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  visitTimeText: { fontSize: 12 },
  hoursBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  hoursBadgeText: { fontSize: 13, fontWeight: "700" },
  quickStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  quickStatText: { fontSize: 12 },
  expandedSection: {
    borderTopWidth: 0.5,
    paddingTop: 12,
    gap: 10,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  approvalLabel: { fontSize: 12, flex: 1 },
  approvalBarBg: {
    width: 80,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  approvalBarFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 4,
  },
  approvalPct: { fontSize: 12, fontWeight: "700", width: 36, textAlign: "right" },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  alertBannerText: { fontSize: 13, flex: 1 },
  noDataText: { fontSize: 13, textAlign: "center" },
  expandHint: { fontSize: 11, textAlign: "center", marginTop: 4 },
  expandHintSmall: { fontSize: 11, textAlign: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
