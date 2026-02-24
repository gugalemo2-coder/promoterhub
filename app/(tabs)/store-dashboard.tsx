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
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

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
  const [selectedPromoterId, setSelectedPromoterId] = useState<number | undefined>(undefined);
  const [showPromoterPicker, setShowPromoterPicker] = useState(false);

  // Fetch promoters list for the filter
  const { data: promoters } = trpc.storePerformance.promoters.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data, isLoading, refetch } = trpc.storePerformance.ranking.useQuery(
    { year, month, promoterId: selectedPromoterId },
    { enabled: !!user }
  );

  const selectedPromoterName = selectedPromoterId
    ? promoters?.find((p) => p.id === selectedPromoterId)?.name ?? "Promotor"
    : "Todos os promotores";

  const stores = data ?? [];
  const maxVisits = Math.max(...stores.map((s) => s.totalVisits), 1);
  const maxPhotos = Math.max(...stores.map((s) => s.totalPhotos), 1);
  const maxCoverage = Math.max(...stores.map((s) => s.totalCoverageMinutes), 1);
  const [exporting, setExporting] = useState(false);

  const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const handleExportPDF = async () => {
    if (stores.length === 0) return;
    setExporting(true);
    try {
      const monthName = MONTHS[month - 1];
      const generatedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const verificationCode = `PMH-${year}${String(month).padStart(2, "0")}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const tableRows = stores.map((s, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;
        const coverage = (s.totalCoverageMinutes / 60).toFixed(1);
        const approvalRate = Math.round(s.photoApprovalRate * 100);
        return `
          <tr style="background:${i % 2 === 0 ? "#f9fafb" : "#ffffff"}">
            <td style="padding:10px 12px;text-align:center;font-size:18px">${medal}</td>
            <td style="padding:10px 12px;font-weight:600;color:#111827">${s.storeName}</td>
            <td style="padding:10px 12px;text-align:center">${s.totalVisits}</td>
            <td style="padding:10px 12px;text-align:center">${s.totalPhotos}</td>
            <td style="padding:10px 12px;text-align:center">${approvalRate}%</td>
            <td style="padding:10px 12px;text-align:center">${coverage}h</td>
            <td style="padding:10px 12px;text-align:center">${Math.round(s.materialApprovalRate * 100)}%</td>
            <td style="padding:10px 12px;text-align:center">
              <span style="background:${s.score >= 70 ? "#d1fae5" : s.score >= 40 ? "#fef3c7" : "#fee2e2"};color:${s.score >= 70 ? "#065f46" : s.score >= 40 ? "#92400e" : "#991b1b"};padding:4px 10px;border-radius:20px;font-weight:700">${s.score}</span>
            </td>
          </tr>`;
      }).join("");

      const totalVisits = stores.reduce((a, s) => a + s.totalVisits, 0);
      const totalPhotos = stores.reduce((a, s) => a + s.totalPhotos, 0);
      const totalCoverage = (stores.reduce((a, s) => a + s.totalCoverageMinutes, 0) / 60).toFixed(1);
      const avgScore = Math.round(stores.reduce((a, s) => a + s.score, 0) / stores.length);

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ranking de PDVs — ${monthName} ${year}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; color: #374151; background: #fff; }
  .header { background: linear-gradient(135deg, #1e40af, #0e7490); color: white; padding: 32px 40px; }
  .header h1 { font-size: 26px; font-weight: 800; margin-bottom: 4px; }
  .header p { font-size: 14px; opacity: 0.85; }
  .summary { display: flex; gap: 16px; padding: 24px 40px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  .summary-card { flex: 1; background: white; border-radius: 12px; padding: 16px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .summary-card .num { font-size: 28px; font-weight: 800; color: #1e40af; }
  .summary-card .label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .section { padding: 24px 40px; }
  .section h2 { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead tr { background: #1e40af; color: white; }
  thead th { padding: 12px; text-align: center; font-weight: 600; }
  thead th:nth-child(2) { text-align: left; }
  tbody tr:hover { background: #eff6ff !important; }
  .footer { padding: 24px 40px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #9ca3af; }
  .formula { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #0369a1; margin-top: 16px; }
</style>
</head>
<body>
<div class="header">
  <h1>PromoterHub — Ranking de PDVs</h1>
  <p>${monthName} ${year} &nbsp;·&nbsp; ${stores.length} pontos de venda &nbsp;·&nbsp; Score médio: ${avgScore} pts</p>
</div>
<div class="summary">
  <div class="summary-card"><div class="num">${stores.length}</div><div class="label">PDVs avaliados</div></div>
  <div class="summary-card"><div class="num">${totalVisits}</div><div class="label">Visitas totais</div></div>
  <div class="summary-card"><div class="num">${totalPhotos}</div><div class="label">Fotos enviadas</div></div>
  <div class="summary-card"><div class="num">${totalCoverage}h</div><div class="label">Cobertura total</div></div>
  <div class="summary-card"><div class="num">${avgScore}</div><div class="label">Score médio</div></div>
</div>
<div class="section">
  <h2>Ranking Completo</h2>
  <table>
    <thead><tr>
      <th>Pos.</th><th style="text-align:left">PDV</th><th>Visitas</th><th>Fotos</th><th>Aprovação</th><th>Cobertura</th><th>Materiais</th><th>Score</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="formula">
    <strong>Fórmula do score composto:</strong> Visitas 25% + Fotos 20% + Qualidade de fotos 20% + Cobertura 20% + Materiais 10% − Alertas 5%
  </div>
</div>
<div class="footer">
  <span>Gerado em ${generatedAt} &nbsp;·&nbsp; PromoterHub</span>
  <span>Cód. verificação: <strong>${verificationCode}</strong></span>
</div>
</body></html>`;

      if (Platform.OS === "web") {
        // Web: abrir em nova aba para impressão
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setExporting(false);
        return;
      }

      // Mobile: salvar HTML como arquivo e compartilhar
      const fileUri = `${FileSystem.cacheDirectory}ranking_pdvs_${monthName}_${year}.html`;
      await FileSystem.writeAsStringAsync(fileUri, html, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/html",
          dialogTitle: `Ranking de PDVs — ${monthName} ${year}`,
          UTI: "public.html",
        });
      }
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    } finally {
      setExporting(false);
    }
  };

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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Dashboard de PDVs</Text>
          <Text style={styles.headerSub}>Ranking de desempenho composto</Text>
        </View>
        {stores.length > 0 && (
          <Pressable
            onPress={handleExportPDF}
            disabled={exporting}
            style={({ pressed }) => [{
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              opacity: pressed || exporting ? 0.7 : 1,
            }]}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>
              {exporting ? "Gerando..." : "Exportar"}
            </Text>
          </Pressable>
        )}
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

      {/* Promoter filter */}
      <View style={[styles.promoterFilter, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="people-outline" size={16} color={colors.muted} />
        <Pressable
          onPress={() => setShowPromoterPicker(!showPromoterPicker)}
          style={({ pressed }) => [styles.promoterBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.promoterBtnText, { color: selectedPromoterId ? colors.primary : colors.muted }]}>
            {selectedPromoterName}
          </Text>
          <Ionicons name={showPromoterPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
        </Pressable>
        {selectedPromoterId && (
          <Pressable
            onPress={() => setSelectedPromoterId(undefined)}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="close-circle" size={18} color={colors.error} />
          </Pressable>
        )}
      </View>

      {/* Promoter picker dropdown */}
      {showPromoterPicker && (
        <View style={[styles.promoterDropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            onPress={() => { setSelectedPromoterId(undefined); setShowPromoterPicker(false); }}
            style={({ pressed }) => [styles.promoterOption, { opacity: pressed ? 0.7 : 1, backgroundColor: !selectedPromoterId ? colors.primary + "20" : "transparent" }]}
          >
            <Ionicons name="people" size={16} color={!selectedPromoterId ? colors.primary : colors.muted} />
            <Text style={[styles.promoterOptionText, { color: !selectedPromoterId ? colors.primary : colors.foreground, fontWeight: !selectedPromoterId ? "700" : "400" }]}>
              Todos os promotores
            </Text>
          </Pressable>
          {(promoters ?? []).map((p) => (
            <Pressable
              key={p.id}
              onPress={() => { setSelectedPromoterId(p.id); setShowPromoterPicker(false); }}
              style={({ pressed }) => [styles.promoterOption, { opacity: pressed ? 0.7 : 1, backgroundColor: selectedPromoterId === p.id ? colors.primary + "20" : "transparent" }]}
            >
              <Ionicons name="person" size={16} color={selectedPromoterId === p.id ? colors.primary : colors.muted} />
              <Text style={[styles.promoterOptionText, { color: selectedPromoterId === p.id ? colors.primary : colors.foreground, fontWeight: selectedPromoterId === p.id ? "700" : "400" }]}>
                {p.name ?? p.email}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  promoterFilter: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 0.5,
  },
  promoterBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  promoterBtnText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  promoterDropdown: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    zIndex: 10,
  },
  promoterOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promoterOptionText: {
    fontSize: 14,
  },
});
