import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { useState as useStateModal } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import Svg, { Rect, Text as SvgText, G, Circle } from "react-native-svg";

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const color = score >= 70 ? "#22C55E" : score >= 40 ? "#F59E0B" : "#EF4444";
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <Svg width={size} height={size}>
      <G rotation="-90" origin={`${size / 2},${size / 2}`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E5E7EB" strokeWidth={6} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={6} fill="none" strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
      </G>
      <SvgText x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={size * 0.22} fontWeight="800" fill={color}>{score}</SvgText>
    </Svg>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
function MiniBarChart({ data, metric }: { data: { month: string; score: number; approvedPhotos: number; hoursWorked: number; visits: number }[]; metric: "score" | "approvedPhotos" | "hoursWorked" | "visits" }) {
  const colors = useColors();
  const W = 280; const H = 80; const barW = Math.floor((W - 8) / data.length) - 4;
  const vals = data.map((d) => d[metric] as number);
  const maxVal = Math.max(...vals, 1);
  const barColor = metric === "score" ? "#3B82F6" : metric === "approvedPhotos" ? "#22C55E" : metric === "hoursWorked" ? "#F59E0B" : "#8B5CF6";
  return (
    <Svg width={W} height={H}>
      {data.map((d, i) => {
        const val = d[metric] as number;
        const bH = Math.max(4, Math.round((val / maxVal) * (H - 24)));
        const x = i * (barW + 4) + 4;
        return (
          <G key={i}>
            <Rect x={x} y={H - bH - 16} width={barW} height={bH} rx={3} fill={barColor} opacity={0.85} />
            <SvgText x={x + barW / 2} y={H - 2} textAnchor="middle" fontSize={8} fill={colors.muted}>{d.month.split("/")[0]}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const colors = useColors();
  const pct = Math.min(value / max, 1);
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.metricBarBg, { backgroundColor: colors.border }]}>
        <View style={[styles.metricBarFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function PromoterDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { promoterId, promoterName } = useLocalSearchParams<{ promoterId: string; promoterName: string }>();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trendMetric, setTrendMetric] = useState<"score" | "approvedPhotos" | "hoursWorked" | "visits">("score");
  const [selectedPhoto, setSelectedPhoto] = useStateModal<string | null>(null);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const { data, isLoading } = trpc.promoterDetail.get.useQuery(
    { promoterId: Number(promoterId), year, month },
    { enabled: !!promoterId }
  );

  const { data: rankPos } = trpc.promoterRanking.rankPosition.useQuery(
    { promoterId: Number(promoterId), year, month },
    { enabled: !!promoterId }
  );

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const n = new Date(); if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
  };

  const TREND_METRICS = [
    { key: "score" as const, label: "Score", color: "#3B82F6" },
    { key: "approvedPhotos" as const, label: "Fotos", color: "#22C55E" },
    { key: "hoursWorked" as const, label: "Horas", color: "#F59E0B" },
    { key: "visits" as const, label: "Visitas", color: "#8B5CF6" },
  ];

  const medalEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {promoterName ?? `Promotor ${promoterId}`}
          </Text>
          <Text style={[styles.headerSub, { color: colors.muted }]}>Detalhe de desempenho</Text>
        </View>
        {data && <ScoreRing score={data.score} size={52} />}
      </View>

      {/* Month Picker */}
      <View style={[styles.monthPicker, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={prevMonth} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{MONTHS_FULL[month - 1]} {year}</Text>
        <Pressable onPress={nextMonth} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 8 })}>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando dados...</Text>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Ionicons name="person-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Promotor não encontrado</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Hero Card */}
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.heroTop}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>{(data.userName ?? "?")[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {medalEmoji(data.rank) && <Text style={{ fontSize: 20 }}>{medalEmoji(data.rank)}</Text>}
                  <Text style={[styles.heroName, { color: colors.foreground }]}>{data.userName}</Text>
                </View>
                <Text style={[styles.heroEmail, { color: colors.muted }]}>{data.userEmail}</Text>
                <Text style={[styles.heroRank, { color: colors.primary }]}>#{data.rank}º no ranking do mês</Text>
              </View>
              <ScoreRing score={data.score} size={64} />
            </View>

            {/* KPI Grid */}
            <View style={styles.kpiGrid}>
              {[
                { label: "Fotos Aprovadas", value: data.totalApprovedPhotos, icon: "checkmark-circle", color: "#22C55E" },
                { label: "Fotos Rejeitadas", value: data.totalRejectedPhotos, icon: "close-circle", color: "#EF4444" },
                { label: "Materiais", value: data.totalMaterialRequests, icon: "cube", color: "#F59E0B" },
                { label: "Horas", value: `${data.totalHoursWorked}h`, icon: "time", color: "#3B82F6" },
                { label: "Visitas", value: data.totalVisits, icon: "location", color: "#8B5CF6" },
                { label: "Méd. Diária", value: `${data.avgMonthlyHours}h`, icon: "analytics", color: "#06B6D4" },
                { label: "Última Semana", value: `${data.lastWeekHours}h`, icon: "calendar", color: "#10B981" },
              ].map((kpi) => (
                <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
                  <Text style={[styles.kpiValue, { color: colors.foreground }]}>{kpi.value}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.muted }]}>{kpi.label}</Text>
                </View>
              ))}
            </View>

            {/* Approval Rate */}
            {(data.totalApprovedPhotos + data.totalRejectedPhotos) > 0 && (
              <View style={[styles.approvalRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.approvalLabel, { color: colors.muted }]}>Taxa de aprovação de fotos</Text>
                <Text style={[styles.approvalValue, { color: "#22C55E" }]}>
                  {Math.round((data.totalApprovedPhotos / (data.totalApprovedPhotos + data.totalRejectedPhotos)) * 100)}%
                </Text>
              </View>
            )}
          </View>

          {/* Weekly Hours Card */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Horas de Trabalho</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={[styles.hoursCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="time-outline" size={22} color="#3B82F6" />
                <Text style={[styles.hoursValue, { color: colors.foreground }]}>{data.totalHoursWorked}h</Text>
                <Text style={[styles.hoursLabel, { color: colors.muted }]}>Total no mês</Text>
              </View>
              <View style={[styles.hoursCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={22} color="#10B981" />
                <Text style={[styles.hoursValue, { color: colors.foreground }]}>{data.lastWeekHours}h</Text>
                <Text style={[styles.hoursLabel, { color: colors.muted }]}>Última semana</Text>
                <Text style={[styles.hoursSubLabel, { color: colors.muted }]}>até {data.lastWeekEndDate}</Text>
              </View>
              <View style={[styles.hoursCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name="analytics-outline" size={22} color="#06B6D4" />
                <Text style={[styles.hoursValue, { color: colors.foreground }]}>{data.avgMonthlyHours}h</Text>
                <Text style={[styles.hoursLabel, { color: colors.muted }]}>Média diária</Text>
              </View>
            </View>
          </View>

          {/* Rank Evolution Card */}
          {rankPos && rankPos.currentRank !== null && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Posição no Ranking</Text>
              <View style={styles.rankEvolutionRow}>
                <View style={styles.rankEvolutionItem}>
                  <Text style={[styles.rankEvolutionValue, { color: colors.primary }]}>#{rankPos.currentRank}</Text>
                  <Text style={[styles.rankEvolutionLabel, { color: colors.muted }]}>Posição atual</Text>
                </View>
                <View style={styles.rankEvolutionDivider} />
                <View style={styles.rankEvolutionItem}>
                  <Text style={[styles.rankEvolutionValue, { color: colors.muted }]}>
                    {rankPos.prevRank !== null ? `#${rankPos.prevRank}` : "—"}
                  </Text>
                  <Text style={[styles.rankEvolutionLabel, { color: colors.muted }]}>Mês anterior</Text>
                </View>
                <View style={styles.rankEvolutionDivider} />
                <View style={styles.rankEvolutionItem}>
                  {rankPos.change === null ? (
                    <Text style={[styles.rankEvolutionValue, { color: colors.muted }]}>—</Text>
                  ) : rankPos.change > 0 ? (
                    <View style={styles.rankChangeRow}>
                      <Ionicons name="arrow-up" size={18} color="#22C55E" />
                      <Text style={[styles.rankEvolutionValue, { color: "#22C55E" }]}>{rankPos.change}</Text>
                    </View>
                  ) : rankPos.change < 0 ? (
                    <View style={styles.rankChangeRow}>
                      <Ionicons name="arrow-down" size={18} color="#EF4444" />
                      <Text style={[styles.rankEvolutionValue, { color: "#EF4444" }]}>{Math.abs(rankPos.change)}</Text>
                    </View>
                  ) : (
                    <View style={styles.rankChangeRow}>
                      <Ionicons name="remove" size={18} color={colors.muted} />
                      <Text style={[styles.rankEvolutionValue, { color: colors.muted }]}>0</Text>
                    </View>
                  )}
                  <Text style={[styles.rankEvolutionLabel, { color: colors.muted }]}>Variação</Text>
                </View>
                <View style={styles.rankEvolutionDivider} />
                <View style={styles.rankEvolutionItem}>
                  <Text style={[styles.rankEvolutionValue, { color: colors.foreground }]}>{rankPos.totalPromoters}</Text>
                  <Text style={[styles.rankEvolutionLabel, { color: colors.muted }]}>Total</Text>
                </View>
              </View>
            </View>
          )}

          {/* Score Metrics */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Composição do Score</Text>
            <MetricBar label="Fotos Aprovadas (30%)" value={data.totalApprovedPhotos} max={50} color="#22C55E" />
            <MetricBar label="Horas Trabalhadas (25%)" value={data.totalHoursWorked} max={160} color="#3B82F6" />
            <MetricBar label="Visitas a PDVs (25%)" value={data.totalVisits} max={80} color="#8B5CF6" />
            <MetricBar label="Materiais Solicitados (10%)" value={data.totalMaterialRequests} max={20} color="#F59E0B" />
            <MetricBar label="Qualidade das Fotos (10%)" value={data.avgQualityRating} max={5} color="#EC4899" />
            {data.geoAlertCount > 0 && (
              <View style={styles.penaltyRow}>
                <Ionicons name="warning" size={14} color="#EF4444" />
                <Text style={[styles.penaltyText, { color: "#EF4444" }]}>
                  Penalidade de alertas: -{Math.min(data.geoAlertCount * 2, 10)} pts
                </Text>
              </View>
            )}
          </View>

          {/* Trend Chart */}
          {data.monthlyTrend.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Evolução dos Últimos 6 Meses</Text>
              <View style={styles.trendTabs}>
                {TREND_METRICS.map((m) => (
                  <Pressable
                    key={m.key}
                    onPress={() => setTrendMetric(m.key)}
                    style={[styles.trendTab, trendMetric === m.key && { backgroundColor: m.color }]}
                  >
                    <Text style={[styles.trendTabText, { color: trendMetric === m.key ? "#fff" : colors.muted }]}>{m.label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ alignItems: "center", marginTop: 8 }}>
                <MiniBarChart data={data.monthlyTrend} metric={trendMetric} />
              </View>
            </View>
          )}

          {/* Brand Breakdown */}
          {data.brandBreakdown.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fotos por Marca</Text>
              {data.brandBreakdown.map((b) => (
                <View key={b.brandId} style={[styles.brandRow, { borderBottomColor: colors.border }]}>
                  <View style={[styles.brandDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.brandName, { color: colors.foreground }]}>{b.brandName}</Text>
                  <View style={styles.brandStats}>
                    <View style={styles.brandStat}>
                      <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
                      <Text style={[styles.brandStatText, { color: "#22C55E" }]}>{b.approvedPhotos}</Text>
                    </View>
                    {b.rejectedPhotos > 0 && (
                      <View style={styles.brandStat}>
                        <Ionicons name="close-circle" size={12} color="#EF4444" />
                        <Text style={[styles.brandStatText, { color: "#EF4444" }]}>{b.rejectedPhotos}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Store Breakdown */}
          {data.storeBreakdown.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>PDVs Visitados</Text>
              {data.storeBreakdown.map((s) => (
                <View key={s.storeId} style={[styles.storeRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, { color: colors.foreground }]}>{s.storeName}</Text>
                    <Text style={[styles.storeStats, { color: colors.muted }]}>
                      {s.visits} visita{s.visits !== 1 ? "s" : ""} · {s.hoursWorked}h · {s.photos} foto{s.photos !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View style={[styles.visitsChip, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.visitsChipText, { color: colors.primary }]}>{s.visits}x</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Month Photos Grid */}
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Fotos do Mês ({data.monthPhotos.length})
            </Text>
            {data.monthPhotos.length === 0 ? (
              <Text style={[styles.storeStats, { color: colors.muted, textAlign: "center", paddingVertical: 16 }]}>Nenhuma foto enviada neste mês</Text>
            ) : (
              <View style={styles.photoGrid}>
                {data.monthPhotos.map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => setSelectedPhoto(p.photoUrl)} activeOpacity={0.8}>
                    <View style={styles.photoThumbWrap}>
                      <Image
                        source={{ uri: p.thumbnailUrl ?? p.photoUrl }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                      <View style={[
                        styles.photoStatusBadge,
                        { backgroundColor: p.status === "approved" ? "#22C55E" : p.status === "rejected" ? "#EF4444" : "#F59E0B" }
                      ]} />
                    </View>
                    <Text style={[styles.photoThumbLabel, { color: colors.muted }]} numberOfLines={1}>{p.brandName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Photo Viewer Modal */}
      <Modal visible={!!selectedPhoto} transparent animationType="fade" onRequestClose={() => setSelectedPhoto(null)}>
        <View style={styles.photoModalBg}>
          <TouchableOpacity style={styles.photoModalClose} onPress={() => setSelectedPhoto(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.photoModalImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },
  monthPicker: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1 },
  monthLabel: { fontSize: 15, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingText: { fontSize: 14 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  heroCard: { margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, gap: 16 },
  heroTop: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 22, fontWeight: "800" },
  heroName: { fontSize: 17, fontWeight: "700" },
  heroEmail: { fontSize: 12, marginTop: 2 },
  heroRank: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiCard: { flex: 1, minWidth: "28%", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1, gap: 4 },
  kpiValue: { fontSize: 18, fontWeight: "800" },
  kpiLabel: { fontSize: 10, textAlign: "center" },
  approvalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 10, borderWidth: 1 },
  approvalLabel: { fontSize: 13 },
  approvalValue: { fontSize: 16, fontWeight: "800" },
  section: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  metricRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metricLabel: { fontSize: 11, width: 150 },
  metricBarBg: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  metricBarFill: { height: "100%", borderRadius: 3, minWidth: 4 },
  metricValue: { fontSize: 12, fontWeight: "600", width: 32, textAlign: "right" },
  penaltyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  penaltyText: { fontSize: 12, fontWeight: "600" },
  trendTabs: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  trendTab: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: "#F3F4F6" },
  trendTabText: { fontSize: 12, fontWeight: "600" },
  brandRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandName: { flex: 1, fontSize: 13, fontWeight: "500" },
  brandStats: { flexDirection: "row", gap: 8 },
  brandStat: { flexDirection: "row", alignItems: "center", gap: 3 },
  brandStatText: { fontSize: 12, fontWeight: "600" },
  storeRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  storeName: { fontSize: 13, fontWeight: "600" },
  storeStats: { fontSize: 11, marginTop: 2 },
  visitsChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  visitsChipText: { fontSize: 13, fontWeight: "700" },
  rankEvolutionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  rankEvolutionItem: { flex: 1, alignItems: "center", gap: 4 },
  rankEvolutionValue: { fontSize: 20, fontWeight: "800" },
  rankEvolutionLabel: { fontSize: 10, textAlign: "center" },
  rankEvolutionDivider: { width: 1, height: 36, backgroundColor: "#E5E7EB" },
  rankChangeRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  hoursCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1, gap: 4 },
  hoursValue: { fontSize: 18, fontWeight: "800" },
  hoursLabel: { fontSize: 10, textAlign: "center" },
  hoursSubLabel: { fontSize: 9, textAlign: "center" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoThumbWrap: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", position: "relative" },
  photoThumb: { width: 80, height: 80 },
  photoStatusBadge: { position: "absolute", top: 4, right: 4, width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: "#fff" },
  photoThumbLabel: { fontSize: 9, textAlign: "center", marginTop: 2, width: 80 },
  photoModalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  photoModalClose: { position: "absolute", top: 56, right: 20, zIndex: 10 },
  photoModalImg: { width: "92%", height: "70%", borderRadius: 12 },
});
