import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { Redirect, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
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
  TextInput,
  View,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";

type StoreForm = {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
};

const INITIAL_FORM: StoreForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phone: "",
  latitude: null,
  longitude: null,
};

// Default center: São Paulo
const DEFAULT_REGION: Region = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function StoresScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<StoreForm>(INITIAL_FORM);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [mapStep, setMapStep] = useState(false); // false = form, true = map picker
  const [saving, setSaving] = useState(false);
  const mapRef = useRef<MapView>(null);

  const { data: stores, refetch, isLoading } = trpc.stores.list.useQuery();
  const createMutation = trpc.stores.create.useMutation();

  useEffect(() => {
    if (showModal && !editingId) {
      // Try to get current location to center map
      Location.getForegroundPermissionsAsync().then(({ status }) => {
        if (status === "granted") {
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).then((loc) => {
            setMapRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            });
          }).catch(() => {});
        }
      });
    }
  }, [showModal, editingId]);

  if (appRole !== "manager" && appRole !== "master") {
    return <Redirect href="/(tabs)" />;
  }

  const openCreate = () => {
    setForm(INITIAL_FORM);
    setEditingId(null);
    setMapStep(false);
    setShowModal(true);
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setForm((f) => ({ ...f, latitude, longitude }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert("Campo obrigatório", "O nome da loja é obrigatório.");
      return;
    }
    if (!form.latitude || !form.longitude) {
      Alert.alert("Localização obrigatória", "Toque no mapa para definir a localização da loja.");
      return;
    }
    setSaving(true);
    try {
      await createMutation.mutateAsync({
        name: form.name.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        address: form.address || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        phone: form.phone || undefined,
      });
      await refetch();
      setShowModal(false);
      Alert.alert("Sucesso", "Loja cadastrada com sucesso!");
    } catch (err: any) {
      Alert.alert("Erro", err.message ?? "Não foi possível salvar a loja.");
    } finally {
      setSaving(false);
    }
  };

  const centerOnMarker = () => {
    if (form.latitude && form.longitude && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: form.latitude,
        longitude: form.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.headerTitle}>Lojas / PDVs</Text>
          <Text style={styles.headerSub}>{stores?.length ?? 0} loja(s) cadastrada(s)</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
          onPress={openCreate}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Nova Loja</Text>
        </Pressable>
      </View>

      {/* Store List */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="storefront-outline" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma loja cadastrada</Text>
              <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                Toque em "Nova Loja" para cadastrar o primeiro PDV
              </Text>
              <Pressable
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={openCreate}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Cadastrar Loja</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.storeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.storeIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="storefront-outline" size={26} color={colors.primary} />
              </View>
              <View style={styles.storeInfo}>
                <Text style={[styles.storeName, { color: colors.foreground }]}>{item.name}</Text>
                {item.address && (
                  <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>
                    {item.address}{item.city ? `, ${item.city}` : ""}{item.state ? ` - ${item.state}` : ""}
                  </Text>
                )}
                <View style={styles.storeCoords}>
                  <Ionicons name="location-outline" size={12} color={colors.muted} />
                  <Text style={[styles.storeCoordsText, { color: colors.muted }]}>
                    {parseFloat(item.latitude).toFixed(4)}, {parseFloat(item.longitude).toFixed(4)}
                  </Text>
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "active" ? "#D1FAE5" : "#FEE2E2" }]}>
                <Text style={[styles.statusText, { color: item.status === "active" ? "#065F46" : "#991B1B" }]}>
                  {item.status === "active" ? "Ativa" : "Inativa"}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => { if (mapStep) { setMapStep(false); } else { setShowModal(false); } }}>
              <Ionicons name={mapStep ? "arrow-back" : "close"} size={24} color={colors.foreground} />
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>
              {mapStep ? "Selecionar Localização" : "Nova Loja"}
            </Text>
            {mapStep ? (
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: form.latitude ? colors.primary : colors.border }]}
                onPress={() => { if (form.latitude) setMapStep(false); }}
                disabled={!form.latitude}
              >
                <Text style={[styles.confirmBtnText, { color: form.latitude ? "#FFFFFF" : colors.muted }]}>Confirmar</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.confirmBtn, { backgroundColor: saving ? colors.border : colors.primary }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.confirmBtnText}>Salvar</Text>}
              </Pressable>
            )}
          </View>

          {mapStep ? (
            /* MAP PICKER */
            <View style={styles.mapContainer}>
              <View style={[styles.mapHint, { backgroundColor: colors.surface }]}>
                <Ionicons name="hand-left-outline" size={16} color={colors.primary} />
                <Text style={[styles.mapHintText, { color: colors.foreground }]}>
                  Toque no mapa para marcar a localização da loja
                </Text>
              </View>
              <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton
              >
                {form.latitude && form.longitude && (
                  <>
                    <Marker
                      coordinate={{ latitude: form.latitude, longitude: form.longitude }}
                      title={form.name || "Nova Loja"}
                      pinColor={colors.primary}
                    />
                    <Circle
                      center={{ latitude: form.latitude, longitude: form.longitude }}
                      radius={5000}
                      strokeColor={colors.primary + "80"}
                      fillColor={colors.primary + "15"}
                      strokeWidth={2}
                    />
                  </>
                )}
              </MapView>
              {form.latitude && form.longitude && (
                <View style={[styles.coordsOverlay, { backgroundColor: colors.surface }]}>
                  <Ionicons name="location" size={14} color={colors.primary} />
                  <Text style={[styles.coordsText, { color: colors.foreground }]}>
                    {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
                  </Text>
                  <Pressable onPress={centerOnMarker}>
                    <Ionicons name="locate-outline" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            /* FORM */
            <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Nome da Loja *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Supermercado Central"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />

              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Endereço</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={form.address}
                onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
                placeholder="Rua, número"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />

              <View style={styles.row}>
                <View style={styles.flex2}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Cidade</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={form.city}
                    onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
                    placeholder="São Paulo"
                    placeholderTextColor={colors.muted}
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>UF</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={form.state}
                    onChangeText={(v) => setForm((f) => ({ ...f, state: v.toUpperCase().slice(0, 2) }))}
                    placeholder="SP"
                    placeholderTextColor={colors.muted}
                    maxLength={2}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>CEP</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={form.zipCode}
                    onChangeText={(v) => setForm((f) => ({ ...f, zipCode: v }))}
                    placeholder="00000-000"
                    placeholderTextColor={colors.muted}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                </View>
                <View style={styles.flex1}>
                  <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Telefone</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={form.phone}
                    onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
                    placeholder="(11) 99999-9999"
                    placeholderTextColor={colors.muted}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              {/* Location Picker */}
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Localização no Mapa *</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.locationBtn,
                  { backgroundColor: form.latitude ? "#D1FAE5" : colors.surface, borderColor: form.latitude ? "#059669" : colors.border },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setMapStep(true)}
              >
                <Ionicons
                  name={form.latitude ? "checkmark-circle" : "map-outline"}
                  size={22}
                  color={form.latitude ? "#059669" : colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locationBtnTitle, { color: form.latitude ? "#065F46" : colors.foreground }]}>
                    {form.latitude ? "Localização definida" : "Selecionar no mapa"}
                  </Text>
                  {form.latitude && (
                    <Text style={[styles.locationBtnSub, { color: "#059669" }]}>
                      {form.latitude.toFixed(5)}, {form.longitude!.toFixed(5)} · Raio: 5 km
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>

              <Text style={[styles.hint, { color: colors.muted }]}>
                * O raio de 5 km será usado para validar o registro de ponto dos promotores.
              </Text>
            </ScrollView>
          )}
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: 16, gap: 12 },
  storeCard: { borderRadius: 14, padding: 14, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  storeIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  storeInfo: { flex: 1, gap: 4 },
  storeName: { fontSize: 15, fontWeight: "700" },
  storeAddress: { fontSize: 13 },
  storeCoords: { flexDirection: "row", alignItems: "center", gap: 4 },
  storeCoordsText: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: "600" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  confirmBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, minWidth: 70, alignItems: "center" },
  confirmBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  // Form
  formScroll: { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  row: { flexDirection: "row", gap: 12 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  locationBtn: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  locationBtnTitle: { fontSize: 15, fontWeight: "600" },
  locationBtnSub: { fontSize: 12, marginTop: 2 },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  // Map
  mapContainer: { flex: 1, position: "relative" },
  map: { flex: 1 },
  mapHint: { position: "absolute", top: 12, left: 16, right: 16, zIndex: 10, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  mapHintText: { fontSize: 13, flex: 1 },
  coordsOverlay: { position: "absolute", bottom: 20, left: 16, right: 16, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  coordsText: { fontSize: 13, flex: 1, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
});
