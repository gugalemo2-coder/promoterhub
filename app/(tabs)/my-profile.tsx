import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

// ─── Weekly bar chart ─────────────────────────────────────────────────────────
function WeeklyBarChart({
  data,
  metric,
  color,
  label,
}: {
  data: { weekLabel: string; approvedPhotos: number; materialRequests: number; hoursWorked: number }[];
  metric: "approvedPhotos" | "materialRequests" | "hoursWorked";
  color: string;
  label: string;
}) {
  const values = data.map((d) => d[metric] as number);
  const maxVal = Math.max(...values, 1);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartLabel}>{label}</Text>
      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const val = d[metric] as number;
          const pct = maxVal > 0 ? val / maxVal : 0;
          return (
            <View key={i} style={styles.barCol}>
              <Text style={[styles.barValue, { color }]}>
                {metric === "hoursWorked" ? `${val}h` : val}
              </Text>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${Math.round(pct * 100)}%` as unknown as number,
                      backgroundColor: color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barWeek}>{d.weekLabel}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconBg, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: color }]}>{sub}</Text>}
    </View>
  );
}

// ─── Brand row ────────────────────────────────────────────────────────────────
function BrandRow({
  brandName,
  count,
  maxCount,
  color,
}: {
  brandName: string;
  count: number;
  maxCount: number;
  color: string;
}) {
  const colors = useColors();
  const pct = maxCount > 0 ? count / maxCount : 0;
  return (
    <View style={styles.brandRow}>
      <Text style={[styles.brandName, { color: colors.foreground }]} numberOfLines={1}>
        {brandName}
      </Text>
      <View style={styles.brandBarBg}>
        <View
          style={[
            styles.brandBarFill,
            {
              width: `${Math.round(pct * 100)}%` as unknown as number,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[styles.brandCount, { color }]}>{count}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function MyProfileScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeMetric, setActiveMetric] = useState<"approvedPhotos" | "materialRequests" | "hoursWorked">("approvedPhotos");

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const { data: stats, isLoading: statsLoading } = trpc.promoterProfile.myStats.useQuery(
    { year, month },
    { enabled: !!user }
  );

  const { data: trend, isLoading: trendLoading } = trpc.promoterProfile.weeklyTrend.useQuery(
    undefined,
    { enabled: !!user }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isLoading = statsLoading || trendLoading;
  const trendData = trend ?? [];
  const maxBrand = Math.max(...(stats?.brandBreakdown ?? []).map((b) => b.approvedPhotos), 1);

  const metricOptions: { key: "approvedPhotos" | "materialRequests" | "hoursWorked"; label: string; color: string }[] = [
    { key: "approvedPhotos", label: "Fotos aprovadas", color: "#8B5CF6" },
    { key: "materialRequests", label: "Materiais", color: colors.warning },
    { key: "hoursWorked", label: "Horas", color: colors.success },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View style={styles.headerAvatar}>
          <Ionicons name="person" size={28} color="#fff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{user?.name ?? user?.email ?? "Promotor"}</Text>
          <Text style={styles.headerRole}>Promotor</Text>
        </View>
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
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando seu desempenho...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Stats grid */}
          <View style={styles.statsGrid}>
            <StatCard
              icon="checkmark-circle"
              label="Fotos aprovadas"
              value={stats?.totalApprovedPhotos ?? 0}
              color="#8B5CF6"
              sub={stats?.totalApprovedPhotos === 0 ? undefined : "no mês"}
            />
            <StatCard
              icon="cube"
              label="Materiais solicitados"
              value={stats?.totalMaterialRequests ?? 0}
              color={colors.warning}
              sub={stats?.totalMaterialRequests === 0 ? undefined : "no mês"}
            />
            <StatCard
              icon="storefront"
              label="Visitas a PDVs"
              value={stats?.totalVisits ?? 0}
              color={colors.primary}
            />
          </View>

          {/* Weekly trend chart */}
          {trendData.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Evolução semanal</Text>

              {/* Metric selector */}
              <View style={styles.metricSelector}>
                {metricOptions.map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setActiveMetric(opt.key)}
                    style={({ pressed }) => [
                      styles.metricBtn,
                      {
                        backgroundColor: activeMetric === opt.key ? opt.color : colors.background,
                        borderColor: opt.color,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.metricBtnText,
                        { color: activeMetric === opt.key ? "#fff" : opt.color },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <WeeklyBarChart
                data={trendData}
                metric={activeMetric}
                color={metricOptions.find((o) => o.key === activeMetric)?.color ?? colors.primary}
                label={metricOptions.find((o) => o.key === activeMetric)?.label ?? ""}
              />
            </View>
          )}

          {/* Brand breakdown — only approved photos */}
          {(stats?.brandBreakdown ?? []).length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fotos aprovadas por marca</Text>
              {stats!.brandBreakdown.map((b) => (
                <BrandRow
                  key={b.brandId}
                  brandName={b.brandName}
                  count={b.approvedPhotos}
                  maxCount={maxBrand}
                  color="#8B5CF6"
                />
              ))}
            </View>
          )}

          {/* Empty state */}
          {(stats?.totalApprovedPhotos === 0 && stats?.totalMaterialRequests === 0 && stats?.totalVisits === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem dados neste mês</Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Registre seu ponto, tire fotos e solicite materiais para ver seu desempenho aqui.
              </Text>
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 14,
  },
  headerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerRole: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
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
  monthBtn: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    textAlign: "center",
  },
  statSub: {
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  metricSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  metricBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartContainer: {
    gap: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 8,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    height: "100%",
    justifyContent: "flex-end",
  },
  barValue: {
    fontSize: 10,
    fontWeight: "700",
  },
  barBg: {
    width: "100%",
    height: 60,
    backgroundColor: "#F3F4F6",
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: 6,
    minHeight: 4,
  },
  barWeek: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandName: {
    fontSize: 13,
    fontWeight: "500",
    width: 90,
  },
  brandBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  brandBarFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 4,
  },
  brandCount: {
    fontSize: 13,
    fontWeight: "700",
    width: 28,
    textAlign: "right",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
