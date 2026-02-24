import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function TeamScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  if (appRole !== "manager") {
    return <Redirect href="/(tabs)" />;
  }

  const { data: promoters } = trpc.reports.allPromoters.useQuery();
  const { data: dailyReport } = trpc.reports.daily.useQuery({ date: selectedDate.toISOString() });
  const { data: promoterSummary } = trpc.reports.promoterSummary.useQuery(
    { userId: selectedUserId ?? undefined, date: selectedDate.toISOString() },
    { enabled: !!selectedUserId }
  );

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    if (newDate <= new Date()) setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Equipe de Promotores</Text>
        <Text style={styles.headerSub}>{promoters?.length ?? 0} promotores cadastrados</Text>
      </View>

      {/* Date Navigation */}
      <View style={[styles.dateNav, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable style={({ pressed }) => [styles.dateNavBtn, pressed && { opacity: 0.6 }]} onPress={() => changeDate(-1)}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
        </Pressable>
        <Text style={[styles.dateNavText, { color: colors.foreground }]}>{formatDate(selectedDate)}</Text>
        <Pressable
          style={({ pressed }) => [styles.dateNavBtn, pressed && { opacity: 0.6 }, isToday && { opacity: 0.3 }]}
          onPress={() => changeDate(1)}
          disabled={isToday}
        >
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Daily Summary */}
      {dailyReport && (
        <View style={[styles.dailySummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {[
            { label: "Registros", value: dailyReport.totalEntries, icon: "time-outline", color: "#3B82F6" },
            { label: "Fotos", value: dailyReport.totalPhotos, icon: "camera-outline", color: "#10B981" },
            { label: "Solicitações", value: dailyReport.totalRequests, icon: "cube-outline", color: "#F59E0B" },
            { label: "Alertas", value: dailyReport.totalAlerts, icon: "warning-outline", color: "#EF4444" },
          ].map((stat) => (
            <View key={stat.label} style={styles.dailyStat}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
              <Text style={[styles.dailyStatValue, { color: colors.foreground }]}>{stat.value}</Text>
              <Text style={[styles.dailyStatLabel, { color: colors.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Promoters List */}
      <FlatList
        data={promoters}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum promotor</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              Os promotores aparecerão aqui após fazerem login
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedUserId === item.id;
          return (
            <Pressable
              style={({ pressed }) => [
                styles.promoterCard,
                { backgroundColor: isSelected ? colors.primary + "10" : colors.surface, borderColor: isSelected ? colors.primary : colors.border },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push({ pathname: "/promoter-detail" as any, params: { promoterId: String(item.id), promoterName: item.name ?? `Promotor ${item.id}` } })}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item.name ?? "?")[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.promoterInfo}>
                <Text style={[styles.promoterName, { color: colors.foreground }]}>{item.name ?? "Sem nome"}</Text>
                <Text style={[styles.promoterEmail, { color: colors.muted }]}>{item.email ?? "—"}</Text>
              </View>
              <Ionicons
                name={isSelected ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.muted}
              />
            </Pressable>
          );
        }}
        ListFooterComponent={
          selectedUserId && promoterSummary ? (
            <View style={[styles.promoterDetail, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.detailTitle, { color: colors.foreground }]}>Detalhes do Dia</Text>
              <View style={styles.detailStats}>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailStatValue, { color: colors.foreground }]}>
                    {formatHours(promoterSummary.totalMinutes)}
                  </Text>
                  <Text style={[styles.detailStatLabel, { color: colors.muted }]}>Horas trabalhadas</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailStatValue, { color: promoterSummary.hasOpenEntry ? "#0E9F6E" : colors.muted }]}>
                    {promoterSummary.hasOpenEntry ? "Ativo" : "Inativo"}
                  </Text>
                  <Text style={[styles.detailStatLabel, { color: colors.muted }]}>Status atual</Text>
                </View>
                <View style={styles.detailStat}>
                  <Text style={[styles.detailStatValue, { color: colors.foreground }]}>
                    {promoterSummary.entries.length}
                  </Text>
                  <Text style={[styles.detailStatLabel, { color: colors.muted }]}>Registros</Text>
                </View>
              </View>
              {promoterSummary.entries.length > 0 && (
                <View style={styles.entriesTimeline}>
                  {promoterSummary.entries.map((entry: any, idx: number) => (
                    <View key={entry.id} style={styles.timelineItem}>
                      <View style={[styles.timelineDot, { backgroundColor: entry.entryType === "entry" ? "#0E9F6E" : "#EF4444" }]} />
                      <Text style={[styles.timelineText, { color: colors.foreground }]}>
                        {entry.entryType === "entry" ? "Entrada" : "Saída"} — {new Date(entry.entryTime).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      {!entry.isWithinRadius && (
                        <Ionicons name="warning" size={14} color="#D97706" />
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : null
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 2 },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  dateNavBtn: { padding: 8 },
  dateNavText: { fontSize: 14, fontWeight: "600" },
  dailySummary: { flexDirection: "row", margin: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  dailyStat: { flex: 1, alignItems: "center", gap: 4 },
  dailyStatValue: { fontSize: 20, fontWeight: "800" },
  dailyStatLabel: { fontSize: 11 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  promoterCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 18, fontWeight: "700" },
  promoterInfo: { flex: 1 },
  promoterName: { fontSize: 15, fontWeight: "600" },
  promoterEmail: { fontSize: 13, marginTop: 2 },
  promoterDetail: { margin: 0, marginTop: 4, borderRadius: 14, padding: 16, borderWidth: 1, gap: 12 },
  detailTitle: { fontSize: 15, fontWeight: "700" },
  detailStats: { flexDirection: "row", gap: 8 },
  detailStat: { flex: 1, alignItems: "center", gap: 4 },
  detailStatValue: { fontSize: 18, fontWeight: "800" },
  detailStatLabel: { fontSize: 11, textAlign: "center" },
  entriesTimeline: { gap: 8 },
  timelineItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineText: { flex: 1, fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
