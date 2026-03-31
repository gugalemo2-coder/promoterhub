import { UserHeader } from "@/components/user-header";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";

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

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  // FIX: refetchOnWindowFocus para atualizar ao voltar para a tela
  const { data: stats, isLoading: statsLoading } = trpc.promoterProfile.myStats.useQuery(
    { year, month },
    {
      enabled: !!user,
      refetchOnWindowFocus: true,
    }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const maxBrand = Math.max(...(stats?.brandBreakdown ?? []).map((b) => b.approvedPhotos), 1);

  return (
    <ScreenContainer>
      <UserHeader
        name={user?.name ?? user?.email}
        subtitle="Meu Perfil"
      />

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

      {statsLoading ? (
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
              color="#10B981"
              sub={stats?.totalApprovedPhotos === 0 ? undefined : "no mês"}
            />
            <StatCard
              icon="close-circle"
              label="Fotos recusadas"
              value={stats?.totalRejectedPhotos ?? 0}
              color="#EF4444"
              sub={stats?.totalRejectedPhotos === 0 ? undefined : "no mês"}
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
            {(stats?.avgDailyHours ?? 0) > 0 && (
              <StatCard
                icon="calendar"
                label="Méd. Diária"
                value={`${stats?.avgDailyHours ?? 0}h`}
                color="#06B6D4"
                sub={`${stats?.workedDays ?? 0} dias úteis`}
              />
            )}
          </View>

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
