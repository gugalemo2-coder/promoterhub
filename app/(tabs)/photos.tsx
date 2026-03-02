import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { useOfflineQueue } from "@/hooks/use-offline-queue";
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
  View,
} from "react-native";

type PickedPhoto = { base64: string; fileType: string; uri: string };

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({
  visible,
  brands,
  stores,
  uploading,
  onClose,
  onUpload,
}: {
  visible: boolean;
  brands: Array<{ id: number; name: string; colorHex?: string | null }>;
  stores: Array<{ id: number; name: string; address?: string | null; city?: string | null }>;
  uploading: boolean;
  onClose: () => void;
  onUpload: (brandId: number, storeId: number, photos: PickedPhoto[]) => void;
}) {
  const colors = useColors();
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [pickedPhotos, setPickedPhotos] = useState<PickedPhoto[]>([]);
  const [picking, setPicking] = useState(false);

  const handleClose = () => {
    setSelectedBrandId(null);
    setSelectedStoreId(null);
    setPickedPhotos([]);
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

  const removePhoto = (index: number) => {
    setPickedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!selectedBrandId) {
      Alert.alert("Selecione a marca", "É necessário selecionar a marca das fotos.");
      return;
    }
    if (!selectedStoreId) {
      Alert.alert("Selecione a loja", "É necessário selecionar a loja de onde são as fotos.");
      return;
    }
    if (pickedPhotos.length === 0) {
      Alert.alert("Nenhuma foto", "Adicione pelo menos uma foto antes de enviar.");
      return;
    }
    onUpload(selectedBrandId, selectedStoreId, pickedPhotos);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.modal, { backgroundColor: colors.background }]}>
        {/* Modal Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={handleClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="close" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Enviar Fotos</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Step 1: Brand */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>1</Text>
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

          {/* Step 2: Store */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>2</Text>
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.storeName, { color: colors.foreground }]}>{store.name}</Text>
                      {store.address && (
                        <Text style={[styles.storeAddress, { color: colors.muted }]} numberOfLines={1}>
                          {store.address}{store.city ? `, ${store.city}` : ""}
                        </Text>
                      )}
                    </View>
                    {selectedStoreId === store.id && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          {/* Step 3: Photos */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Fotos {pickedPhotos.length > 0 ? `(${pickedPhotos.length})` : ""}
              </Text>
            </View>

            {/* Photo action buttons */}
            <View style={styles.photoButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.photoBtn,
                  { backgroundColor: colors.primary, opacity: pressed || picking ? 0.8 : 1 },
                ]}
                onPress={handlePickFromCamera}
                disabled={picking}
              >
                {picking ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                )}
                <Text style={styles.photoBtnText}>Câmera</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.photoBtn,
                  styles.photoBtnOutline,
                  { borderColor: colors.primary, opacity: pressed || picking ? 0.8 : 1 },
                ]}
                onPress={handlePickFromGallery}
                disabled={picking}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={[styles.photoBtnText, { color: colors.primary }]}>Galeria</Text>
              </Pressable>
            </View>

            {/* Photo previews */}
            {pickedPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoPreviewScroll}>
                {pickedPhotos.map((photo, index) => (
                  <View key={index} style={styles.photoPreviewItem}>
                    <Image source={{ uri: photo.uri }} style={styles.photoPreviewThumb} contentFit="cover" />
                    <Pressable
                      style={styles.photoRemoveBtn}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={22} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </ScrollView>

        {/* Confirm Button */}
        <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: colors.primary, opacity: pressed || uploading ? 0.85 : 1 },
            ]}
            onPress={handleConfirm}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
            )}
            <Text style={styles.confirmBtnText}>
              {uploading ? "Enviando..." : `Enviar ${pickedPhotos.length > 1 ? `${pickedPhotos.length} Fotos` : "Foto"}`}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PhotosScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager" || appRole === "master";

  const [filterBrandId, setFilterBrandId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<"pending" | "approved" | "rejected" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const { data: brands } = trpc.brands.list.useQuery();
  // Promoters see only their assigned stores; managers see all
  const { data: promoterStores } = trpc.stores.listForPromoter.useQuery(undefined, { enabled: !isManager });
  const { data: allStores } = trpc.stores.list.useQuery(undefined, { enabled: isManager });
  const stores = (isManager ? allStores : promoterStores) ?? [];

  const { data: photos, refetch: refetchPhotos } = trpc.photos.listAll.useQuery(
    { brandId: filterBrandId ?? undefined, status: filterStatus ?? undefined, limit: 50 },
    { enabled: isManager }
  );
  const { data: myPhotos, refetch: refetchMyPhotos } = trpc.photos.list.useQuery(
    { brandId: filterBrandId ?? undefined, status: filterStatus ?? undefined, limit: 50 },
    { enabled: !isManager }
  );
  const uploadMutation = trpc.photos.upload.useMutation();
  const updateStatusMutation = trpc.photos.updateStatus.useMutation();
  const { isOnline, enqueue } = useOfflineQueue();

  const displayPhotos = isManager ? photos : myPhotos;

  const photoCountByBrand = (displayPhotos ?? []).reduce<Record<number, number>>((acc, p) => {
    acc[p.brandId] = (acc[p.brandId] ?? 0) + 1;
    return acc;
  }, {});
  const totalPhotos = (displayPhotos ?? []).length;

  const handleUpload = async (brandId: number, storeId: number, pickedPhotos: PickedPhoto[]) => {
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const photo of pickedPhotos) {
      try {
        if (!isOnline) {
          await enqueue("photo_upload", {
            brandId,
            storeId,
            photoBase64: photo.base64,
            fileType: photo.fileType,
          });
          successCount++;
        } else {
          await uploadMutation.mutateAsync({
            brandId,
            storeId,
            fileBase64: photo.base64,
            fileType: photo.fileType,
            fileName: `photo_${Date.now()}.jpg`,
          });
          successCount++;
        }
      } catch {
        // Fallback to offline queue
        try {
          await enqueue("photo_upload", { brandId, storeId, photoBase64: photo.base64, fileType: photo.fileType });
          successCount++;
        } catch {
          failCount++;
        }
      }
    }

    setUploading(false);
    setUploadModalVisible(false);
    setModalKey((k) => k + 1);

    if (!isOnline) {
      Alert.alert("📥 Salvo offline", `${successCount} foto(s) salva(s) localmente. Serão enviadas quando você reconectar.`);
    } else if (failCount === 0) {
      Alert.alert("✅ Sucesso!", `${successCount} foto(s) enviada(s) com sucesso.`);
    } else {
      Alert.alert("Parcialmente enviado", `${successCount} foto(s) enviada(s). ${failCount} falhou(aram).`);
    }

    isManager ? refetchPhotos() : refetchMyPhotos();
  };

  const handleUpdateStatus = async (photoId: number, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id: photoId, status });
      refetchPhotos();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o status.");
    }
  };

  const statusColor = (status: string) => {
    if (status === "approved") return "#0E9F6E";
    if (status === "rejected") return "#E02424";
    return "#D97706";
  };

  const statusLabel = (status: string) => {
    if (status === "approved") return "Aprovada";
    if (status === "rejected") return "Reprovada";
    return "Pendente";
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>{isManager ? "Galeria de Fotos" : "Minhas Fotos"}</Text>
        {!isManager && (
          <Pressable
            style={({ pressed }) => [styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.2)" }, pressed && { opacity: 0.7 }]}
            onPress={() => setUploadModalVisible(true)}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
            )}
          </Pressable>
        )}
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterContent}
      >
        {([
          { key: null, label: "Todos", color: colors.primary },
          { key: "pending" as const, label: "Pendente", color: colors.warning },
          { key: "approved" as const, label: "Aprovada", color: colors.success },
          { key: "rejected" as const, label: "Rejeitada", color: colors.error },
        ]).map(({ key, label, color }) => {
          const isActive = filterStatus === key;
          return (
            <Pressable
              key={String(key)}
              style={({ pressed }) => [
                styles.chip,
                isActive
                  ? { backgroundColor: color }
                  : { backgroundColor: color + "18", borderColor: color + "60", borderWidth: 1 },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setFilterStatus(key)}
            >
              <Text style={[styles.chipText, { color: isActive ? "#fff" : color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Brand Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={({ pressed }) => [
            styles.chip,
            !filterBrandId
              ? { backgroundColor: colors.primary }
              : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
            pressed && { opacity: 0.75 },
          ]}
          onPress={() => setFilterBrandId(null)}
        >
          <Text style={[styles.chipText, { color: !filterBrandId ? "#fff" : colors.muted }]}>Todas</Text>
          {totalPhotos > 0 && (
            <View style={[styles.chipBadge, { backgroundColor: !filterBrandId ? "rgba(255,255,255,0.3)" : colors.border }]}>
              <Text style={[styles.chipBadgeText, { color: !filterBrandId ? "#fff" : colors.muted }]}>{totalPhotos}</Text>
            </View>
          )}
        </Pressable>

        {brands?.map((brand) => {
          const isActive = filterBrandId === brand.id;
          const brandColor = brand.colorHex ?? colors.primary;
          const count = photoCountByBrand[brand.id] ?? 0;
          return (
            <Pressable
              key={brand.id}
              style={({ pressed }) => [
                styles.chip,
                isActive
                  ? { backgroundColor: brandColor }
                  : { backgroundColor: brandColor + "18", borderColor: brandColor + "50", borderWidth: 1 },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setFilterBrandId(brand.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: isActive ? "rgba(255,255,255,0.7)" : brandColor }]} />
              <Text style={[styles.chipText, { color: isActive ? "#fff" : brandColor }]}>{brand.name}</Text>
              {count > 0 && (
                <View style={[styles.chipBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.25)" : brandColor + "30" }]}>
                  <Text style={[styles.chipBadgeText, { color: isActive ? "#fff" : brandColor }]}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Photos Grid */}
      {!displayPhotos || displayPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma foto ainda</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            {isManager ? "Aguardando envio pelos promotores" : "Toque no ícone de câmera para enviar fotos"}
          </Text>
          {!isManager && (
            <Pressable
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => setUploadModalVisible(true)}
            >
              <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Enviar Fotos</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <FlatList
          data={displayPhotos}
          numColumns={2}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <View style={[styles.photoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Image
                source={{ uri: item.photoUrl }}
                style={styles.photoThumb}
                contentFit="cover"
              />
              <View style={styles.photoInfo}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={[styles.photoDate, { color: colors.muted }]}>
                  {new Date(item.photoTimestamp).toLocaleDateString("pt-BR")}
                </Text>
                {isManager && item.status === "pending" && (
                  <View style={styles.photoActions}>
                    <Pressable
                      style={[styles.photoActionBtn, { backgroundColor: "#0E9F6E20" }]}
                      onPress={() => handleUpdateStatus(item.id, "approved")}
                    >
                      <Ionicons name="checkmark" size={16} color="#0E9F6E" />
                    </Pressable>
                    <Pressable
                      style={[styles.photoActionBtn, { backgroundColor: "#E0242420" }]}
                      onPress={() => handleUpdateStatus(item.id, "rejected")}
                    >
                      <Ionicons name="close" size={16} color="#E02424" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        key={modalKey}
        visible={uploadModalVisible}
        brands={brands ?? []}
        stores={stores as any[]}
        uploading={uploading}
        onClose={() => setUploadModalVisible(false)}
        onUpload={handleUpload}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerBtn: { padding: 8, borderRadius: 10 },
  filterBar: { borderBottomWidth: 0.5, maxHeight: 60 },
  filterContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 13, fontWeight: "600" },
  chipBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 },
  chipBadgeText: { fontSize: 10, fontWeight: "700" },
  grid: { padding: 12 },
  gridRow: { gap: 12, marginBottom: 12 },
  photoCard: { flex: 1, borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  photoThumb: { width: "100%", aspectRatio: 1 },
  photoInfo: { padding: 10, gap: 6 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  photoDate: { fontSize: 11 },
  photoActions: { flexDirection: "row", gap: 8 },
  photoActionBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 6, borderRadius: 8 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnText: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  storeList: { gap: 8 },
  storeOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  storeName: { fontSize: 15, fontWeight: "600" },
  storeAddress: { fontSize: 12, marginTop: 2 },
  emptyInfo: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: "center", gap: 8 },
  emptyInfoText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  photoButtons: { flexDirection: "row", gap: 10 },
  photoBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  photoBtnOutline: { backgroundColor: "transparent", borderWidth: 1.5 },
  photoBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  photoPreviewScroll: { marginTop: 4 },
  photoPreviewItem: { marginRight: 10, position: "relative" },
  photoPreviewThumb: { width: 80, height: 80, borderRadius: 10 },
  photoRemoveBtn: { position: "absolute", top: -6, right: -6 },
  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 18 },
  confirmBtnText: { fontSize: 17, fontWeight: "700", color: "#FFFFFF" },
});
