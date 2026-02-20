import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ALERT_CONFIG: Record<string, { label: string; icon: string; color: string; desc: string }> = {
  left_radius: { label: "Saiu do Raio", icon: "location-outline", color: "#EF4444", desc: "Promotor registrou ponto fora do raio da loja" },
  suspicious_movement: { label: "Movimento Suspeito", icon: "warning-outline", color: "#F59E0B", desc: "Padrão de movimento suspeito detectado" },
  gps_spoofing_suspected: { label: "GPS Falso", icon: "shield-outline", color: "#7C3AED", desc: "Possível uso de GPS simulado" },
  low_hours: { label: "Horas Insuficientes", icon: "time-outline", color: "#3B82F6", desc: "Promotor com menos horas que o esperado" },
  no_entry: { label: "Sem Registro", icon: "close-circle-outline", color: "#6B7280", desc: "Nenhum registro de ponto no dia" },
};

export default function AlertsScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const [filterAcknowledged, setFilterAcknowledged] = useState<boolean | undefined>(false);

  if (appRole !== "manager") {
    return <Redirect href="/(tabs)" />;
  }

  const { data: alerts, refetch } = trpc.geoAlerts.list.useQuery({ acknowledged: filterAcknowledged, limit: 100 });
  const acknowledgeMutation = trpc.geoAlerts.acknowledge.useMutation();

  const handleAcknowledge = async (id: number) => {
    Alert.alert(
      "Reconhecer Alerta",
      "Deseja marcar este alerta como reconhecido?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reconhecer",
          onPress: async () => {
            try {
              await acknowledgeMutation.mutateAsync({ id });
              refetch();
            } catch (err) {
              Alert.alert("Erro", "Não foi possível reconhecer o alerta.");
            }
          },
        },
      ]
    );
  };

  const pendingCount = alerts?.filter((a) => !a.acknowledged).length ?? 0;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: pendingCount > 0 ? "#DC2626" : colors.primary }]}>
        <View>
          <Text style={styles.headerTitle}>Alertas de Monitoramento</Text>
          <Text style={styles.headerSub}>
            {pendingCount > 0 ? `${pendingCount} alerta(s) pendente(s)` : "Tudo em ordem"}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={styles.alertBadge}>
            <Text style={styles.alertBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { borderBottomColor: colors.border }]}>
        {[
          { label: "Pendentes", value: false as boolean | undefined },
          { label: "Todos", value: undefined as boolean | undefined },
          { label: "Reconhecidos", value: true as boolean | undefined },
        ].map((tab) => (
          <Pressable
            key={tab.label}
            style={[styles.filterTab, filterAcknowledged === tab.value && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setFilterAcknowledged(tab.value)}
          >
            <Text style={[styles.filterTabText, { color: filterAcknowledged === tab.value ? colors.primary : colors.muted }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Alerts List */}
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={56} color={colors.success} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              {filterAcknowledged === false ? "Nenhum alerta pendente" : "Nenhum alerta"}
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              {filterAcknowledged === false ? "Todos os alertas foram reconhecidos" : "Nenhum alerta registrado"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const config = ALERT_CONFIG[item.alertType] ?? { label: item.alertType, icon: "alert-circle-outline", color: "#6B7280", desc: "" };
          const isAcknowledged = item.acknowledged;
          return (
            <View style={[styles.alertCard, { backgroundColor: colors.surface, borderColor: isAcknowledged ? colors.border : config.color + "40", borderLeftWidth: isAcknowledged ? 1 : 4 }]}>
              <View style={[styles.alertIcon, { backgroundColor: config.color + "15" }]}>
                <Ionicons name={config.icon as any} size={24} color={isAcknowledged ? colors.muted : config.color} />
              </View>
              <View style={styles.alertInfo}>
                <View style={styles.alertHeader}>
                  <Text style={[styles.alertType, { color: isAcknowledged ? colors.muted : colors.foreground }]}>
                    {config.label}
                  </Text>
                  <Text style={[styles.alertTime, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <Text style={[styles.alertDesc, { color: colors.muted }]}>{config.desc}</Text>
                {item.distanceFromStore && (
                  <View style={styles.alertMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.muted} />
                    <Text style={[styles.alertMetaText, { color: colors.muted }]}>
                      {parseFloat(item.distanceFromStore).toFixed(2)} km da loja
                    </Text>
                  </View>
                )}
                {item.notes && (
                  <Text style={[styles.alertNotes, { color: colors.muted }]}>{item.notes}</Text>
                )}
                {isAcknowledged ? (
                  <View style={styles.acknowledgedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#0E9F6E" />
                    <Text style={[styles.acknowledgedText, { color: "#0E9F6E" }]}>Reconhecido</Text>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [styles.acknowledgeBtn, { backgroundColor: config.color }, pressed && { opacity: 0.8 }]}
                    onPress={() => handleAcknowledge(item.id)}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    <Text style={styles.acknowledgeBtnText}>Reconhecer</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  alertBadge: { backgroundColor: "#FFFFFF", width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  alertBadgeText: { fontSize: 16, fontWeight: "800", color: "#DC2626" },
  filterTabs: { flexDirection: "row", borderBottomWidth: 1 },
  filterTab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  filterTabText: { fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  alertCard: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: "row", gap: 12 },
  alertIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  alertInfo: { flex: 1, gap: 6 },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  alertType: { fontSize: 15, fontWeight: "700", flex: 1 },
  alertTime: { fontSize: 12 },
  alertDesc: { fontSize: 13, lineHeight: 18 },
  alertMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  alertMetaText: { fontSize: 12 },
  alertNotes: { fontSize: 12, fontStyle: "italic" },
  acknowledgedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  acknowledgedText: { fontSize: 13, fontWeight: "600" },
  acknowledgeBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, alignSelf: "flex-start" },
  acknowledgeBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
