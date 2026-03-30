import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PHOTO_SIZE = (SCREEN_WIDTH - 48 - 8) / 3;

export default function HomeScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { appRole, isRoleLoading, clearRole } = useRole();
  const router = useRouter();

  const isManager = appRole === "manager" || appRole === "master";
  const isPromoter = appRole === "promoter";
  const isMaster = appRole === "master";
  const isSupervisor = appRole === "supervisor";
  const accentColor = isMaster ? "#7C3AED" : isSupervisor ? "#D97706" : colors.primary;

  const isReady = !!user && !isRoleLoading && !!appRole;

  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user?.name?.split(" ")[0] ?? "Usuário";
  const todayISO = now.toISOString();

  // ── Preview de foto inline (home do gestor) ───────────────────────────────
  const [previewPhoto, setPreviewPhoto] = useState<{ uri: string } | null>(null);

  // ── Promoter queries ──────────────────────────────────────────────────────
  // FIX: enabled agora depende de isPromoter explicitamente (não de !isManager)
  // Isso garante que a query SÓ roda quando o appRole já foi carregado como "promoter"
  const { data: dailySummary } = trpc.timeEntries.dailySummary.useQuery(
    { date: todayISO },
    {
      enabled: isReady && isPromoter,
      refetchOnWindowFocus: true,
      refetchInterval: 30000,
    }
  );
  const { data: pendingRequests } = trpc.materialRequests.list.useQuery(
    { status: "pending" },
    {
      enabled: isReady && isPromoter,
      refetchOnWindowFocus: true,
    }
  );
  const { data: myStores } = trpc.stores.listForPromoter.useQuery(
    undefined,
    { enabled: isReady && isPromoter }
  );

  // ── Manager/Master queries ────────────────────────────────────────────────
  const { data: dailyReport } = trpc.reports.daily.useQuery(
    { date: todayISO },
    { enabled: isReady && isManager }
  );
  const { data: brands } = trpc.brands.list.useQuery(
    undefined,
    { enabled: isReady && isManager }
  );

  const [selectedBrandId, setSelectedBrandId] = useState<number | undefined>();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();

  const { data: todayPhotos } = trpc.photos.listAll.useQuery(
    { brandId: selectedBrandId, startDate: startOfDay, endDate: endOfDay, limit: 9 },
    { enabled: isReady && isManager }
  );

  const sortedPhotos = useMemo(() => {
    if (!todayPhotos) return [];
    return [...todayPhotos].sort(
      (a, b) => new Date(b.photoTimestamp ?? 0).getTime() - new Date(a.photoTimestamp ?? 0).getTime()
    );
  }, [todayPhotos]);

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const doLogout = async () => {
    try {
      await clearRole();
      await logout();
    } catch {
      // ignora
    } finally {
      router.replace("/");
    }
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      doLogout();
    } else {
      Alert.alert("Sair da conta", "Deseja sair?", [
        { text: "Cancelar", style: "cancel" },
        { text: "Sair", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  if (isSupervisor) {
    return <Redirect href="/(tabs)/supervisor-photos" />;
  }

  // ── MANAGER / MASTER DASHBOARD ─────────────────────────────────────────────
  if (isManager) {
    return (
      <ScreenContainer>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>

          {/* Header */}
          <View style={[styles.managerHeader, { backgroundColor: accentColor }]}>
            <TouchableOpacity style={styles.bellBtn} onPress={() => router.push("/(tabs)/alerts" as any)} activeOpacity={0.8}>
              <Ionicons name="notifications-outline" size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.managerGreeting}>
              <Text style={styles.managerGreetingText}>{greeting}, {firstName}!</Text>
              <Text style={styles.managerSubtitle}>{isMaster ? "Conta Master" : "Painel do Gestor"}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={24} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            {[
              { label: "Registros Hoje", value: dailyReport?.totalEntries ?? 0, icon: "time-outline", color: "#3B82F6" },
              { label: "Fotos Enviadas", value: dailyReport?.totalPhotos ?? 0, icon: "camera-outline", color: "#10B981" },
              { label: "Solicitações", value: dailyReport?.totalRequests ?? 0, icon: "cube-outline", color: "#F59E0B" },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
                  <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Fotos do Dia */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fotos de Hoje</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/manager-photos" as any)}>
              <Text style={[styles.seeAll, { color: accentColor }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>

          {/* Brand Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandScroll}>
            <TouchableOpacity
              style={[styles.brandChip, { backgroundColor: !selectedBrandId ? accentColor : colors.surface, borderColor: !selectedBrandId ? accentColor : colors.border }]}
              onPress={() => setSelectedBrandId(undefined)}
              activeOpacity={0.75}
            >
              <Text style={[styles.brandChipText, { color: !selectedBrandId ? "#fff" : colors.foreground }]}>Todas</Text>
            </TouchableOpacity>
            {brands?.map((brand) => {
              const active = selectedBrandId === brand.id;
              const brandColor = brand.colorHex ?? accentColor;
              return (
                <TouchableOpacity
                  key={brand.id}
                  style={[styles.brandChip, { backgroundColor: active ? brandColor : colors.surface, borderColor: active ? brandColor : colors.border }]}
                  onPress={() => setSelectedBrandId(brand.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.brandDot, { backgroundColor: active ? "#fff" : brandColor }]} />
                  <Text style={[styles.brandChipText, { color: active ? "#fff" : colors.foreground }]}>{brand.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Photo Grid */}
          {sortedPhotos.length === 0 ? (
            <View style={[styles.emptyPhotos, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="images-outline" size={40} color={colors.muted} />
              <Text style={[styles.emptyPhotosText, { color: colors.muted }]}>Nenhuma foto enviada hoje</Text>
            </View>
          ) : (
            <View style={styles.photoGrid}>
              {sortedPhotos.slice(0, 9).map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={[styles.photoCell, { width: PHOTO_SIZE, height: PHOTO_SIZE }]}
                  onPress={() => setPreviewPhoto({ uri: photo.photoUrl ?? "" })}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: photo.photoUrl }} style={styles.photoImage} contentFit="cover" transition={200} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Quick Actions */}
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

        {/* Modal de preview inline da foto */}
        <Modal visible={!!previewPhoto} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
          <View style={styles.photoPreviewOverlay}>
            <TouchableOpacity style={styles.photoPreviewClose} onPress={() => setPreviewPhoto(null)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
            {previewPhoto && (
              <Image source={{ uri: previewPhoto.uri }} style={styles.photoPreviewImage} contentFit="contain" />
            )}
            <TouchableOpacity
              style={[styles.photoPreviewAllBtn, { backgroundColor: accentColor }]}
              onPress={() => { setPreviewPhoto(null); router.push("/(tabs)/manager-photos" as any); }}
              activeOpacity={0.85}
            >
              <Ionicons name="images-outline" size={18} color="#fff" />
              <Text style={styles.photoPreviewAllText}>Ver todas as fotos</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  // ── PROMOTER HOME ──────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
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

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ações Rápidas</Text>
        <View style={styles.quickActions}>
          {[
            { label: "Tirar Foto", icon: "camera-outline", route: "/(tabs)/photos", color: "#3B82F6" },
            { label: "Solicitar Material", icon: "cube-outline", route: "/(tabs)/materials", color: "#F59E0B" },
            { label: "Arquivos", icon: "document-outline", route: "/(tabs)/files", color: "#8B5CF6" },
            { label: "Vencimento", icon: "alert-circle-outline", route: "/(tabs)/product-expiration", color: "#10B981" },
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

        <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 8 }]}>Minhas Lojas</Text>
        {!myStores || myStores.length === 0 ? (
          <View style={[styles.emptyStores, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="storefront-outline" size={32} color={colors.muted} />
            <Text style={[styles.emptyStoresText, { color: colors.muted }]}>
              Nenhuma loja vinculada.{"\n"}Contate o gestor.
            </Text>
          </View>
        ) : (
          <View style={styles.storesList}>
            {myStores.map((store) => (
              <View key={store.id} style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.storeIconBg, { backgroundColor: colors.primary + "15" }]}>
                  <Ionicons name="storefront-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.foreground }]} numberOfLines={1}>{store.name}</Text>
                  {store.city && (
                    <Text style={[styles.storeCity, { color: colors.muted }]} numberOfLines={1}>{store.city}</Text>
                  )}
                </View>
                <Pressable
                  style={({ pressed }) => [styles.storeClockBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
                  onPress={() => router.push("/(tabs)/clock" as any)}
                >
                  <Ionicons name="time-outline" size={16} color="#fff" />
                  <Text style={styles.storeClockBtnText}>Ponto</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  managerHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 12 },
  bellBtn: { position: "relative", padding: 4 },
  managerGreeting: { flex: 1, alignItems: "center" },
  managerGreetingText: { fontSize: 20, fontWeight: "800", color: "#fff" },
  managerSubtitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  logoutBtn: { padding: 4 },
  promoterHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  promoterGreeting: { fontSize: 22, fontWeight: "700", color: "#fff" },
  promoterSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: "center" },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  seeAll: { fontSize: 14, fontWeight: "600" },
  brandScroll: { paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: "row" },
  brandChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandChipText: { fontSize: 13, fontWeight: "600" },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, gap: 4, marginBottom: 8 },
  photoCell: { borderRadius: 8, overflow: "hidden" },
  photoImage: { width: "100%", height: "100%" },
  emptyPhotos: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 32, alignItems: "center", gap: 10, marginBottom: 8 },
  emptyPhotosText: { fontSize: 14, textAlign: "center" },
  photoPreviewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  photoPreviewClose: { position: "absolute", top: 50, right: 16, zIndex: 20 },
  photoPreviewImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  photoPreviewAllBtn: { position: "absolute", bottom: 40, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16 },
  photoPreviewAllText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  summaryCard: { margin: 16, borderRadius: 20, padding: 20, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 6 },
  summaryDivider: { width: 1, height: 48 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 12 },
  clockCta: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  clockCtaText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  quickAction: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", gap: 10, borderWidth: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
  emptyStores: { marginHorizontal: 16, borderRadius: 16, borderWidth: 1, padding: 24, alignItems: "center", gap: 10, marginBottom: 24 },
  emptyStoresText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  storesList: { paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  storeCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  storeIconBg: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeCity: { fontSize: 12, marginTop: 2 },
  storeClockBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  storeClockBtnText: { fontSize: 13, fontWeight: "600", color: "#fff" },
});
