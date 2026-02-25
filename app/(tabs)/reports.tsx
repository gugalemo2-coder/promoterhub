import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import * as Sharing from "expo-sharing";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { G, Rect, Text as SvgText } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 160;
const BAR_GAP = 2;

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// ─── Bar Chart Component ──────────────────────────────────────────────────────
function BarChart({ data, color, label }: { data: { day: number; value: number }[]; color: string; label: string }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (CHART_WIDTH - (data.length - 1) * BAR_GAP) / data.length;

  return (
    <View>
      <Text style={[styles.chartLabel, { color }]}>{label}</Text>
      <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
        <G>
          {data.map((d, i) => {
            const barH = Math.max((d.value / maxVal) * (CHART_HEIGHT - 20), d.value > 0 ? 4 : 0);
            const x = i * (barWidth + BAR_GAP);
            const y = CHART_HEIGHT - 20 - barH;
            return (
              <G key={d.day}>
                <Rect x={x} y={y} width={barWidth} height={barH} rx={3} fill={d.value > 0 ? color : "#E5E7EB"} />
                {data.length <= 15 && (
                  <SvgText x={x + barWidth / 2} y={CHART_HEIGHT - 4} fontSize={9} fill="#9CA3AF" textAnchor="middle">
                    {d.day}
                  </SvgText>
                )}
              </G>
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

// ─── Pie Chart Component ──────────────────────────────────────────────────────
function PieChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <View style={styles.pieEmpty}>
      <Ionicons name="pie-chart-outline" size={40} color="#D1D5DB" />
      <Text style={styles.pieEmptyText}>Sem dados</Text>
    </View>
  );

  const SIZE = 140;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = SIZE / 2 - 8;

  let startAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const pathD = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    return { ...d, pathD };
  });

  return (
    <View style={styles.pieContainer}>
      <Svg width={SIZE} height={SIZE}>
        {slices.map((s, i) => (
          <G key={i}>
            <path d={s.pathD} fill={s.color} />
          </G>
        ))}
      </Svg>
      <View style={styles.pieLegend}>
        {data.map((d, i) => (
          <View key={i} style={styles.pieLegendItem}>
            <View style={[styles.pieDot, { backgroundColor: d.color }]} />
            <Text style={styles.pieLegendText} numberOfLines={1}>{d.label}</Text>
            <Text style={styles.pieLegendValue}>{d.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const colors = useColors();
  const { appRole } = useRole();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  if ((appRole !== "manager" && appRole !== "master")) {
    return <Redirect href="/(tabs)" />;
  }

  const { data: report, isLoading } = trpc.reports.monthly.useQuery({ year, month, userId: selectedUserId });
  const { data: promoters } = trpc.reports.allPromoters.useQuery();

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const handleExport = async () => {
    if (!report) return;
    setExporting(true);
    try {
      // Build a simple text report for sharing
      const lines: string[] = [
        `RELATÓRIO MENSAL — ${MONTH_NAMES[month - 1].toUpperCase()} ${year}`,
        `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
        "",
        `RESUMO GERAL`,
        `Horas trabalhadas: ${report.totalHours.toFixed(1)}h`,
        `Dias trabalhados: ${report.workingDays}`,
        `Fotos enviadas: ${report.totalPhotos}`,
        `Solicitações de material: ${report.totalRequests}`,
        "",
        `FOTOS POR MARCA`,
        ...report.photosByBrand.map((b) => `  ${b.brandName}: ${b.count} foto(s)`),
        "",
        `DETALHAMENTO DIÁRIO`,
        ...report.dailyData.filter((d) => d.hours > 0 || d.photos > 0).map(
          (d) => `  Dia ${String(d.day).padStart(2, "0")}: ${d.hours.toFixed(1)}h | ${d.photos} foto(s) | ${d.requests} solicit.`
        ),
      ];
      const content = lines.join("\n");

      if (Platform.OS === "web") {
        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `relatorio-${year}-${String(month).padStart(2, "0")}.txt`;
        a.click();
      } else {
        const FileSystem = await import("expo-file-system/legacy");
        const path = `${FileSystem.cacheDirectory}relatorio-${year}-${String(month).padStart(2, "0")}.txt`;
        await FileSystem.writeAsStringAsync(path, content, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(path, { mimeType: "text/plain", dialogTitle: "Exportar Relatório" });
        } else {
          Alert.alert("Exportado", `Arquivo salvo em: ${path}`);
        }
      }
    } catch (err: any) {
      Alert.alert("Erro", "Não foi possível exportar o relatório.");
    } finally {
      setExporting(false);
    }
  };

  const hoursData = report?.dailyData.map((d) => ({ day: d.day, value: d.hours })) ?? [];
  const photosData = report?.dailyData.map((d) => ({ day: d.day, value: d.photos })) ?? [];
  const pieData = report?.photosByBrand.map((b) => ({ label: b.brandName, value: b.count, color: b.brandColor ?? "#6B7280" })) ?? [];

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerTitle}>Relatório Mensal</Text>
          <Text style={styles.headerSub}>Desempenho da equipe</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.8 }]}
          onPress={handleExport}
          disabled={exporting || !report}
        >
          {exporting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="share-outline" size={20} color="#FFFFFF" />}
          <Text style={styles.exportBtnText}>Exportar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Month Selector */}
        <View style={[styles.monthSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={styles.monthArrow} onPress={prevMonth}>
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.foreground }]}>
            {MONTH_NAMES[month - 1]} {year}
          </Text>
          <Pressable style={styles.monthArrow} onPress={nextMonth} disabled={year === now.getFullYear() && month >= now.getMonth() + 1}>
            <Ionicons name="chevron-forward" size={22} color={year === now.getFullYear() && month >= now.getMonth() + 1 ? colors.muted : colors.primary} />
          </Pressable>
        </View>

        {/* Promoter Filter */}
        {promoters && promoters.length > 0 && (
          <View style={styles.filterSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Filtrar por Promotor</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              <Pressable
                style={[styles.filterChip, { backgroundColor: !selectedUserId ? colors.primary : colors.surface, borderColor: !selectedUserId ? colors.primary : colors.border }]}
                onPress={() => setSelectedUserId(undefined)}
              >
                <Text style={[styles.filterChipText, { color: !selectedUserId ? "#FFFFFF" : colors.foreground }]}>Todos</Text>
              </Pressable>
              {promoters.map((p) => (
                <Pressable
                  key={p.id}
                  style={[styles.filterChip, { backgroundColor: selectedUserId === p.id ? colors.primary : colors.surface, borderColor: selectedUserId === p.id ? colors.primary : colors.border }]}
                  onPress={() => setSelectedUserId(selectedUserId === p.id ? undefined : p.id)}
                >
                  <Text style={[styles.filterChipText, { color: selectedUserId === p.id ? "#FFFFFF" : colors.foreground }]} numberOfLines={1}>
                    {p.name ?? `Promotor ${p.id}`}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>Carregando relatório...</Text>
          </View>
        ) : !report ? (
          <View style={styles.emptyState}>
            <Ionicons name="bar-chart-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem dados disponíveis</Text>
          </View>
        ) : (
          <>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              {[
                { label: "Horas Trabalhadas", value: `${report.totalHours.toFixed(1)}h`, icon: "time-outline", color: "#3B82F6" },
                { label: "Dias Trabalhados", value: `${report.workingDays}d`, icon: "calendar-outline", color: "#10B981" },
                { label: "Fotos Enviadas", value: `${report.totalPhotos}`, icon: "camera-outline", color: "#8B5CF6" },
                { label: "Solicitações", value: `${report.totalRequests}`, icon: "cube-outline", color: "#F59E0B" },
              ].map((kpi) => (
                <View key={kpi.label} style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.kpiIcon, { backgroundColor: kpi.color + "15" }]}>
                    <Ionicons name={kpi.icon as any} size={20} color={kpi.color} />
                  </View>
                  <Text style={[styles.kpiValue, { color: colors.foreground }]}>{kpi.value}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.muted }]}>{kpi.label}</Text>
                </View>
              ))}
            </View>

            {/* Hours Chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Horas Trabalhadas por Dia</Text>
              <BarChart data={hoursData} color="#3B82F6" label="horas" />
            </View>

            {/* Photos Chart */}
            <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Fotos Enviadas por Dia</Text>
              <BarChart data={photosData} color="#8B5CF6" label="fotos" />
            </View>

            {/* Photos by Brand Pie */}
            {pieData.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.foreground }]}>Fotos por Marca</Text>
                <PieChart data={pieData} />
              </View>
            )}

            {/* Daily Table */}
            <View style={[styles.tableCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Detalhamento Diário</Text>
              <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
                <Text style={[styles.tableHeaderText, { color: colors.muted, flex: 1 }]}>Dia</Text>
                <Text style={[styles.tableHeaderText, { color: colors.muted, flex: 2 }]}>Horas</Text>
                <Text style={[styles.tableHeaderText, { color: colors.muted, flex: 1 }]}>Fotos</Text>
                <Text style={[styles.tableHeaderText, { color: colors.muted, flex: 1 }]}>Solicit.</Text>
              </View>
              {report.dailyData.filter((d) => d.hours > 0 || d.photos > 0 || d.requests > 0).map((d) => (
                <View key={d.day} style={[styles.tableRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.tableCell, { color: colors.foreground, flex: 1, fontWeight: "700" }]}>
                    {String(d.day).padStart(2, "0")}/{String(month).padStart(2, "0")}
                  </Text>
                  <View style={{ flex: 2, flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={[styles.hoursBar, { backgroundColor: colors.border }]}>
                      <View style={[styles.hoursBarFill, { backgroundColor: "#3B82F6", width: `${Math.min((d.hours / 10) * 100, 100)}%` as any }]} />
                    </View>
                    <Text style={[styles.tableCell, { color: colors.foreground }]}>{d.hours.toFixed(1)}h</Text>
                  </View>
                  <Text style={[styles.tableCell, { color: "#8B5CF6", flex: 1 }]}>{d.photos}</Text>
                  <Text style={[styles.tableCell, { color: "#F59E0B", flex: 1 }]}>{d.requests}</Text>
                </View>
              ))}
              {report.dailyData.filter((d) => d.hours > 0 || d.photos > 0 || d.requests > 0).length === 0 && (
                <View style={styles.tableEmpty}>
                  <Text style={[styles.tableEmptyText, { color: colors.muted }]}>Nenhuma atividade registrada neste mês</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  exportBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  monthSelector: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 14, borderWidth: 1, padding: 12 },
  monthArrow: { padding: 8 },
  monthLabel: { fontSize: 17, fontWeight: "700" },
  filterSection: { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  loading: { alignItems: "center", gap: 12, paddingVertical: 60 },
  loadingText: { fontSize: 14 },
  emptyState: { alignItems: "center", gap: 12, paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  kpiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { flex: 1, minWidth: "44%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 6 },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  kpiValue: { fontSize: 22, fontWeight: "800" },
  kpiLabel: { fontSize: 11, textAlign: "center" },
  chartCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  chartTitle: { fontSize: 15, fontWeight: "700" },
  chartLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  pieContainer: { flexDirection: "row", alignItems: "center", gap: 16 },
  pieLegend: { flex: 1, gap: 8 },
  pieLegendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  pieDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegendText: { flex: 1, fontSize: 13 },
  pieLegendValue: { fontSize: 13, fontWeight: "700", color: "#6B7280" },
  pieEmpty: { alignItems: "center", gap: 8, paddingVertical: 20 },
  pieEmptyText: { fontSize: 13, color: "#9CA3AF" },
  tableCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  tableHeader: { flexDirection: "row", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  tableHeaderText: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  tableRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 0.5 },
  tableCell: { fontSize: 13 },
  hoursBar: { height: 6, flex: 1, borderRadius: 3, overflow: "hidden" },
  hoursBarFill: { height: "100%", borderRadius: 3 },
  tableEmpty: { padding: 20, alignItems: "center" },
  tableEmptyText: { fontSize: 14 },
});
