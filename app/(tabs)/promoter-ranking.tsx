import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Pressable,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

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

  const router = useRouter();
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
      onPress={() => router.push({ pathname: "/promoter-detail" as any, params: { promoterId: String(item.userId), promoterName: item.userName ?? `Promotor ${item.userId}` } })}
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
// ─── Period Selector Types ───────────────────────────────────────────────────
type PeriodMode = "single" | "preset" | "custom";
type PresetKey = "3m" | "6m" | "12m";

function buildPeriodOptions(now: Date) {
  const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const options: Array<{ label: string; year: number; month: number }> = [];
  for (let i = 0; i < 36; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ label: `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`, year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return options;
}

export default function PromoterRankingScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("single");
  const [preset, setPreset] = useState<PresetKey>("3m");
  const [customStart, setCustomStart] = useState<{ year: number; month: number }>({ year: now.getFullYear(), month: now.getMonth() === 0 ? 12 : now.getMonth(), ...(now.getMonth() === 0 ? { year: now.getFullYear() - 1 } : {}) });
  const [customEnd, setCustomEnd] = useState<{ year: number; month: number }>({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showCustomStart, setShowCustomStart] = useState(false);
  const [showCustomEnd, setShowCustomEnd] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pdfHtml, setPdfHtml] = useState<string | null>(null);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const monthOptions = buildPeriodOptions(now);

  // Compute startDate/endDate based on mode
  const periodDates = (() => {
    if (periodMode === "single") {
      return { startDate: undefined, endDate: undefined };
    } else if (periodMode === "preset") {
      const months = preset === "3m" ? 3 : preset === "6m" ? 6 : 12;
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      const start = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    } else {
      const start = new Date(customStart.year, customStart.month - 1, 1);
      const end = new Date(customEnd.year, customEnd.month, 0, 23, 59, 59);
      return { startDate: start.toISOString(), endDate: end.toISOString() };
    }
  })();

  const periodLabel = (() => {
    if (periodMode === "single") return `${MONTHS_FULL[month - 1]} ${year}`;
    if (periodMode === "preset") return preset === "3m" ? "Últimos 3 meses" : preset === "6m" ? "Últimos 6 meses" : "Último ano";
    return `${MONTHS[customStart.month - 1]}/${customStart.year} – ${MONTHS[customEnd.month - 1]}/${customEnd.year}`;
  })();

  const { data: ranking, isLoading } = trpc.promoterRanking.monthly.useQuery(
    { year, month, ...periodDates },
    { enabled: !!user }
  );

  const handleExportPDF = async () => {
    if (!ranking || ranking.length === 0) {
      Alert.alert("Sem dados", "Não há promotores para exportar neste período.");
      return;
    }
    setExporting(true);
    try {
      const verifyCode = `PRK-${year}${String(month).padStart(2, "0")}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const avgScore = Math.round(ranking.reduce((s, r) => s + r.score, 0) / ranking.length);
      const medalEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `${rank}°`;
      const scoreColor = (s: number) => s >= 70 ? "#22C55E" : s >= 40 ? "#F59E0B" : "#EF4444";
      const avgDailyTeam = ranking.length > 0
        ? Math.round((ranking.reduce((s, r) => s + (r.avgDailyHours ?? 0), 0) / ranking.length) * 10) / 10
        : 0;
      const rows = ranking.map((p) => `
        <tr>
          <td style="text-align:center;font-size:18px">${medalEmoji(p.rank)}</td>
          <td style="font-weight:600">${p.userName}</td>
          <td style="text-align:center">${p.totalApprovedPhotos}</td>
          <td style="text-align:center">${p.totalHoursWorked.toFixed(1)}h</td>
          <td style="text-align:center;color:${(p.avgDailyHours ?? 0) >= 8 ? '#22C55E' : (p.avgDailyHours ?? 0) >= 6 ? '#F59E0B' : '#EF4444'};font-weight:600">${(p.avgDailyHours ?? 0).toFixed(1)}h</td>
          <td style="text-align:center;color:#6b7280">${p.workedDays ?? 0}d</td>
          <td style="text-align:center">${p.totalVisits}</td>
          <td style="text-align:center">${p.totalMaterialRequests}</td>
          <td style="text-align:center;font-weight:700;color:${scoreColor(p.score)}">${p.score}</td>
        </tr>`).join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
        <style>
          body { font-family: -apple-system, Arial, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
          .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 32px 24px; }
          .header h1 { margin: 0 0 4px; font-size: 24px; }
          .header p { margin: 0; opacity: 0.85; font-size: 14px; }
          .summary { display: flex; gap: 16px; padding: 20px 24px; background: white; border-bottom: 1px solid #e5e7eb; }
          .summary-card { flex: 1; text-align: center; }
          .summary-card .val { font-size: 22px; font-weight: 800; color: #1e40af; }
          .summary-card .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .content { padding: 24px; }
          table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          th { background: #1e40af; color: white; padding: 12px 10px; font-size: 12px; text-align: center; }
          td { padding: 10px; border-bottom: 1px solid #f3f4f6; font-size: 13px; }
          tr:last-child td { border-bottom: none; }
          tr:nth-child(even) { background: #f8fafc; }
          .formula { background: white; border-radius: 10px; padding: 14px 20px; margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; border: 1px solid #e5e7eb; }
          .footer { text-align: center; padding: 20px; font-size: 11px; color: #9ca3af; }
        </style></head><body>
        <div class="header">
          <h1>Ranking de Promotores</h1>
          <p>${periodLabel} &nbsp;·&nbsp; ${ranking.length} promotores &nbsp;·&nbsp; Score médio: ${avgScore}</p>
        </div>
        <div class="summary">
          <div class="summary-card"><div class="val">${ranking.length}</div><div class="lbl">Promotores</div></div>
          <div class="summary-card"><div class="val">${ranking.reduce((s, r) => s + r.totalApprovedPhotos, 0)}</div><div class="lbl">Fotos Aprovadas</div></div>
          <div class="summary-card"><div class="val">${ranking.reduce((s, r) => s + r.totalHoursWorked, 0).toFixed(1)}h</div><div class="lbl">Horas Totais</div></div>
          <div class="summary-card"><div class="val">${avgDailyTeam}h</div><div class="lbl">Méd. Diária</div></div>
          <div class="summary-card"><div class="val">${ranking.reduce((s, r) => s + r.totalVisits, 0)}</div><div class="lbl">Visitas</div></div>
          <div class="summary-card"><div class="val">${avgScore}</div><div class="lbl">Score Médio</div></div>
        </div>
        <div class="content">
          <table>
            <thead><tr><th>#</th><th style="text-align:left">Promotor</th><th>Fotos</th><th>Horas Total</th><th>Méd. Diária</th><th>Dias</th><th>Visitas</th><th>Materiais</th><th>Score</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="formula">Score = Fotos Aprovadas 30% + Horas Trabalhadas 25% + Visitas a PDVs 25% + Materiais Solicitados 10% + Qualidade das Fotos 10% − Alertas de Geo</div>
        </div>
        <div class="footer">Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} &nbsp;·&nbsp; Código: ${verifyCode}</div>
      </body></html>`;
      if (Platform.OS === "web") {
        setPdfHtml(html);
      } else {
        const path = `${FileSystem.cacheDirectory}ranking-promotores-${periodLabel.replace(/\s/g, "-")}.html`;
        await FileSystem.writeAsStringAsync(path, html, { encoding: FileSystem.EncodingType.UTF8 });
        await Sharing.shareAsync(path, { mimeType: "text/html", dialogTitle: "Exportar Ranking de Promotores" });
      }
    } catch (e) {
      Alert.alert("Erro", "Não foi possível exportar o ranking.");
    } finally {
      setExporting(false);
    }
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ranking de Promotores</Text>
          {(ranking ?? []).length > 0 && (
            <Text style={[styles.headerSub, { color: colors.muted }]}>
              {ranking!.length} promotores · Score médio: {avgScore}
            </Text>
          )}
        </View>
        <Pressable
          onPress={handleExportPDF}
          disabled={exporting || isLoading || (ranking ?? []).length === 0}
          style={({ pressed }) => [styles.exportBtn, { backgroundColor: colors.primary, opacity: pressed || exporting ? 0.7 : 1 }]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>PDF</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Period Picker */}
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
        {/* Mode tabs */}
        <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 10, gap: 8 }}>
          {(["single", "preset", "custom"] as PeriodMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setPeriodMode(m)}
              style={[{
                flex: 1, paddingVertical: 6, borderRadius: 20, alignItems: "center",
                backgroundColor: periodMode === m ? colors.primary : colors.background,
                borderWidth: 1, borderColor: periodMode === m ? colors.primary : colors.border,
              }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "600", color: periodMode === m ? "#fff" : colors.muted }}>
                {m === "single" ? "Mês" : m === "preset" ? "Período" : "Personalizado"}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Single month dropdown */}
        {periodMode === "single" && (
          <Pressable
            onPress={() => setShowPeriodPicker(true)}
            style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10 }}
          >
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>{MONTHS_FULL[month - 1]} {year}</Text>
            <Ionicons name="chevron-down" size={18} color={colors.primary} />
          </Pressable>
        )}

        {/* Preset period */}
        {periodMode === "preset" && (
          <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
            {(["3m", "6m", "12m"] as PresetKey[]).map((p) => (
              <Pressable
                key={p}
                onPress={() => setPreset(p)}
                style={[{
                  flex: 1, paddingVertical: 7, borderRadius: 16, alignItems: "center",
                  backgroundColor: preset === p ? colors.primary : colors.background,
                  borderWidth: 1, borderColor: preset === p ? colors.primary : colors.border,
                }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: preset === p ? "#fff" : colors.foreground }}>
                  {p === "3m" ? "3 meses" : p === "6m" ? "6 meses" : "1 ano"}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Custom period */}
        {periodMode === "custom" && (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}>
            <Pressable
              onPress={() => setShowCustomStart(true)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, color: colors.foreground }}>{MONTHS[customStart.month - 1]}/{customStart.year}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </Pressable>
            <Text style={{ color: colors.muted, fontSize: 13 }}>–</Text>
            <Pressable
              onPress={() => setShowCustomEnd(true)}
              style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              <Text style={{ fontSize: 13, color: colors.foreground }}>{MONTHS[customEnd.month - 1]}/{customEnd.year}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.muted} />
            </Pressable>
          </View>
        )}
      </View>

      {/* Month picker modal (single) */}
      <Modal visible={showPeriodPicker} transparent animationType="slide" onRequestClose={() => setShowPeriodPicker(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShowPeriodPicker(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Selecionar mês</Text>
            <Pressable onPress={() => setShowPeriodPicker(false)}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
          </View>
          <FlatList
            data={monthOptions}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setYear(item.year); setMonth(item.month); setShowPeriodPicker(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: (item.year === year && item.month === month) ? colors.primary + "18" : "transparent" }}
              >
                <Text style={{ fontSize: 15, color: (item.year === year && item.month === month) ? colors.primary : colors.foreground, fontWeight: (item.year === year && item.month === month) ? "700" : "400" }}>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Custom start picker */}
      <Modal visible={showCustomStart} transparent animationType="slide" onRequestClose={() => setShowCustomStart(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShowCustomStart(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Início do período</Text>
            <Pressable onPress={() => setShowCustomStart(false)}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
          </View>
          <FlatList
            data={monthOptions}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setCustomStart({ year: item.year, month: item.month }); setShowCustomStart(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: (item.year === customStart.year && item.month === customStart.month) ? colors.primary + "18" : "transparent" }}
              >
                <Text style={{ fontSize: 15, color: (item.year === customStart.year && item.month === customStart.month) ? colors.primary : colors.foreground, fontWeight: (item.year === customStart.year && item.month === customStart.month) ? "700" : "400" }}>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Custom end picker */}
      <Modal visible={showCustomEnd} transparent animationType="slide" onRequestClose={() => setShowCustomEnd(false)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)" }} onPress={() => setShowCustomEnd(false)} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%", position: "absolute", bottom: 0, left: 0, right: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>Fim do período</Text>
            <Pressable onPress={() => setShowCustomEnd(false)}><Ionicons name="close" size={22} color={colors.muted} /></Pressable>
          </View>
          <FlatList
            data={monthOptions}
            keyExtractor={(item) => `${item.year}-${item.month}`}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { setCustomEnd({ year: item.year, month: item.month }); setShowCustomEnd(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border, backgroundColor: (item.year === customEnd.year && item.month === customEnd.month) ? colors.primary + "18" : "transparent" }}
              >
                <Text style={{ fontSize: 15, color: (item.year === customEnd.year && item.month === customEnd.month) ? colors.primary : colors.foreground, fontWeight: (item.year === customEnd.year && item.month === customEnd.month) ? "700" : "400" }}>{item.label}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.muted }]}>Calculando ranking...</Text>
        </View>
      ) : (ranking ?? []).length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem dados neste período</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhum promotor registrou atividade em {periodLabel}.
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

      {/* PDF Viewer Modal (web only) */}
      <Modal visible={!!pdfHtml} transparent animationType="slide" onRequestClose={() => setPdfHtml(null)}>
        <View style={styles.pdfModalContainer}>
          <View style={styles.pdfModalHeader}>
            <Text style={styles.pdfModalTitle}>Ranking de Promotores</Text>
            <View style={styles.pdfModalActions}>
              {Platform.OS === "web" && pdfHtml && (
                <TouchableOpacity
                  style={styles.pdfDownloadBtn}
                  onPress={() => {
                    const blob = new Blob([pdfHtml], { type: "text/html" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ranking-promotores-${MONTHS[month - 1]}-${year}.html`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Ionicons name="download-outline" size={20} color="#fff" />
                  <Text style={styles.pdfDownloadBtnText}>Baixar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.pdfCloseBtn} onPress={() => setPdfHtml(null)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {Platform.OS === "web" && pdfHtml && (
            <iframe
              srcDoc={pdfHtml}
              style={{ flex: 1, border: "none", width: "100%" } as any}
              title="Ranking PDF"
            />
          )}
        </View>
      </Modal>
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
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 60,
    justifyContent: "center",
  },
  exportBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  pdfModalContainer: { flex: 1, backgroundColor: "#fff", marginTop: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  pdfModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#1e293b", paddingHorizontal: 16, paddingVertical: 14 },
  pdfModalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", flex: 1 },
  pdfModalActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  pdfDownloadBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#0a7ea4", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  pdfDownloadBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  pdfCloseBtn: { backgroundColor: "rgba(255,255,255,0.15)", padding: 8, borderRadius: 20 },
});
