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
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function PhotosScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager";

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.list.useQuery();
  const { data: photos, refetch: refetchPhotos } = trpc.photos.listAll.useQuery(
    { brandId: selectedBrandId ?? undefined, limit: 50 },
    { enabled: isManager }
  );
  const { data: myPhotos, refetch: refetchMyPhotos } = trpc.photos.list.useQuery(
    { brandId: selectedBrandId ?? undefined, limit: 50 },
    { enabled: !isManager }
  );
  const uploadMutation = trpc.photos.upload.useMutation();
  const updateStatusMutation = trpc.photos.updateStatus.useMutation();
  const { isOnline, enqueue } = useOfflineQueue();

  const displayPhotos = isManager ? photos : myPhotos;

  const handleTakePhoto = async () => {
    if (!selectedBrandId) {
      Alert.alert("Selecione uma marca", "Por favor, selecione uma marca antes de tirar a foto.");
      return;
    }
    if (!stores || stores.length === 0) {
      Alert.alert("Sem loja", "Nenhuma loja cadastrada. Contate o gestor.");
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário acesso à câmera para tirar fotos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      exif: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("Erro", "Não foi possível processar a imagem.");
      return;
    }

    setUploading(true);
    try {
      // Se offline, enfileirar para sincronização posterior
      if (!isOnline) {
        await enqueue("photo_upload", {
          brandId: selectedBrandId,
          storeId: stores[0].id,
          photoBase64: asset.base64,
          fileType: "image/jpeg",
          latitude: asset.exif?.GPSLatitude,
          longitude: asset.exif?.GPSLongitude,
        });
        Alert.alert("📥 Salvo offline", "Foto salva localmente. Será enviada quando você reconectar.");
        setUploading(false);
        return;
      }
      await uploadMutation.mutateAsync({
        brandId: selectedBrandId,
        storeId: stores[0].id,
        fileBase64: asset.base64,
        fileType: "image/jpeg",
        fileName: `photo_${Date.now()}.jpg`,
        latitude: asset.exif?.GPSLatitude,
        longitude: asset.exif?.GPSLongitude,
      });
      Alert.alert("Sucesso!", "Foto enviada com sucesso.");
      isManager ? refetchPhotos() : refetchMyPhotos();
    } catch (err) {
      // Falha de rede — enfileirar offline automaticamente
      await enqueue("photo_upload", {
        brandId: selectedBrandId,
        storeId: stores[0].id,
        photoBase64: asset.base64,
        fileType: "image/jpeg",
        latitude: asset.exif?.GPSLatitude,
        longitude: asset.exif?.GPSLongitude,
      });
      Alert.alert("📥 Salvo offline", "Não foi possível enviar a foto agora. Ela foi salva localmente e será enviada quando a conexão for restaurada.");
    } finally {
      setUploading(false);
    }
  };

  const handlePickPhoto = async () => {
    if (!selectedBrandId) {
      Alert.alert("Selecione uma marca", "Por favor, selecione uma marca antes de enviar a foto.");
      return;
    }
    if (!stores || stores.length === 0) {
      Alert.alert("Sem loja", "Nenhuma loja cadastrada. Contate o gestor.");
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permissão negada", "É necessário acesso à galeria.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) return;

    setUploading(true);
    try {
      // Se offline, enfileirar para sincronização posterior
      if (!isOnline) {
        await enqueue("photo_upload", {
          brandId: selectedBrandId,
          storeId: stores[0].id,
          photoBase64: asset.base64,
          fileType: "image/jpeg",
        });
        Alert.alert("📥 Salvo offline", "Foto salva localmente. Será enviada quando você reconectar.");
        setUploading(false);
        return;
      }
      await uploadMutation.mutateAsync({
        brandId: selectedBrandId,
        storeId: stores[0].id,
        fileBase64: asset.base64,
        fileType: "image/jpeg",
        fileName: `photo_${Date.now()}.jpg`,
      });
      Alert.alert("Sucesso!", "Foto enviada com sucesso.");
      isManager ? refetchPhotos() : refetchMyPhotos();
    } catch (err) {
      // Falha de rede — enfileirar offline automaticamente
      await enqueue("photo_upload", {
        brandId: selectedBrandId,
        storeId: stores[0].id,
        photoBase64: asset.base64,
        fileType: "image/jpeg",
      });
      Alert.alert("📥 Salvo offline", "Não foi possível enviar a foto agora. Ela foi salva localmente e será enviada quando a conexão for restaurada.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateStatus = async (photoId: number, status: "approved" | "rejected") => {
    try {
      await updateStatusMutation.mutateAsync({ id: photoId, status });
      refetchPhotos();
    } catch (err) {
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
          <View style={styles.headerActions}>
            <Pressable
              style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.7 }]}
              onPress={handlePickPhoto}
              disabled={uploading}
            >
              <Ionicons name="images-outline" size={22} color="#FFFFFF" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.headerBtn, { backgroundColor: "rgba(255,255,255,0.2)" }, pressed && { opacity: 0.7 }]}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera-outline" size={22} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        )}
      </View>

      {/* Brand Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.brandFilter, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.brandTab, !selectedBrandId && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setSelectedBrandId(null)}
        >
          <Text style={[styles.brandTabText, { color: !selectedBrandId ? colors.primary : colors.muted }]}>Todas</Text>
        </Pressable>
        {brands?.map((brand) => (
          <Pressable
            key={brand.id}
            style={[styles.brandTab, selectedBrandId === brand.id && { borderBottomColor: brand.colorHex ?? colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setSelectedBrandId(brand.id)}
          >
            <View style={[styles.brandDot, { backgroundColor: brand.colorHex ?? colors.primary }]} />
            <Text style={[styles.brandTabText, { color: selectedBrandId === brand.id ? (brand.colorHex ?? colors.primary) : colors.muted }]}>{brand.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Photos Grid */}
      {!displayPhotos || displayPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="camera-outline" size={56} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma foto ainda</Text>
          <Text style={[styles.emptyDesc, { color: colors.muted }]}>
            {isManager ? "Aguardando envio pelos promotores" : "Selecione uma marca e tire a primeira foto"}
          </Text>
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  headerActions: { flexDirection: "row", gap: 8 },
  headerBtn: { padding: 8, borderRadius: 10 },
  brandFilter: { borderBottomWidth: 1, paddingHorizontal: 8 },
  brandTab: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  brandTabText: { fontSize: 14, fontWeight: "600" },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
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
});
