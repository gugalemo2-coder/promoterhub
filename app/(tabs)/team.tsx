import { ScreenContainer } from "@/components/screen-container";
import { UserHeader } from "@/components/user-header";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function TeamScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  if (appRole !== "manager" && appRole !== "master") {
    return <Redirect href="/(tabs)" />;
  }

  const { data: promoters } = trpc.reports.allPromoters.useQuery();
  const { data: monthlyReport, isLoading: loadingReport } = trpc.reports.monthly.useQuery(
    { year, month },
    { enabled: true }
  );

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

  const totalHours = monthlyReport?.totalHours ?? 0;
  const totalPhotos = monthlyReport?.totalPhotos ?? 0;
  const totalRequests = monthlyReport?.totalRequests ?? 0;
  const workingDays = monthlyReport?.workingDays ?? 0;

  const { user, logout } = useAuth();
  const doLogout = async () => { try { await logout(); } catch {} finally { router.replace("/"); } };
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

  return (
    <ScreenContainer>
      <UserHeader
        name={user?.name}
        subtitle={`${promoters?.length ?? 0} promotores cadastrados`}
        onLogout={handleLogout}
        backgroundColor="#1A56DB"
      />

      {/* Month Picker */}
      <View style={[styles.monthPicker, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={prevMonth} style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }]}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>
          {MONTHS_FULL[month - 1]} {year}
        </Text>
        <Pressable
          onPress={nextMonth}
          style={({ pressed }) => [styles.monthBtn, pressed && { opacity: 0.6 }, isCurrentMonth && { opacity: 0.3 }]}
          disabled={isCurrentMonth}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Monthly Summary */}
      {loadingReport ? (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Resumo do Mês</Text>
          <View style={styles.summaryGrid}>
            {[
              { label: "Horas Trabalhadas", value: `${totalHours.toFixed(1)}h`, icon: "time-outline", color: "#3B82F6" },
              { label: "Fotos Enviadas", value: totalPhotos, icon: "camera-outline", color: "#10B981" },
              { label: "Dias Trabalhados", value: workingDays, icon: "calendar-outline", color: "#8B5CF6" },
              { label: "Solicitações", value: totalRequests, icon: "cube-outline", color: "#F59E0B" },
            ].map((stat) => (
              <View key={stat.label} style={[styles.summaryItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Ionicons name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>{stat.value}</Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Promoters List */}
      <FlatList
        data={promoters}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={[styles.listHeader, { color: colors.muted }]}>
            Toque em um promotor para ver o detalhe completo
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum promotor</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              Nenhum promotor cadastrado ainda
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.promoterCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { opacity: 0.8 },
            ]}
            onPress={() =>
              router.push({
                pathname: "/promoter-detail" as any,
                params: { promoterId: String(item.id), promoterName: item.name ?? (item as any).login ?? `Promotor ${item.id}` },
              })
            }
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {(item.name ?? (item as any).login ?? "?")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.promoterInfo}>
              <Text style={[styles.promoterName, { color: colors.foreground }]}>{item.name ?? (item as any).login ?? "Sem nome"}</Text>
              <Text style={[styles.promoterEmail, { color: colors.muted }]}>{(item as any).login ?? "—"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        )}
        ListFooterComponent={<View style={{ height: 32 }} />}
      />
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
  monthBtn: { padding: 8 },
  monthLabel: { fontSize: 15, fontWeight: "600" },
  summaryCard: {
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  summaryTitle: { fontSize: 15, fontWeight: "700" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryItem: {
    flex: 1,
    minWidth: "44%",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  summaryValue: { fontSize: 20, fontWeight: "800" },
  summaryLabel: { fontSize: 10, textAlign: "center" },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  listHeader: { fontSize: 12, textAlign: "center", marginBottom: 8 },
  promoterCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  promoterInfo: { flex: 1 },
  promoterName: { fontSize: 15, fontWeight: "600" },
  promoterEmail: { fontSize: 13, marginTop: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
