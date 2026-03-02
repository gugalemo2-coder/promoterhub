import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState, useEffect } from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const OPEN_ENTRY_KEY = "@promoterhub:open_entry";
const OPEN_ENTRY_STORE_KEY = "@promoterhub:open_entry_store_id";

type Store = { id: number; name: string; address?: string | null; city?: string | null };

// ─── Photo picker helper ──────────────────────────────────────────────────────
async function pickPhoto(source: "camera" | "gallery"): Promise<{ base64: string; fileType: string; uri: string } | null> {
  if (source === "camera") {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário acesso à câmera para tirar foto do ponto.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return { base64: asset.base64 ?? "", fileType: asset.mimeType ?? "image/jpeg", uri: asset.uri };
  } else {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return { base64: asset.base64 ?? "", fileType: asset.mimeType ?? "image/jpeg", uri: asset.uri };
  }
}

// ─── Clock Entry Modal ────────────────────────────────────────────────────────
function ClockEntryModal({
  visible,
  entryType,
  stores,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  entryType: "entry" | "exit";
  stores: Store[];
  onClose: () => void;
  onConfirm: (storeId: number, photoBase64: string, photoFileType: string) => void;
}) {
  const colors = useColors();
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [photo, setPhoto] = useState<{ base64: string; fileType: string; uri: string } | null>(null);
  const [pickingPhoto, setPickingPhoto] = useState(false);

  const isEntry = entryType === "entry";
  const accentColor = isEntry ? "#0E9F6E" : "#EF4444";

  const handlePickPhoto = async (source: "camera" | "gallery") => {
    setPickingPhoto(true);
    const result = await pickPhoto(source);
    setPickingPhoto(false);
    if (result) setPhoto(result);
  };

  const handleConfirm = () => {
    if (isEntry && !selectedStore) {
      Alert.alert("Selecione a loja", "É necessário selecionar a loja antes de registrar.");
      return;
    }
    if (!photo) {
      Alert.alert("Foto obrigatória", "Tire ou selecione uma foto do ponto eletrônico para registrar.");
      return;
    }
    const storeId = isEntry ? selectedStore!.id : stores[0]?.id;
    if (!storeId) {
      Alert.alert("Erro", "Nenhuma loja disponível para registrar a saída.");
      return;
    }
    onConfirm(storeId, photo.base64, photo.fileType);
  };

  const handleClose = () => {
    setSelectedStore(null);
    setPhoto(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {isEntry ? "Registrar Entrada" : "Registrar Saída"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Step 1: Store Selection (only for entry) */}
          {isEntry && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Selecione a Loja</Text>
              </View>
              {stores.length === 0 ? (
                <View style={[styles.emptyStores, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="storefront-outline" size={32} color={colors.muted} />
                  <Text style={[styles.emptyStoresText, { color: colors.muted }]}>
                    Nenhuma loja vinculada à sua conta.{"\n"}Contate o gestor.
                  </Text>
                </View>
              ) : (
                <View style={styles.storeList}>
                  {stores.map((store) => (
                    <Pressable
                      key={store.id}
                      style={({ pressed }) => [
                        styles.storeOption,
                        {
                          backgroundColor: selectedStore?.id === store.id ? accentColor + "15" : colors.surface,
                          borderColor: selectedStore?.id === store.id ? accentColor : colors.border,
                        },
                        pressed && { opacity: 0.8 },
                      ]}
                      onPress={() => setSelectedStore(store)}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={20}
                        color={selectedStore?.id === store.id ? accentColor : colors.muted}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.storeName, { color: colors.foreground }]}>{store.name}</Text>
                        {store.address && (
                          <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>
                            {store.address}{store.city ? `, ${store.city}` : ""}
                          </Text>
                        )}
                      </View>
                      {selectedStore?.id === store.id && (
                        <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Exit: show store info */}
          {!isEntry && stores.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Loja</Text>
              </View>
              <View style={[styles.storeOption, { backgroundColor: accentColor + "10", borderColor: accentColor }]}>
                <Ionicons name="storefront-outline" size={20} color={accentColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.storeName, { color: colors.foreground }]}>{stores[0].name}</Text>
                  {stores[0].address && (
                    <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>
                      {stores[0].address}{stores[0].city ? `, ${stores[0].city}` : ""}
                    </Text>
                  )}
                </View>
                <Ionicons name="checkmark-circle" size={20} color={accentColor} />
              </View>
            </View>
          )}

          {/* Step 2: Photo */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.stepBadgeText}>{isEntry ? "2" : "2"}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Foto do Ponto Eletrônico
              </Text>
            </View>

            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo.uri }} style={styles.photoImage} contentFit="cover" />
                <Pressable
                  style={[styles.retakeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => setPhoto(null)}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.foreground} />
                  <Text style={[styles.retakeBtnText, { color: colors.foreground }]}>Trocar foto</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <Pressable
                  style={({ pressed }) => [
                    styles.photoBtn,
                    { backgroundColor: accentColor, opacity: pressed || pickingPhoto ? 0.8 : 1 },
                  ]}
                  onPress={() => handlePickPhoto("camera")}
                  disabled={pickingPhoto}
                >
                  {pickingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
                  )}
                  <Text style={styles.photoBtnText}>Tirar Foto</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.photoBtn,
                    styles.photoBtnOutline,
                    { borderColor: accentColor, opacity: pressed || pickingPhoto ? 0.8 : 1 },
                  ]}
                  onPress={() => handlePickPhoto("gallery")}
                  disabled={pickingPhoto}
                >
                  <Ionicons name="images-outline" size={22} color={accentColor} />
                  <Text style={[styles.photoBtnText, { color: accentColor }]}>Galeria</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleConfirm}
          >
            <Ionicons name={isEntry ? "log-in-outline" : "log-out-outline"} size={22} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              {isEntry ? "Confirmar Entrada" : "Confirmar Saída"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ClockScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager" || appRole === "master";

  const [registering, setRegistering] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEntryType, setModalEntryType] = useState<"entry" | "exit">("entry");

  const utils = trpc.useUtils();
  const { data: lastEntry, isSuccess: lastEntryLoaded } = trpc.timeEntries.lastOpenEntry.useQuery();
  const { data: dailySummary, refetch: refetchSummary } = trpc.timeEntries.dailySummary.useQuery({ date: selectedDate.toISOString() });
  const { data: allEntries } = trpc.timeEntries.allForDate.useQuery({ date: selectedDate.toISOString() }, { enabled: isManager });
  const { data: myEntries, refetch: refetchMy } = trpc.timeEntries.list.useQuery({ startDate: selectedDate.toISOString(), endDate: selectedDate.toISOString() }, { enabled: !isManager });

  // Promoters see only their assigned stores; managers see all stores
  const { data: promoterStores } = trpc.stores.listForPromoter.useQuery(undefined, { enabled: !isManager });
  const { data: allStores } = trpc.stores.list.useQuery(undefined, { enabled: isManager });
  const stores = (isManager ? allStores : promoterStores) ?? [];

  const createEntryMutation = trpc.timeEntries.create.useMutation();

  // Persist open entry state locally so it survives app restarts
  const [localHasOpenEntry, setLocalHasOpenEntry] = useState<boolean | null>(null);
  const [localOpenStoreId, setLocalOpenStoreId] = useState<number | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(OPEN_ENTRY_KEY).then((val) => {
      if (val !== null) setLocalHasOpenEntry(val === "true");
    });
    AsyncStorage.getItem(OPEN_ENTRY_STORE_KEY).then((val) => {
      if (val !== null) setLocalOpenStoreId(Number(val));
    });
  }, []);

  // Only sync to AsyncStorage after the server has successfully responded
  useEffect(() => {
    if (lastEntryLoaded) {
      const isOpen = !!lastEntry;
      setLocalHasOpenEntry(isOpen);
      AsyncStorage.setItem(OPEN_ENTRY_KEY, String(isOpen));
      if (isOpen && lastEntry?.storeId) {
        setLocalOpenStoreId(lastEntry.storeId);
        AsyncStorage.setItem(OPEN_ENTRY_STORE_KEY, String(lastEntry.storeId));
      } else if (!isOpen) {
        setLocalOpenStoreId(null);
        AsyncStorage.removeItem(OPEN_ENTRY_STORE_KEY);
      }
    }
  }, [lastEntry, lastEntryLoaded]);

  // Use server data when available, fall back to local cache
  const hasOpenEntry = lastEntry !== undefined ? !!lastEntry : (localHasOpenEntry ?? false);
  const displayEntries = isManager ? allEntries : myEntries;

  const openModal = (type: "entry" | "exit") => {
    setModalEntryType(type);
    setModalVisible(true);
  };

  const handleConfirmEntry = async (storeId: number, photoBase64: string, photoFileType: string) => {
    setModalVisible(false);
    setRegistering(true);

    const entryType = modalEntryType;

    try {
      await createEntryMutation.mutateAsync({
        storeId,
        entryType,
        photoBase64: photoBase64 || undefined,
        photoFileType: photoFileType || undefined,
      });

      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local state immediately so the button switches without waiting for server refetch
      if (entryType === "entry") {
        setLocalHasOpenEntry(true);
        setLocalOpenStoreId(storeId);
        AsyncStorage.setItem(OPEN_ENTRY_KEY, "true");
        AsyncStorage.setItem(OPEN_ENTRY_STORE_KEY, String(storeId));
      } else {
        setLocalHasOpenEntry(false);
        setLocalOpenStoreId(null);
        AsyncStorage.setItem(OPEN_ENTRY_KEY, "false");
        AsyncStorage.removeItem(OPEN_ENTRY_STORE_KEY);
      }

      // Invalidate all time entry queries so the button state updates immediately
      await utils.timeEntries.lastOpenEntry.invalidate();
      await utils.timeEntries.dailySummary.invalidate();
      await utils.timeEntries.list.invalidate();

      if (Platform.OS === "web") {
        // Alert.alert doesn't work on web — show nothing (state update is enough)
      } else {
        Alert.alert("✅ Registrado!", `${entryType === "entry" ? "Entrada" : "Saída"} registrada com sucesso!`);
      }
    } catch (err: any) {
      if (Platform.OS !== "web") await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message ?? "Não foi possível registrar o ponto. Tente novamente.";
      if (Platform.OS !== "web") Alert.alert("Erro", msg);
    } finally {
      setRegistering(false);
    }
  };

  // For exit: use the store from the last open entry (server or local cache)
  const openStoreId = lastEntry?.storeId ?? localOpenStoreId;
  // Fallback: if stores list hasn't loaded yet but we know the storeId, create a minimal store object
  const exitStore = stores.find((s) => s.id === openStoreId)
    ?? (stores.length > 0 ? stores[0] : null)
    ?? (openStoreId ? { id: openStoreId, name: "Loja" } : null);

  const formatTime = (date: Date | string) => new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (date: Date) => date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
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

      {/* Promoter Clock In/Out Buttons */}
      {!isManager && isToday && (
        <View style={styles.clockSection}>
          {registering ? (
            <View style={[styles.registeringCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.registeringText, { color: colors.foreground }]}>Registrando ponto...</Text>
            </View>
          ) : (
            <View style={styles.clockButtons}>
              {/* Entry Button — shown when no open entry */}
              {!hasOpenEntry && (
                <Pressable
                  style={({ pressed }) => [
                    styles.clockBtn,
                    { backgroundColor: "#0E9F6E" },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                  onPress={() => openModal("entry")}
                >
                  <Ionicons name="log-in-outline" size={28} color="#FFFFFF" />
                  <Text style={styles.clockBtnText}>Registrar Entrada</Text>
                </Pressable>
              )}

              {/* Exit Button — shown when there is an open entry */}
              {hasOpenEntry && (
                <Pressable
                  style={({ pressed }) => [
                    styles.clockBtn,
                    { backgroundColor: "#EF4444" },
                    pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 },
                  ]}
                  onPress={() => openModal("exit")}
                >
                  <Ionicons name="log-out-outline" size={28} color="#FFFFFF" />
                  <Text style={styles.clockBtnText}>Registrar Saída</Text>
                </Pressable>
              )}
            </View>
          )}

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
              {(item as any).storeName && (
                <Text style={[styles.entryStore, { color: colors.muted }]} numberOfLines={1}>
                  {(item as any).storeName}
                </Text>
              )}
            </View>
            {(item as any).photoUrl && (
              <Image
                source={{ uri: (item as any).photoUrl }}
                style={styles.entryPhoto}
                contentFit="cover"
              />
            )}
          </View>
        )}
      />

      {/* Entry Modal */}
      <ClockEntryModal
        visible={modalVisible && modalEntryType === "entry"}
        entryType="entry"
        stores={stores as Store[]}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmEntry}
      />

      {/* Exit Modal — auto-fills store from last open entry */}
      <ClockEntryModal
        visible={modalVisible && modalEntryType === "exit"}
        entryType="exit"
        stores={exitStore ? [exitStore] : (stores as Store[])}
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmEntry}
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
  clockButtons: { gap: 10 },
  clockBtn: { borderRadius: 20, paddingVertical: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  clockBtnText: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  registeringCard: { borderRadius: 16, padding: 24, alignItems: "center", gap: 12, borderWidth: 1 },
  registeringText: { fontSize: 16, fontWeight: "600" },
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
  entryStore: { fontSize: 12, marginTop: 2 },
  entryPhoto: { width: 48, height: 48, borderRadius: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalContent: { padding: 20, gap: 24 },
  modalFooter: { padding: 20, borderTopWidth: 1 },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  storeList: { gap: 8 },
  storeOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeAddress: { fontSize: 12, marginTop: 2 },
  emptyStores: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyStoresText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  photoButtons: { flexDirection: "row", gap: 10 },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  photoBtnOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  photoBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  photoPreview: { gap: 10 },
  photoImage: { width: "100%", height: 200, borderRadius: 14 },
  retakeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  retakeBtnText: { fontSize: 14, fontWeight: "500" },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18 },
  confirmBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
});
