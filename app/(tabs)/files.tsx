import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Linking from "expo-linking";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function FilesScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager";

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBrandId, setUploadBrandId] = useState<number | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; base64: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: files, refetch } = trpc.stockFiles.list.useQuery({ brandId: selectedBrandId ?? undefined });
  const uploadMutation = trpc.stockFiles.upload.useMutation();

  const handlePickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    // Read as base64
    const FS = await import("expo-file-system/legacy");
    const base64 = await FS.readAsStringAsync(asset.uri, { encoding: FS.EncodingType.Base64 });
    setSelectedFile({
      name: asset.name,
      base64,
      type: asset.mimeType ?? "application/octet-stream",
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadBrandId) {
      Alert.alert("Atenção", "Selecione uma marca e um arquivo.");
      return;
    }
    setUploading(true);
    try {
      await uploadMutation.mutateAsync({
        brandId: uploadBrandId,
        fileBase64: selectedFile.base64,
        fileType: selectedFile.type,
        fileName: selectedFile.name,
        description: uploadDesc.trim() || undefined,
      });
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDesc("");
      setUploadBrandId(null);
      refetch();
      Alert.alert("Arquivo enviado!", "O arquivo foi distribuído com sucesso.");
    } catch (err) {
      Alert.alert("Erro", "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);
    }
  };

  const handleOpenFile = async (url: string) => {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Erro", "Não foi possível abrir o arquivo.");
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("pdf")) return "document-text-outline";
    if (fileType.includes("image")) return "image-outline";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "grid-outline";
    return "document-outline";
  };

  const getFileIconColor = (fileType: string) => {
    if (fileType.includes("pdf")) return "#E02424";
    if (fileType.includes("image")) return "#3B82F6";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "#0E9F6E";
    return "#6B7280";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Arquivos</Text>
        {isManager && (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
          </Pressable>
        )}
      </View>

      {/* Brand Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.brandFilter, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.brandTab, !selectedBrandId && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setSelectedBrandId(null)}
        >
          <Text style={[styles.brandTabText, { color: !selectedBrandId ? colors.primary : colors.muted }]}>Todos</Text>
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

      {/* Files List */}
      <FlatList
        data={files}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={56} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum arquivo</Text>
            <Text style={[styles.emptyDesc, { color: colors.muted }]}>
              {isManager ? "Envie arquivos para os promotores" : "Nenhum arquivo disponível ainda"}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const brand = brands?.find((b) => b.id === item.brandId);
          const iconColor = getFileIconColor(item.fileType ?? "");
          return (
            <Pressable
              style={({ pressed }) => [styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && { opacity: 0.8 }]}
              onPress={() => handleOpenFile(item.fileUrl)}
            >
              <View style={[styles.fileIcon, { backgroundColor: iconColor + "15" }]}>
                <Ionicons name={getFileIcon(item.fileType ?? "") as any} size={28} color={iconColor} />
              </View>
              <View style={styles.fileInfo}>
                <Text style={[styles.fileName, { color: colors.foreground }]} numberOfLines={2}>{item.fileName}</Text>
                {item.description && (
                  <Text style={[styles.fileDesc, { color: colors.muted }]} numberOfLines={1}>{item.description}</Text>
                )}
                <View style={styles.fileMeta}>
                  {brand && (
                    <View style={[styles.brandBadge, { backgroundColor: (brand.colorHex ?? "#3B82F6") + "20" }]}>
                      <Text style={[styles.brandBadgeText, { color: brand.colorHex ?? "#3B82F6" }]}>{brand.name}</Text>
                    </View>
                  )}
                  <Text style={[styles.fileSize, { color: colors.muted }]}>{formatFileSize(item.fileSize ?? 0)}</Text>
                  <Text style={[styles.fileDate, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={20} color={colors.muted} />
            </Pressable>
          );
        }}
      />

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Enviar Arquivo</Text>

            <Text style={[styles.modalLabel, { color: colors.muted }]}>Marca *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {brands?.map((b) => (
                <Pressable
                  key={b.id}
                  style={[styles.brandOption, uploadBrandId === b.id && { backgroundColor: (b.colorHex ?? "#3B82F6") + "20", borderColor: b.colorHex ?? "#3B82F6" }, { borderColor: colors.border }]}
                  onPress={() => setUploadBrandId(b.id)}
                >
                  <Text style={[styles.brandOptionText, { color: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.muted }]}>{b.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.modalLabel, { color: colors.muted }]}>Descrição (opcional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={uploadDesc}
              onChangeText={setUploadDesc}
              placeholder="Descreva o arquivo..."
              placeholderTextColor={colors.muted}
              returnKeyType="done"
            />

            <Pressable
              style={[styles.pickFileBtn, { backgroundColor: colors.surface, borderColor: selectedFile ? colors.primary : colors.border }]}
              onPress={handlePickFile}
            >
              <Ionicons name="attach-outline" size={22} color={selectedFile ? colors.primary : colors.muted} />
              <Text style={[styles.pickFileBtnText, { color: selectedFile ? colors.primary : colors.muted }]}>
                {selectedFile ? selectedFile.name : "Selecionar arquivo..."}
              </Text>
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => { setShowUploadModal(false); setSelectedFile(null); }}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: uploading ? 0.7 : 1 }]}
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>{uploading ? "Enviando..." : "Enviar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  addBtn: { padding: 8 },
  brandFilter: { borderBottomWidth: 1, paddingHorizontal: 8 },
  brandTab: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  brandTabText: { fontSize: 14, fontWeight: "600" },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  list: { padding: 16, gap: 12 },
  fileCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, borderWidth: 1, gap: 14 },
  fileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1, gap: 4 },
  fileName: { fontSize: 15, fontWeight: "600" },
  fileDesc: { fontSize: 13 },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  brandBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  brandBadgeText: { fontSize: 11, fontWeight: "700" },
  fileSize: { fontSize: 12 },
  fileDate: { fontSize: 12 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  pickFileBtn: { borderWidth: 1.5, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderStyle: "dashed" },
  pickFileBtnText: { flex: 1, fontSize: 15 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
  brandOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8 },
  brandOptionText: { fontSize: 14, fontWeight: "600" },
});
