import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ClockScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager";

  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const utils = trpc.useUtils();
  const { data: lastEntry } = trpc.timeEntries.lastOpenEntry.useQuery();
  const { data: dailySummary, refetch: refetchSummary } = trpc.timeEntries.dailySummary.useQuery({ date: selectedDate.toISOString() });
  const { data: allEntries, refetch: refetchAll } = trpc.timeEntries.allForDate.useQuery({ date: selectedDate.toISOString() }, { enabled: isManager });
  const { data: myEntries, refetch: refetchMy } = trpc.timeEntries.list.useQuery({ startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() }, { enabled: !isManager });
  const { data: stores } = trpc.stores.list.useQuery();
  const createEntryMutation = trpc.timeEntries.create.useMutation();

  const hasOpenEntry = !!lastEntry;
  const displayEntries = isManager ? allEntries : myEntries;

  const getLocation = async (): Promise<{ latitude: number; longitude: number; accuracy: number } | null> => {
    if (Platform.OS === "web") {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          Alert.alert("Erro", "Geolocalização não suportada neste dispositivo.");
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
          () => { Alert.alert("Erro de localização", "Não foi possível obter sua localização."); resolve(null); },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário acesso à localização para registrar o ponto.");
      return null;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      return { latitude: loc.coords.latitude, longitude: loc.coords.longitude, accuracy: loc.coords.accuracy ?? 0 };
    } catch {
      Alert.alert("Erro de localização", "Não foi possível obter sua localização. Verifique o GPS.");
      return null;
    }
  };

  const handleRegister = async () => {
    if (!stores || stores.length === 0) {
      Alert.alert("Sem loja", "Nenhuma loja cadastrada. Contate o gestor.");
      return;
    }

    setLocationLoading(true);
    const loc = await getLocation();
    setLocationLoading(false);

    if (!loc) return;
    setCurrentLocation(loc);

    const entryType = hasOpenEntry ? "exit" : "entry";

    Alert.alert(
      hasOpenEntry ? "Registrar Saída" : "Registrar Entrada",
      `Localização obtida com precisão de ${Math.round(loc.accuracy)}m.\n\nConfirmar registro de ${entryType === "entry" ? "entrada" : "saída"}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setRegistering(true);
            try {
              const result = await createEntryMutation.mutateAsync({
                storeId: stores[0].id,
                entryType,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: loc.accuracy,
              });

              if (Platform.OS !== "web") {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }

              if (!result.isWithinRadius) {
                Alert.alert(
                  "⚠️ Fora do raio",
                  `Você está a ${result.distanceKm.toFixed(2)} km da loja. O registro foi feito, mas um alerta foi gerado para o gestor.`,
                  [{ text: "OK" }]
                );
              } else {
                Alert.alert("✅ Registrado!", `${entryType === "entry" ? "Entrada" : "Saída"} registrada com sucesso!`);
              }

              utils.timeEntries.lastOpenEntry.invalidate();
              refetchSummary();
              refetchMy();
            } catch (err) {
              if (Platform.OS !== "web") {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              }
              Alert.alert("Erro", "Não foi possível registrar o ponto. Tente novamente.");
            } finally {
              setRegistering(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  };

  const formatHours = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${h}h ${m.toString().padStart(2, "0")}m`;
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
        <Text style={styles.headerTitle}>{isManager ? "Controle de Ponto" : "Registro de Ponto"}</Text>
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

      {/* Promoter Clock In/Out Button */}
      {!isManager && isToday && (
        <View style={styles.clockSection}>
          <Pressable
            style={({ pressed }) => [
              styles.clockBtn,
              { backgroundColor: hasOpenEntry ? "#EF4444" : "#0E9F6E" },
              (registering || locationLoading) && { opacity: 0.7 },
              pressed && { transform: [{ scale: 0.97 }] },
            ]}
            onPress={handleRegister}
            disabled={registering || locationLoading}
          >
            {locationLoading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.clockBtnText}>Obtendo localização...</Text>
              </>
            ) : registering ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.clockBtnText}>Registrando...</Text>
              </>
            ) : (
              <>
                <Ionicons name={hasOpenEntry ? "stop-circle-outline" : "play-circle-outline"} size={32} color="#FFFFFF" />
                <Text style={styles.clockBtnText}>
                  {hasOpenEntry ? "Registrar Saída" : "Registrar Entrada"}
                </Text>
              </>
            )}
          </Pressable>

          {/* Daily Summary */}
          {dailySummary && (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.summaryItem}>
                <Ionicons name="time-outline" size={20} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {formatHours(dailySummary.totalMinutes)}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Total hoje</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Ionicons name={hasOpenEntry ? "radio-button-on" : "radio-button-off"} size={20} color={hasOpenEntry ? "#0E9F6E" : colors.muted} />
                <Text style={[styles.summaryValue, { color: hasOpenEntry ? "#0E9F6E" : colors.muted }]}>
                  {hasOpenEntry ? "Ativo" : "Inativo"}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Status</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="list-outline" size={20} color={colors.primary} />
                <Text style={[styles.summaryValue, { color: colors.foreground }]}>
                  {dailySummary.entries.length}
                </Text>
                <Text style={[styles.summaryLabel, { color: colors.muted }]}>Registros</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Entries List */}
      <FlatList
        data={displayEntries}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum registro</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              {isToday && !isManager ? "Registre sua entrada para começar" : "Sem registros neste dia"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.entryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.entryIcon, { backgroundColor: item.entryType === "entry" ? "#0E9F6E20" : "#EF444420" }]}>
              <Ionicons
                name={item.entryType === "entry" ? "log-in-outline" : "log-out-outline"}
                size={22}
                color={item.entryType === "entry" ? "#0E9F6E" : "#EF4444"}
              />
            </View>
            <View style={styles.entryInfo}>
              <Text style={[styles.entryType, { color: colors.foreground }]}>
                {item.entryType === "entry" ? "Entrada" : "Saída"}
              </Text>
              <Text style={[styles.entryTime, { color: colors.primary }]}>
                {formatTime(item.entryTime)}
              </Text>
              <View style={styles.entryMeta}>
                <Ionicons name="location-outline" size={12} color={item.isWithinRadius ? "#0E9F6E" : "#EF4444"} />
                <Text style={[styles.entryDistance, { color: item.isWithinRadius ? "#0E9F6E" : "#EF4444" }]}>
                  {item.distanceFromStore ? `${parseFloat(item.distanceFromStore).toFixed(2)} km` : "—"}
                </Text>
              </View>
            </View>
            {!item.isWithinRadius && (
              <View style={styles.alertBadge}>
                <Ionicons name="warning" size={14} color="#D97706" />
              </View>
            )}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20 },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  dateNavBtn: { padding: 8 },
  dateNavText: { fontSize: 15, fontWeight: "600", textTransform: "capitalize" },
  clockSection: { padding: 16, gap: 12 },
  clockBtn: { borderRadius: 20, paddingVertical: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  clockBtnText: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  summaryCard: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", borderWidth: 1 },
  summaryItem: { flex: 1, alignItems: "center", gap: 4 },
  summaryDivider: { width: 1, height: 40 },
  summaryValue: { fontSize: 18, fontWeight: "800" },
  summaryLabel: { fontSize: 12 },
  list: { padding: 16, gap: 10 },
  entryCard: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1, gap: 12 },
  entryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  entryInfo: { flex: 1, gap: 2 },
  entryType: { fontSize: 15, fontWeight: "600" },
  entryTime: { fontSize: 22, fontWeight: "800" },
  entryMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  entryDistance: { fontSize: 12, fontWeight: "500" },
  alertBadge: { padding: 6, backgroundColor: "#FEF3C7", borderRadius: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
});
