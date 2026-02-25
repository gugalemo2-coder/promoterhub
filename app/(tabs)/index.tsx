import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

export default function HomeScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { appRole, clearRole } = useRole();
  const router = useRouter();

  const isManager = appRole === "manager" || appRole === "master";
  const isMaster = appRole === "master";
  const accentColor = isMaster ? "#7C3AED" : colors.primary;

  const isReady = !!user;
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] ?? "Usuário";
  const todayISO = now.toISOString();

  // ── Promoter queries ──────────────────────────────────────────────────────
  const { data: dailySummary } = trpc.timeEntries.dailySummary.useQuery(
    { date: todayISO },
    { enabled: isReady && !isManager }
  );
  const { data: pendingRequests } = trpc.materialRequests.list.useQuery(
    { status: "pending" },
    { enabled: isReady && !isManager }
  );

  // ── Manager/Master queries ────────────────────────────────────────────────
  const { data: dailyReport } = trpc.reports.daily.useQuery(
    { date: todayISO },
    { enabled: isReady && isManager }
  );
  const { data: unacknowledgedAlerts } = trpc.geoAlerts.list.useQuery(
    { acknowledged: false, limit: 50 },
    { enabled: isReady && isManager }
  );
  const { data: brands } = trpc.brands.list.useQuery(undefined, { enabled: isReady && isManager });

  // Photos for selected brand (today)
  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const { data: todayPhotos } = trpc.photos.listAll.useQuery(
    { brandId: selectedBrandId, startDate: startOfDay, endDate: endOfDay, limit: 30 },
    { enabled: isReady && isManager }
  );

  const sortedPhotos = useMemo(() => {
    if (!todayPhotos) return [];
    return [...todayPhotos].sort(
      (a, b) => new Date(b.photoTimestamp ?? 0).getTime() - new Date(a.photoTimestamp ?? 0).getTime()
    );
  }, [todayPhotos]);

  const alertCount = unacknowledgedAlerts?.length ?? 0;

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleLogout = async () => {
    Alert.alert("Sair da conta", "Deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          try {
            await clearRole();
            await logout();
          } catch {
            // ignora
          } finally {
            router.replace("/login");
          }
        },
      },
    ]);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // MANAGER / MASTER DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────
  if (isManager) {
    return (
      <ScreenContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* ── Header ── */}
          <View style={[styles.managerHeader, { backgroundColor: accentColor }]}>
            {/* Sino de alertas (esquerda) */}
            <TouchableOpacity
              style={styles.bellBtn}
              onPress={() => router.push("/(tabs)/alerts" as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={26} color="#fff" />
              {alertCount > 0 && (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{alertCount > 99 ? "99+" : alertCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Saudação (centro) */}
            <View style={styles.managerGreeting}>
              <Text style={styles.managerGreetingText}>{greeting}, {firstName}!</Text>
              <Text style={styles.managerSubtitle}>
                {isMaster ? "Conta Master" : "Painel do Gestor"}
              </Text>
            </View>

            {/* Logout (direita) */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* ── Stats Cards ── */}
          <View style={styles.statsGrid}>
            {[
              { label: "Registros Hoje", value: dailyReport?.totalEntries ?? 0, icon: "time-outline", color: "#3B82F6" },
              { label: "Fotos Enviadas", value: dailyReport?.totalPhotos ?? 0, icon: "camera-outline", color: "#10B981" },
              { label: "Solicitações", value: dailyReport?.totalRequests ?? 0, icon: "cube-outline", color: "#F59E0B" },
              { label: "Alertas Ativos", value: alertCount, icon: "warning-outline", color: "#EF4444" },
            ].map((stat) => (
              <View
                key={stat.label}
                style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
                  <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── Fotos do Dia ── */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fotos de Hoje</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/manager-photos" as any)}>
              <Text style={[styles.seeAll, { color: accentColor }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Selector */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.brandScroll}
          >
            <TouchableOpacity
              style={[
                styles.brandChip,
                {
                  backgroundColor: !selectedBrandId ? accentColor : colors.surface,
                  borderColor: !selectedBrandId ? accentColor : colors.border,
                },
              ]}
              onPress={() => setSelectedBrandId(undefined)}
              activeOpacity={0.75}
            >
              <Text style={[styles.brandChipText, { color: !selectedBrandId ? "#fff" : colors.foreground }]}>
                Todas
              </Text>
            </TouchableOpacity>
            {brands?.map((brand) => {
              const active = selectedBrandId === brand.id;
              const brandColor = brand.colorHex ?? accentColor;
              return (
                <TouchableOpacity
                  key={brand.id}
                  style={[
                    styles.brandChip,
                    {
                      backgroundColor: active ? brandColor : colors.surface,
                      borderColor: active ? brandColor : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedBrandId(brand.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.brandDot, { backgroundColor: active ? "#fff" : brandColor }]} />
                  <Text style={[styles.brandChipText, { color: active ? "#fff" : colors.foreground }]}>
                    {brand.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Photo Grid */}
          {sortedPhotos.length === 0 ? (
            <View style={[styles.emptyPhotos, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="images-outline" size={40} color={colors.muted} />
              <Text style={[styles.emptyPhotosText, { color: colors.muted }]}>
                Nenhuma foto enviada hoje
              </Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {sortedPhotos.slice(0, 9).map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                  onPress={() => router.push("/(tabs)/manager-photos" as any)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: photo.photoUrl }}
                    style={styles.photoImage}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>
              ))}
              {sortedPhotos.length > 9 && (
                <TouchableOpacity
                  style={[styles.photoCell, styles.moreCell, { width: PHOTO_SIZE, height: PHOTO_SIZE, backgroundColor: accentColor + "20" }]}
                  onPress={() => router.push("/(tabs)/manager-photos" as any)}
                >
                  <Text style={[styles.moreCellText, { color: accentColor }]}>+{sortedPhotos.length - 9}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ── Quick Actions ── */}
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Acesso Rápido</Text>
          <View style={styles.quickActions}>
            {[
              { label: "Equipe", icon: "people-outline", route: "/(tabs)/team", color: "#3B82F6" },
              { label: "Relatórios", icon: "bar-chart-outline", route: "/(tabs)/reports", color: "#10B981" },
              { label: "Materiais", icon: "cube-outline", route: "/(tabs)/materials", color: "#F59E0B" },
              { label: "Arquivos", icon: "document-outline", route: "/(tabs)/files", color: "#8B5CF6" },
            ].map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + "15" }]}>
                  <Ionicons name={action.icon as any} size={26} color={action.color} />
                </View>
                <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROMOTER HOME
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.promoterHeader, { backgroundColor: colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.promoterGreeting}>{greeting}, {firstName}!</Text>
            <Text style={styles.promoterSubtitle}>
              {dailySummary?.hasOpenEntry ? "✅ Ponto aberto" : "Ponto não registrado"}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>

        {/* Today's Summary */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Resumo de Hoje</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {dailySummary ? formatHours(dailySummary.totalMinutes) : "--"}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Horas</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Ionicons name="camera-outline" size={20} color={colors.success} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {dailySummary?.entries.length ?? 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Registros</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Ionicons name="cube-outline" size={20} color={colors.warning} />
              <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                {pendingRequests?.length ?? 0}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.muted }]}>Pendentes</Text>
            </View>
          </View>
        </View>

        {/* Clock In/Out CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.clockCta,
            { backgroundColor: dailySummary?.hasOpenEntry ? "#EF4444" : colors.primary },
            pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => router.push("/(tabs)/clock" as any)}
        >
          <Ionicons
            name={dailySummary?.hasOpenEntry ? "stop-circle-outline" : "play-circle-outline"}
            size={28}
            color="#FFFFFF"
          />
          <Text style={styles.clockCtaText}>
            {dailySummary?.hasOpenEntry ? "Registrar Saída" : "Registrar Entrada"}
          </Text>
        </Pressable>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ações Rápidas</Text>
        <View style={styles.quickActions}>
          {[
            { label: "Tirar Foto", icon: "camera-outline", route: "/(tabs)/photos", color: "#3B82F6" },
            { label: "Solicitar Material", icon: "cube-outline", route: "/(tabs)/materials", color: "#F59E0B" },
            { label: "Arquivos", icon: "document-outline", route: "/(tabs)/files", color: "#8B5CF6" },
            { label: "Histórico", icon: "time-outline", route: "/(tabs)/clock", color: "#10B981" },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                styles.quickAction,
                { backgroundColor: colors.surface, borderColor: colors.border },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + "15" }]}>
                <Ionicons name={action.icon as any} size={26} color={action.color} />
              </View>
              <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // Manager header
  managerHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    gap: 12,
  },
  bellBtn: { position: "relative", padding: 4 },
  bellBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#EF4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  managerGreeting: { flex: 1, alignItems: "center" },
  managerGreetingText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  managerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  logoutBtn: { padding: 4 },

  // Promoter header
  promoterHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  promoterGreeting: { fontSize: 22, fontWeight: "700", color: "#fff" },
  promoterSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: "center" },

  // Section
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  seeAll: { fontSize: 14, fontWeight: "600" },

  // Brand chips
  brandScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: "row" },
  brandChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandChipText: { fontSize: 13, fontWeight: "600" },

  // Photo grid
  photoGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 4, marginBottom: 8 },
  photoCell: { borderRadius: 8, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  moreCell: { alignItems: "center", justifyContent: "center", borderRadius: 8 },
  moreCellText: { fontSize: 18, fontWeight: "800" },
  emptyPhotos: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10, marginBottom: 8 },
  emptyPhotosText: { fontSize: 14, textAlign: "center" },

  // Promoter summary
  summaryCard: { margin: 16, borderRadius: 20, padding: 20, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 6 },
  summaryDivider: { width: 1, height: 48 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 12 },

  // Clock CTA
  clockCta: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  clockCtaText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },

  // Quick actions
  quickActions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  quickAction: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", gap: 10, borderWidth: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
