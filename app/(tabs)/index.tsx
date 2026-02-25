import { ScreenContainer } from "@/components/screen-container";
import { UserHeader } from "@/components/user-header";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const { appRole, clearRole } = useRole();
  const router = useRouter();
  const isManager = appRole === "manager";

  const isReady = !!user;
  const { data: dailySummary } = trpc.timeEntries.dailySummary.useQuery({ date: new Date().toISOString() }, { enabled: isReady });
  const { data: brands } = trpc.brands.list.useQuery(undefined, { enabled: isReady });
  const { data: pendingRequests } = trpc.materialRequests.list.useQuery({ status: "pending" }, { enabled: isReady });
  const { data: dailyReport } = trpc.reports.daily.useQuery({ date: new Date().toISOString() }, { enabled: isReady && isManager });
  const { data: unacknowledgedAlerts } = trpc.geoAlerts.list.useQuery({ acknowledged: false, limit: 5 }, { enabled: isReady && isManager });

  const firstName = user?.name?.split(" ")[0] ?? "Promotor";
  const now = new Date();
  const greeting = now.getHours() < 12 ? "Bom dia" : now.getHours() < 18 ? "Boa tarde" : "Boa noite";

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const handleLogout = async () => {
    Alert.alert(
      "Sair da conta",
      "Deseja sair e trocar de perfil?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await clearRole();
              await logout();
            } catch {
              // ignora erros de rede no logout
            } finally {
              router.replace("/login");
            }
          },
        },
      ]
    );
  };

  if (isManager) {
    return (
      <ScreenContainer>
        <ScrollView showsVerticalScrollIndicator={false}>
          <UserHeader
            name={user?.name}
            subtitle="Painel do Gestor"
            onLogout={handleLogout}
            backgroundColor="#1A56DB"
          />

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            {[
              { label: "Registros Hoje", value: dailyReport?.totalEntries ?? 0, icon: "time-outline", color: "#3B82F6" },
              { label: "Fotos Enviadas", value: dailyReport?.totalPhotos ?? 0, icon: "camera-outline", color: "#10B981" },
              { label: "Solicitações", value: dailyReport?.totalRequests ?? 0, icon: "cube-outline", color: "#F59E0B" },
              { label: "Alertas", value: dailyReport?.totalAlerts ?? 0, icon: "warning-outline", color: "#EF4444" },
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

          {/* Pending Alerts */}
          {(unacknowledgedAlerts?.length ?? 0) > 0 && (
            <View style={[styles.alertBanner, { backgroundColor: "#FEF3C7", borderColor: "#F59E0B" }]}>
              <Ionicons name="warning" size={20} color="#D97706" />
              <Text style={[styles.alertBannerText, { color: "#92400E" }]}>
                {unacknowledgedAlerts?.length} alerta(s) pendente(s) de revisão
              </Text>
              <Pressable onPress={() => router.push("/(tabs)/alerts" as any)}>
                <Text style={{ color: "#D97706", fontWeight: "700", fontSize: 13 }}>Ver</Text>
              </Pressable>
            </View>
          )}

          {/* Quick Actions */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Ações Rápidas</Text>
          <View style={styles.quickActions}>
            {[
              { label: "Equipe", icon: "people-outline", route: "/(tabs)/team", color: "#3B82F6" },
              { label: "Controle Ponto", icon: "time-outline", route: "/(tabs)/clock", color: "#10B981" },
              { label: "Solicitações", icon: "cube-outline", route: "/(tabs)/materials", color: "#F59E0B" },
              { label: "Enviar Arquivo", icon: "cloud-upload-outline", route: "/(tabs)/files", color: "#8B5CF6" },
            ].map((action) => (
              <Pressable
                key={action.label}
                style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.75 }]}
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

  // ─── PROMOTER HOME ──────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <UserHeader
          name={user?.name}
          subtitle={dailySummary?.hasOpenEntry ? "✅ Ponto aberto" : "Ponto não registrado"}
          onLogout={handleLogout}
        />

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
          <Ionicons name={dailySummary?.hasOpenEntry ? "stop-circle-outline" : "play-circle-outline"} size={28} color="#FFFFFF" />
          <Text style={styles.clockCtaText}>
            {dailySummary?.hasOpenEntry ? "Registrar Saída" : "Registrar Entrada"}
          </Text>
        </Pressable>

        {/* Brands Quick Access */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Marcas</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandsScroll}>
          {brands?.map((brand) => (
            <Pressable
              key={brand.id}
              style={({ pressed }) => [styles.brandChip, { backgroundColor: (brand.colorHex ?? "#3B82F6") + "20", borderColor: brand.colorHex ?? "#3B82F6" }, pressed && { opacity: 0.75 }]}
              onPress={() => router.push(`/(tabs)/photos?brandId=${brand.id}` as any)}
            >
              <View style={[styles.brandDot, { backgroundColor: brand.colorHex ?? "#3B82F6" }]} />
              <Text style={[styles.brandChipText, { color: brand.colorHex ?? "#3B82F6" }]}>{brand.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

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
              style={({ pressed }) => [styles.quickAction, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.75 }]}
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
  header: { paddingTop: 20, paddingBottom: 24, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  logoutBtn: { padding: 8 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCard: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: "800" },
  statLabel: { fontSize: 12, marginTop: 2, textAlign: "center" },
  alertBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1 },
  alertBannerText: { flex: 1, fontSize: 13, fontWeight: "500" },
  summaryCard: { margin: 16, borderRadius: 20, padding: 20, borderWidth: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "700", marginBottom: 16 },
  summaryRow: { flexDirection: "row", alignItems: "center" },
  summaryItem: { flex: 1, alignItems: "center", gap: 6 },
  summaryDivider: { width: 1, height: 48 },
  summaryValue: { fontSize: 22, fontWeight: "800" },
  summaryLabel: { fontSize: 12 },
  clockCta: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 },
  clockCtaText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginHorizontal: 16, marginTop: 8, marginBottom: 12 },
  brandsScroll: { paddingLeft: 16, marginBottom: 8 },
  brandChip: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, marginRight: 10 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandChipText: { fontSize: 14, fontWeight: "600" },
  quickActions: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  quickAction: { flex: 1, minWidth: "44%", borderRadius: 16, padding: 16, alignItems: "center", gap: 10, borderWidth: 1 },
  quickActionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  quickActionLabel: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
