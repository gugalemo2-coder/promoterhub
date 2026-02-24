import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/use-auth";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

// ─── Score color helper ───────────────────────────────────────────────────────
function scoreColor(score: number, colors: ReturnType<typeof useColors>) {
  if (score >= 70) return colors.success;
  if (score >= 40) return colors.warning;
  return colors.error;
}

// ─── Medal for top 3 ─────────────────────────────────────────────────────────
function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Text style={styles.medal}>🥇</Text>;
  if (rank === 2) return <Text style={styles.medal}>🥈</Text>;
  if (rank === 3) return <Text style={styles.medal}>🥉</Text>;
  return (
    <View style={styles.rankBadge}>
      <Text style={styles.rankText}>#{rank}</Text>
    </View>
  );
}

// ─── Mini bar ────────────────────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View style={styles.miniBarBg}>
      <View style={[styles.miniBarFill, { width: `${Math.round(pct * 100)}%` as unknown as number, backgroundColor: color }]} />
    </View>
  );
}

// ─── Score ring ──────────────────────────────────────────────────────────────
function ScoreRing({ score, color }: { score: number; color: string }) {
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
      <Text style={[styles.scoreLabel, { color }]}>pts</Text>
    </View>
  );
}

// ─── Store Card ───────────────────────────────────────────────────────────────
function StoreCard({
  item,
  colors,
  maxVisits,
  maxPhotos,
  maxCoverage,
}: {
  item: StoreData;
  colors: ReturnType<typeof useColors>;
  maxVisits: number;
  maxPhotos: number;
  maxCoverage: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = scoreColor(item.score, colors);
  const coverageHours = (item.totalCoverageMinutes / 60).toFixed(1);

  return (
    <Pressable
      onPress={() => setExpanded((v) => !v)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Header row */}
      <View style={styles.cardHeader}>
        <MedalIcon rank={item.rank} />
        <View style={styles.cardTitleBlock}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>
            {item.storeName}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.muted }]}>
            {[item.city, item.state].filter(Boolean).join(" · ") || "Sem localização"}
          </Text>
        </View>
        <ScoreRing score={item.score} color={color} />
      </View>

      {/* Quick metrics row */}
      <View style={styles.quickRow}>
        <View style={styles.quickItem}>
          <Ionicons name="walk-outline" size={14} color={colors.muted} />
          <Text style={[styles.quickVal, { color: colors.foreground }]}>{item.totalVisits}</Text>
          <Text style={[styles.quickKey, { color: colors.muted }]}>visitas</Text>
        </View>
        <View style={styles.quickItem}>
          <Ionicons name="camera-outline" size={14} color={colors.muted} />
          <Text style={[styles.quickVal, { color: colors.foreground }]}>{item.totalPhotos}</Text>
          <Text style={[styles.quickKey, { color: colors.muted }]}>fotos</Text>
        </View>
        <View style={styles.quickItem}>
          <Ionicons name="time-outline" size={14} color={colors.muted} />
          <Text style={[styles.quickVal, { color: colors.foreground }]}>{coverageHours}h</Text>
          <Text style={[styles.quickKey, { color: colors.muted }]}>cobertura</Text>
        </View>
        <View style={styles.quickItem}>
          <Ionicons name="warning-outline" size={14} color={colors.muted} />
          <Text style={[styles.quickVal, { color: item.totalAlerts > 0 ? colors.error : colors.foreground }]}>
            {item.totalAlerts}
          </Text>
          <Text style={[styles.quickKey, { color: colors.muted }]}>alertas</Text>
        </View>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={[styles.expandedBlock, { borderTopColor: colors.border }]}>
          {/* Metric bars */}
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Visitas</Text>
            <MiniBar value={item.totalVisits} max={maxVisits} color="#3B82F6" />
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{item.totalVisits}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Fotos</Text>
            <MiniBar value={item.totalPhotos} max={maxPhotos} color="#10B981" />
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{item.totalPhotos}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Aprovação fotos</Text>
            <MiniBar value={item.photoApprovalRate} max={1} color="#8B5CF6" />
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {Math.round(item.photoApprovalRate * 100)}%
            </Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Cobertura</Text>
            <MiniBar value={item.totalCoverageMinutes} max={maxCoverage} color="#F59E0B" />
            <Text style={[styles.metricValue, { color: colors.foreground }]}>{coverageHours}h</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={[styles.metricLabel, { color: colors.muted }]}>Materiais aprov.</Text>
            <MiniBar value={item.materialApprovalRate} max={1} color="#EC4899" />
            <Text style={[styles.metricValue, { color: colors.foreground }]}>
              {Math.round(item.materialApprovalRate * 100)}%
            </Text>
          </View>

          {/* Score breakdown */}
          <View style={[styles.scoreBreakdown, { backgroundColor: colors.background }]}>
            <Text style={[styles.breakdownTitle, { color: colors.muted }]}>Score composto</Text>
            <Text style={[styles.breakdownFormula, { color: colors.muted }]}>
              Visitas 25% · Fotos 20% · Qualidade 20% · Cobertura 20% · Materiais 10% · Alertas −5%
            </Text>
            <Text style={[styles.breakdownScore, { color }]}>{item.score} / 100 pts</Text>
          </View>
        </View>
      )}

      {/* Expand hint */}
      <View style={styles.expandHint}>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={14}
          color={colors.muted}
        />
      </View>
    </Pressable>
  );
}

// ─── Type helper ─────────────────────────────────────────────────────────────
import type { StorePerformanceData } from "@/server/db";
type StoreData = StorePerformanceData;

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function StoreDashboardScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading, refetch } = trpc.storePerformance.ranking.useQuery(
    { year, month },
    { enabled: !!user }
  );

  const stores = data ?? [];
  const maxVisits = Math.max(...stores.map((s) => s.totalVisits), 1);
  const maxPhotos = Math.max(...stores.map((s) => s.totalPhotos), 1);
  const maxCoverage = Math.max(...stores.map((s) => s.totalCoverageMinutes), 1);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    const today = new Date();
    if (year === today.getFullYear() && month === today.getMonth() + 1) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Dashboard de PDVs</Text>
        <Text style={styles.headerSub}>Ranking de desempenho composto</Text>
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

      {/* Summary bar */}
      {stores.length > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.background }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>{stores.length}</Text>
            <Text style={[styles.summaryKey, { color: colors.muted }]}>PDVs</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: colors.success }]}>
              {stores.reduce((a, s) => a + s.totalVisits, 0)}
            </Text>
            <Text style={[styles.summaryKey, { color: colors.muted }]}>visitas</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: "#8B5CF6" }]}>
              {stores.reduce((a, s) => a + s.totalPhotos, 0)}
            </Text>
            <Text style={[styles.summaryKey, { color: colors.muted }]}>fotos</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: colors.warning }]}>
              {(stores.reduce((a, s) => a + s.totalCoverageMinutes, 0) / 60).toFixed(0)}h
            </Text>
            <Text style={[styles.summaryKey, { color: colors.muted }]}>cobertura</Text>
          </View>
        </View>
      )}

      {/* Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Calculando ranking...</Text>
        </View>
      ) : stores.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="storefront-outline" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem dados para este mês</Text>
          <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
            Cadastre lojas e registre atividades para ver o ranking
          </Text>
          <Pressable
            onPress={() => refetch()}
            style={({ pressed }) => [styles.retryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={styles.retryBtnText}>Atualizar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => String(item.storeId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <StoreCard
              item={item}
              colors={colors}
              maxVisits={maxVisits}
              maxPhotos={maxPhotos}
              maxCoverage={maxCoverage}
            />
          )}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.muted }]}>
              Toque em um PDV para ver o detalhamento do score
            </Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  monthPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  monthBtn: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  summaryBar: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryKey: {
    fontSize: 11,
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 10,
  },
  medal: {
    fontSize: 28,
    width: 36,
    textAlign: "center",
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scoreRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNum: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 18,
  },
  scoreLabel: {
    fontSize: 9,
    fontWeight: "600",
    lineHeight: 11,
  },
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  quickItem: {
    alignItems: "center",
    gap: 2,
  },
  quickVal: {
    fontSize: 14,
    fontWeight: "700",
  },
  quickKey: {
    fontSize: 10,
  },
  expandedBlock: {
    borderTopWidth: 1,
    padding: 14,
    gap: 8,
  },
  metricRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metricLabel: {
    fontSize: 12,
    width: 110,
  },
  miniBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  miniBarFill: {
    height: 6,
    borderRadius: 3,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "600",
    width: 40,
    textAlign: "right",
  },
  scoreBreakdown: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  breakdownFormula: {
    fontSize: 10,
    lineHeight: 15,
  },
  breakdownScore: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  expandHint: {
    alignItems: "center",
    paddingBottom: 6,
  },
});
