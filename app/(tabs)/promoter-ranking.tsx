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

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  return (
    <View style={[styles.scoreRing, { width: size, height: size, borderColor: color }]}>
      <Text style={[styles.scoreRingText, { color, fontSize: size * 0.28 }]}>{score}</Text>
    </View>
  );
}

// ─── Metric bar ───────────────────────────────────────────────────────────────
function MetricBar({
  label,
  value,
  max,
  color,
  unit = "",
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const colors = useColors();
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={styles.metricBarRow}>
      <Text style={[styles.metricBarLabel, { color: colors.muted }]}>{label}</Text>
      <View style={styles.metricBarBg}>
        <View
          style={[
            styles.metricBarFill,
            {
              width: `${Math.round(pct * 100)}%` as unknown as number,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[styles.metricBarValue, { color: colors.foreground }]}>
        {value}{unit}
      </Text>
    </View>
  );
}

// ─── Medal ────────────────────────────────────────────────────────────────────
function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
  if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
  if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankBadgeText}>{rank}°</Text>
    </View>
  );
}

// ─── Promoter Card ────────────────────────────────────────────────────────────
function PromoterCard({
  item,
  maxValues,
}: {
  item: {
    userId: number;
    userName: string;
    totalApprovedPhotos: number;
    totalMaterialRequests: number;
    totalHoursWorked: number;
    totalVisits: number;
    avgQualityRating: number;
    geoAlertCount: number;
    score: number;
    rank: number;
  };
  maxValues: { photos: number; hours: number; visits: number; materials: number };
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const initials = item.userName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const avatarColor =
    item.rank === 1
      ? "#F59E0B"
      : item.rank === 2
      ? "#9CA3AF"
      : item.rank === 3
      ? "#CD7F32"
      : colors.primary;

  return (
    <Pressable
      onPress={() => setExpanded((e) => !e)}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: item.rank <= 3 ? avatarColor + "40" : colors.border,
          borderWidth: item.rank <= 3 ? 1.5 : 1,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      {/* Top row */}
      <View style={styles.cardTop}>
        <Medal rank={item.rank} />

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor + "20" }]}>
          <Text style={[styles.avatarText, { color: avatarColor }]}>{initials || "?"}</Text>
        </View>

        {/* Name + quick stats */}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {item.userName}
          </Text>
          <View style={styles.quickStats}>
            <View style={styles.quickStat}>
              <Ionicons name="checkmark-circle" size={12} color="#8B5CF6" />
              <Text style={[styles.quickStatText, { color: colors.muted }]}>
                {item.totalApprovedPhotos} fotos
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="time" size={12} color={colors.success} />
              <Text style={[styles.quickStatText, { color: colors.muted }]}>
                {item.totalHoursWorked}h
              </Text>
            </View>
            <View style={styles.quickStat}>
              <Ionicons name="storefront" size={12} color={colors.primary} />
              <Text style={[styles.quickStatText, { color: colors.muted }]}>
                {item.totalVisits} visitas
              </Text>
            </View>
          </View>
        </View>

        {/* Score */}
        <ScoreRing score={item.score} />
      </View>

      {/* Expanded metrics */}
      {expanded && (
        <View style={[styles.expandedSection, { borderTopColor: colors.border }]}>
          <MetricBar
            label="Fotos aprovadas"
            value={item.totalApprovedPhotos}
            max={maxValues.photos}
            color="#8B5CF6"
          />
          <MetricBar
            label="Horas trabalhadas"
            value={item.totalHoursWorked}
            max={maxValues.hours}
            color={colors.success}
            unit="h"
          />
          <MetricBar
            label="Visitas a PDVs"
            value={item.totalVisits}
            max={maxValues.visits}
            color={colors.primary}
          />
          <MetricBar
            label="Materiais solicitados"
            value={item.totalMaterialRequests}
            max={maxValues.materials}
            color={colors.warning}
          />
          {item.geoAlertCount > 0 && (
            <View style={styles.alertRow}>
              <Ionicons name="warning" size={14} color={colors.error} />
              <Text style={[styles.alertText, { color: colors.error }]}>
                {item.geoAlertCount} alerta{item.geoAlertCount > 1 ? "s" : ""} de geolocalização
              </Text>
            </View>
          )}
          {item.avgQualityRating > 0 && (
            <View style={styles.qualityRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={[styles.qualityText, { color: colors.muted }]}>
                Qualidade média das fotos: {item.avgQualityRating}/5
              </Text>
            </View>
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
export default function PromoterRankingScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const { data: ranking, isLoading } = trpc.promoterRanking.monthly.useQuery(
    { year, month },
    { enabled: !!user }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const maxValues = {
    photos: Math.max(...(ranking ?? []).map((r) => r.totalApprovedPhotos), 1),
    hours: Math.max(...(ranking ?? []).map((r) => r.totalHoursWorked), 1),
    visits: Math.max(...(ranking ?? []).map((r) => r.totalVisits), 1),
    materials: Math.max(...(ranking ?? []).map((r) => r.totalMaterialRequests), 1),
  };

  const avgScore =
    (ranking ?? []).length > 0
      ? Math.round((ranking ?? []).reduce((s, r) => s + r.score, 0) / (ranking ?? []).length)
      : 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ranking de Promotores</Text>
          {(ranking ?? []).length > 0 && (
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {ranking!.length} promotores · Score médio: {avgScore}
            </Text>
          )}
        </View>
        <Ionicons name="trophy" size={28} color="#F59E0B" />
      </View>

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

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Calculando ranking...</Text>
        </View>
      ) : (ranking ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem dados neste mês</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhum promotor registrou atividade em {MONTHS[month - 1]} {year}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PromoterCard item={item} maxValues={maxValues} />
          )}
          ListHeaderComponent={
            <View style={[styles.scoreFormula, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.scoreFormulaTitle, { color: colors.muted }]}>
                Score = Fotos 30% + Horas 25% + Visitas 25% + Materiais 10% + Qualidade 10% − Alertas
              </Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerSub: {
    fontSize: 13,
    marginTop: 2,
  },
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
  scoreFormula: {
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  scoreFormulaTitle: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  medal: { fontSize: 24, width: 32, textAlign: "center" },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeText: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  cardInfo: { flex: 1, gap: 4 },
  cardName: { fontSize: 15, fontWeight: "700" },
  quickStats: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  quickStatText: { fontSize: 11 },
  scoreRing: {
    borderRadius: 999,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreRingText: { fontWeight: "800" },
  expandedSection: {
    borderTopWidth: 0.5,
    paddingTop: 12,
    gap: 8,
  },
  metricBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricBarLabel: { fontSize: 12, width: 120 },
  metricBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 3,
    overflow: "hidden",
  },
  metricBarFill: {
    height: "100%",
    borderRadius: 3,
    minWidth: 4,
  },
  metricBarValue: { fontSize: 12, fontWeight: "600", width: 36, textAlign: "right" },
  alertRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertText: { fontSize: 12 },
  qualityRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  qualityText: { fontSize: 12 },
  expandHint: { fontSize: 11, textAlign: "center", marginTop: 4 },
  expandHintSmall: { fontSize: 11, textAlign: "center" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20, maxWidth: 280 },
});
