import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useState } from "react";
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
import { ScreenContainer } from "@/components/screen-container";

type PickedPhoto = { base64: string; fileType: string; uri: string };

// ─── Submit Modal ─────────────────────────────────────────────────────────────
function SubmitModal({
  visible,
  brands,
  stores,
  submitting,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  brands: Array<{ id: number; name: string; colorHex?: string | null }>;
  stores: Array<{ id: number; name: string }>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (brandId: number, storeId: number, photos: PickedPhoto[], description: string) => void;
}) {
  const colors = useColors();
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [pickedPhotos, setPickedPhotos] = useState<PickedPhoto[]>([]);
  const [description, setDescription] = useState("");
  const [picking, setPicking] = useState(false);

  const handleClose = () => {
    setSelectedBrandId(null);
    setSelectedStoreId(null);
    setPickedPhotos([]);
    setDescription("");
    onClose();
  };

  const handlePickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário acesso à câmera para tirar fotos.");
      return;
    }
    setPicking(true);
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    setPicking(false);
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    setPickedPhotos((prev) => [...prev, { base64: asset.base64!, fileType: asset.mimeType ?? "image/jpeg", uri: asset.uri }]);
  };

  const handlePickFromGallery = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão negada", "É necessário acesso à galeria de fotos.");
        return;
      }
    }
    setPicking(true);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
      allowsMultipleSelection: true,
    });
    setPicking(false);
    if (result.canceled || !result.assets.length) return;
    const newPhotos: PickedPhoto[] = result.assets
      .filter((a) => a.base64)
      .map((a) => ({ base64: a.base64!, fileType: a.mimeType ?? "image/jpeg", uri: a.uri }));
    setPickedPhotos((prev) => [...prev, ...newPhotos]);
  };

  const handleConfirm = () => {
    if (!selectedBrandId) {
      Alert.alert("Selecione a marca", "É necessário selecionar a marca.");
      return;
    }
    if (!selectedStoreId) {
      Alert.alert("Selecione a loja", "É necessário selecionar a loja.");
      return;
    }
    if (pickedPhotos.length === 0) {
      Alert.alert("Nenhuma foto", "Adicione pelo menos uma foto antes de enviar.");
      return;
    }
    onSubmit(selectedBrandId, selectedStoreId, pickedPhotos, description);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Registrar Vencimento</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Step 1: Fotos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fotos dos Produtos</Text>
            </View>
            <View style={styles.photoPickerRow}>
              <Pressable
                style={({ pressed }) => [styles.photoPickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                onPress={handlePickFromCamera}
                disabled={picking}
              >
                <Ionicons name="camera-outline" size={22} color={colors.primary} />
                <Text style={[styles.photoPickerLabel, { color: colors.foreground }]}>Câmera</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.photoPickerBtn, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.7 }]}
                onPress={handlePickFromGallery}
                disabled={picking}
              >
                <Ionicons name="images-outline" size={22} color={colors.primary} />
                <Text style={[styles.photoPickerLabel, { color: colors.foreground }]}>Galeria</Text>
              </Pressable>
            </View>
            {pickedPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewRow}>
                {pickedPhotos.map((p, i) => (
                  <View key={i} style={styles.photoThumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.photoThumb} contentFit="cover" />
                    <Pressable
                      style={styles.photoRemoveBtn}
                      onPress={() => setPickedPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Step 2: Marca */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Selecione a Marca</Text>
            </View>
            <View style={styles.chipRow}>
              {brands.map((brand) => {
                const isActive = selectedBrandId === brand.id;
                const brandColor = brand.colorHex ?? colors.primary;
                return (
                  <Pressable
                    key={brand.id}
                    style={({ pressed }) => [
                      styles.chip,
                      isActive
                        ? { backgroundColor: brandColor }
                        : { backgroundColor: brandColor + "15", borderColor: brandColor + "60", borderWidth: 1 },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedBrandId(brand.id)}
                  >
                    <Text style={[styles.chipText, { color: isActive ? "#FFFFFF" : brandColor }]}>{brand.name}</Text>
                    {isActive && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Step 3: Loja */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Selecione a Loja</Text>
            </View>
            {stores.length === 0 ? (
              <View style={[styles.emptyInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="storefront-outline" size={28} color={colors.muted} />
                <Text style={[styles.emptyInfoText, { color: colors.muted }]}>
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
                        backgroundColor: selectedStoreId === store.id ? colors.primary + "15" : colors.surface,
                        borderColor: selectedStoreId === store.id ? colors.primary : colors.border,
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                    onPress={() => setSelectedStoreId(store.id)}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={selectedStoreId === store.id ? colors.primary : colors.muted}
                    />
                    <Text style={[styles.storeName, { color: colors.foreground }]}>{store.name}</Text>
                    {selectedStoreId === store.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Step 4: Descrição */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Descrição (opcional)</Text>
            </View>
            <TextInput
              style={[styles.descInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Informe detalhes sobre os produtos vencidos ou próximos ao vencimento..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Confirm Button */}
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: submitting ? colors.muted : colors.primary },
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleConfirm}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.confirmBtnText}>Enviar Registro</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────
function statusColor(status: string) {
  if (status === "approved") return "#0E9F6E";
  if (status === "rejected") return "#E02424";
  return "#D97706";
}
function statusLabel(status: string) {
  if (status === "approved") return "Aprovado";
  if (status === "rejected") return "Recusado";
  return "Pendente";
}
function statusIcon(status: string): "checkmark-circle" | "close-circle" | "time" {
  if (status === "approved") return "checkmark-circle";
  if (status === "rejected") return "close-circle";
  return "time";
}

// ─── History Card ─────────────────────────────────────────────────────────────
function ExpirationCard({
  item,
  colors,
}: {
  item: {
    id: number;
    brandName: string | null;
    storeName: string | null;
    description: string | null;
    status: string;
    managerNotes: string | null;
    createdAt: Date | string;
    photos: { id: number; photoUrl: string; sortOrder: number }[];
  };
  colors: ReturnType<typeof useColors>;
}) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const date = new Date(item.createdAt);
  const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const timeStr = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardBrand, { color: colors.foreground }]}>{item.brandName ?? "—"}</Text>
          <Text style={[styles.cardStore, { color: colors.muted }]}>{item.storeName ?? "—"}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
          <Ionicons name={statusIcon(item.status)} size={14} color={statusColor(item.status)} />
          <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
        </View>
      </View>

      {/* Date */}
      <View style={styles.cardDateRow}>
        <Ionicons name="calendar-outline" size={13} color={colors.muted} />
        <Text style={[styles.cardDate, { color: colors.muted }]}>{dateStr} às {timeStr}</Text>
      </View>

      {/* Photos */}
      {item.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardPhotoRow}>
          {item.photos.map((p, i) => (
            <Pressable key={p.id} onPress={() => setPreviewIndex(i)} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
              <Image source={{ uri: p.photoUrl }} style={styles.cardPhotoThumb} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Description */}
      {item.description ? (
        <Text style={[styles.cardDesc, { color: colors.foreground }]}>{item.description}</Text>
      ) : null}

      {/* Manager Notes */}
      {item.managerNotes ? (
        <View style={[styles.managerNote, { backgroundColor: statusColor(item.status) + "12", borderColor: statusColor(item.status) + "40" }]}>
          <Ionicons name="chatbubble-outline" size={13} color={statusColor(item.status)} />
          <Text style={[styles.managerNoteText, { color: colors.foreground }]}>{item.managerNotes}</Text>
        </View>
      ) : null}

      {/* Photo Preview Modal */}
      {previewIndex !== null && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setPreviewIndex(null)}>
          <View style={styles.previewOverlay}>
            <Pressable style={styles.previewClose} onPress={() => setPreviewIndex(null)}>
              <Ionicons name="close-circle" size={32} color="#FFFFFF" />
            </Pressable>
            <Image source={{ uri: item.photos[previewIndex].photoUrl }} style={styles.previewImage} contentFit="contain" />
            <View style={styles.previewCounter}>
              <Text style={styles.previewCounterText}>{previewIndex + 1} / {item.photos.length}</Text>
            </View>
            {item.photos.length > 1 && (
              <View style={styles.previewNav}>
                <Pressable
                  style={({ pressed }) => [styles.previewNavBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => setPreviewIndex((i) => Math.max(0, (i ?? 0) - 1))}
                  disabled={previewIndex === 0}
                >
                  <Ionicons name="chevron-back" size={28} color={previewIndex === 0 ? "#666" : "#FFF"} />
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.previewNavBtn, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => setPreviewIndex((i) => Math.min(item.photos.length - 1, (i ?? 0) + 1))}
                  disabled={previewIndex === item.photos.length - 1}
                >
                  <Ionicons name="chevron-forward" size={28} color={previewIndex === item.photos.length - 1 ? "#666" : "#FFF"} />
                </Pressable>
              </View>
            )}
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProductExpirationScreen() {
  const colors = useColors();
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | null>(null);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.listForPromoter.useQuery();
  const { data: expirations, refetch } = trpc.productExpirations.list.useQuery({
    status: filterStatus ?? undefined,
    limit: 50,
  });

  const createMutation = trpc.productExpirations.create.useMutation();

  const handleSubmit = async (
    brandId: number,
    storeId: number,
    photos: PickedPhoto[],
    description: string
  ) => {
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        brandId,
        storeId,
        description: description || undefined,
        photos: photos.map((p) => ({
          fileBase64: p.base64,
          fileType: p.fileType,
          fileName: `expiration_${Date.now()}.jpg`,
        })),
      });
      setModalVisible(false);
      refetch();
      Alert.alert("✅ Enviado!", "Registro de vencimento enviado com sucesso.");
    } catch {
      Alert.alert("Erro", "Não foi possível enviar o registro. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusFilters: Array<{ label: string; value: "pending" | "approved" | "rejected" | null }> = [
    { label: "Todos", value: null },
    { label: "Pendentes", value: "pending" },
    { label: "Aprovados", value: "approved" },
    { label: "Recusados", value: "rejected" },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: "#E67E22", paddingTop: 12 }]}>
        <View>
          <Text style={styles.headerTitle}>Vencimento de Produtos</Text>
          <Text style={styles.headerSub}>Registre produtos vencidos ou próximos ao vencimento</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Filters */}
      <View style={[styles.filterBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {statusFilters.map((f) => (
            <Pressable
              key={String(f.value)}
              style={({ pressed }) => [
                styles.filterChip,
                filterStatus === f.value
                  ? { backgroundColor: "#E67E22" }
                  : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => setFilterStatus(f.value)}
            >
              <Text style={[styles.filterChipText, { color: filterStatus === f.value ? "#FFFFFF" : colors.foreground }]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {!expirations ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : expirations.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <Text style={[styles.emptyText, { color: colors.muted }]}>Nenhum registro encontrado</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyBtn, { backgroundColor: "#E67E22", opacity: pressed ? 0.8 : 1 }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.emptyBtnText}>Novo Registro</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={expirations}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ExpirationCard item={item} colors={colors} />
          )}
        />
      )}

      {/* Submit Modal */}
      <SubmitModal
        visible={modalVisible}
        brands={brands ?? []}
        stores={stores ?? []}
        submitting={submitting}
        onClose={() => setModalVisible(false)}
        onSubmit={handleSubmit}
      />
    </ScreenContainer>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  filterBar: { borderBottomWidth: 0.5 },
  filterScroll: { paddingHorizontal: 12, paddingVertical: 10, gap: 8, flexDirection: "row" },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  filterChipText: { fontSize: 13, fontWeight: "500" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 14 },
  list: { padding: 12, gap: 12 },
  // Card
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cardBrand: { fontSize: 15, fontWeight: "700" },
  cardStore: { fontSize: 13, marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardDateRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  cardDate: { fontSize: 12 },
  cardPhotoRow: { marginTop: 2 },
  cardPhotoThumb: { width: 72, height: 72, borderRadius: 8, marginRight: 8 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  managerNote: { flexDirection: "row", alignItems: "flex-start", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  managerNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },
  // Preview
  previewOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  previewClose: { position: "absolute", top: 48, right: 20, zIndex: 10 },
  previewImage: { width: "100%", height: "70%" },
  previewCounter: { position: "absolute", bottom: 80, alignSelf: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  previewCounterText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
  previewNav: { position: "absolute", bottom: 40, flexDirection: "row", gap: 40 },
  previewNavBtn: { padding: 8 },
  // Modal
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalContent: { padding: 16, gap: 8, paddingBottom: 40 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepBadgeText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  sectionTitle: { fontSize: 15, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 13, fontWeight: "600" },
  storeList: { gap: 8 },
  storeOption: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
  storeName: { flex: 1, fontSize: 14, fontWeight: "500" },
  photoPickerRow: { flexDirection: "row", gap: 12 },
  photoPickerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  photoPickerLabel: { fontSize: 14, fontWeight: "500" },
  photoPreviewRow: { marginTop: 4 },
  photoThumbWrap: { position: "relative", marginRight: 8 },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  photoRemoveBtn: { position: "absolute", top: -6, right: -6 },
  descInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 90 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  confirmBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  emptyInfo: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  emptyInfoText: { fontSize: 13, flex: 1, lineHeight: 18 },
});
