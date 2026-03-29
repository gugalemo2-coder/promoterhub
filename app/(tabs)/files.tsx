import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { Platform } from "react-native";
import { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";

export default function FilesScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager" || appRole === "master";

  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadBrandId, setUploadBrandId] = useState<number | null>(null);
  const [uploadDesc, setUploadDesc] = useState("");
  const [selectedFile, setSelectedFile] = useState<{ name: string; uri: string; base64?: string; type: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  // Delete confirm modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { data: brands } = trpc.brands.list.useQuery();
  const { data: files, refetch } = trpc.stockFiles.list.useQuery({ brandId: selectedBrandId ?? undefined });
  const uploadMutation = trpc.stockFiles.upload.useMutation();
  const deleteMutation = trpc.stockFiles.delete.useMutation();

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "*/*"],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      if (Platform.OS === "web") {
        setUploadProgress("Lendo arquivo...");
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        setUploadProgress(null);
        setSelectedFile({ name: asset.name, uri: asset.uri, base64, type: asset.mimeType ?? "application/octet-stream" });
      } else {
        setSelectedFile({ name: asset.name, uri: asset.uri, type: asset.mimeType ?? "application/octet-stream" });
      }
    } catch {
      setUploadProgress(null);
      Alert.alert("Erro", "Não foi possível selecionar o arquivo. Tente novamente.");
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadBrandId) {
      Alert.alert("Atenção", "Selecione uma marca e um arquivo.");
      return;
    }
    setUploading(true);
    setUploadProgress("Enviando arquivo...");
    try {
      if (Platform.OS === "web") {
        await uploadMutation.mutateAsync({
          brandId: uploadBrandId,
          fileBase64: selectedFile.base64!,
          fileType: selectedFile.type,
          fileName: selectedFile.name,
          description: uploadDesc.trim() || undefined,
        });
      } else {
        const FS = await import("expo-file-system/legacy");
        const token = await Auth.getSessionToken();
        const apiBase = getApiBaseUrl();
        const uploadUrl = `${apiBase}/api/files/upload`;

        const uploadResult = await FS.uploadAsync(uploadUrl, selectedFile.uri, {
          httpMethod: "POST",
          uploadType: FS.FileSystemUploadType.MULTIPART,
          fieldName: "file",
          mimeType: selectedFile.type,
          parameters: {
            brandId: String(uploadBrandId),
            description: uploadDesc.trim() || "",
          },
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          let errMsg = "Erro ao enviar arquivo.";
          try {
            const body = JSON.parse(uploadResult.body);
            errMsg = body.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }
      }

      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadDesc("");
      setUploadBrandId(null);
      setUploadProgress(null);
      refetch();
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      Alert.alert("Arquivo enviado!", "O arquivo foi distribuído com sucesso para os promotores.");
    } catch (err: any) {
      setUploadProgress(null);
      const msg = err?.message ?? "Não foi possível enviar o arquivo.";
      Alert.alert("Erro no envio", msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = (id: number, fileName: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(fileName);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await deleteMutation.mutateAsync({ id: deleteTargetId });
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      refetch();
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível excluir o arquivo.");
    } finally {
      setDeleteLoading(false);
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
      {/* Wrapper que ocupa toda a tela com layout fixo */}
      <View style={styles.screenWrapper}>

        {/* Header — fixo no topo */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Arquivos</Text>
          {isManager && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowUploadModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="cloud-upload-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Brand Filter — fixo abaixo do header, nunca se move */}
        <View style={[styles.brandFilterWrapper, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.brandFilter}>
            <TouchableOpacity
              style={[styles.brandTab, !selectedBrandId && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              onPress={() => setSelectedBrandId(null)}
              activeOpacity={0.7}
            >
              <Text style={[styles.brandTabText, { color: !selectedBrandId ? colors.primary : colors.muted }]}>Todos</Text>
            </TouchableOpacity>
            {brands?.map((brand) => (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandTab, selectedBrandId === brand.id && { borderBottomColor: brand.colorHex ?? colors.primary, borderBottomWidth: 2 }]}
                onPress={() => setSelectedBrandId(brand.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.brandDot, { backgroundColor: brand.colorHex ?? colors.primary }]} />
                <Text style={[styles.brandTabText, { color: selectedBrandId === brand.id ? (brand.colorHex ?? colors.primary) : colors.muted }]}>{brand.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Files List — ocupa o espaço restante e rola sozinha */}
        <FlatList
          data={files}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          style={styles.flatList}
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
              <View style={[styles.fileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={styles.fileCardInner}
                  onPress={() => handleOpenFile(item.fileUrl)}
                  activeOpacity={0.8}
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
                </TouchableOpacity>
                {isManager && (
                  <TouchableOpacity
                    style={[styles.deleteBtn, { borderTopColor: colors.border }]}
                    onPress={() => handleDeleteFile(item.id, item.fileName)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteBtnText}>Excluir</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />

      </View>

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.foreground }]}>Excluir arquivo?</Text>
            <Text style={[styles.deleteModalDesc, { color: colors.muted }]} numberOfLines={3}>
              "{deleteTargetName}" será removido e os promotores não poderão mais acessá-lo.
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.deleteModalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteModalBtn, { backgroundColor: "#EF4444", opacity: deleteLoading ? 0.6 : 1 }]}
                onPress={handleConfirmDelete}
                disabled={deleteLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.deleteModalBtnText, { color: "#FFFFFF" }]}>
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Upload Modal ── */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Enviar Arquivo</Text>

            <Text style={[styles.modalLabel, { color: colors.muted }]}>Marca *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {brands?.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.brandOption, { borderColor: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.border }, uploadBrandId === b.id && { backgroundColor: (b.colorHex ?? "#3B82F6") + "20" }]}
                  onPress={() => setUploadBrandId(b.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.brandOptionText, { color: uploadBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.muted }]}>{b.name}</Text>
                </TouchableOpacity>
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
              editable={!uploading}
            />

            <TouchableOpacity
              style={[styles.pickFileBtn, { backgroundColor: colors.surface, borderColor: selectedFile ? colors.primary : colors.border }]}
              onPress={handlePickFile}
              disabled={uploading}
              activeOpacity={0.75}
            >
              <Ionicons name="attach-outline" size={22} color={selectedFile ? colors.primary : colors.muted} />
              <Text style={[styles.pickFileBtnText, { color: selectedFile ? colors.primary : colors.muted }]} numberOfLines={1}>
                {uploadProgress === "Lendo arquivo..." ? "Lendo arquivo..." : selectedFile ? selectedFile.name : "Selecionar arquivo..."}
              </Text>
            </TouchableOpacity>

            {uploading && (
              <View style={styles.progressRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.progressText, { color: colors.muted }]}>{uploadProgress ?? "Enviando..."}</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border, opacity: uploading ? 0.5 : 1 }]}
                onPress={() => { if (!uploading) { setShowUploadModal(false); setSelectedFile(null); setUploadDesc(""); setUploadBrandId(null); } }}
                disabled={uploading}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: uploading || !selectedFile || !uploadBrandId ? 0.6 : 1 }]}
                onPress={handleUpload}
                disabled={uploading || !selectedFile || !uploadBrandId}
                activeOpacity={0.8}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  // ── NOVO: wrapper que garante layout fixo em coluna ──
  screenWrapper: { flex: 1, flexDirection: "column" },

  header: { paddingTop: 16, paddingBottom: 16, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  addBtn: { padding: 8 },

  // ── NOVO: wrapper fixo para o filtro — não empurra nem sobe ──
  brandFilterWrapper: { borderBottomWidth: 1, paddingHorizontal: 8 },
  brandFilter: {},

  brandTab: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 6 },
  brandTabText: { fontSize: 14, fontWeight: "600" },
  brandDot: { width: 8, height: 8, borderRadius: 4 },

  // ── NOVO: FlatList com flex:1 rola internamente sem afetar o filtro ──
  flatList: { flex: 1 },

  list: { padding: 16, gap: 12 },
  fileCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  fileCardInner: { flexDirection: "row", alignItems: "center", padding: 14, gap: 14 },
  fileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  fileInfo: { flex: 1, gap: 4 },
  fileName: { fontSize: 15, fontWeight: "600" },
  fileDesc: { fontSize: 13 },
  fileMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  brandBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  brandBadgeText: { fontSize: 11, fontWeight: "700" },
  fileSize: { fontSize: 12 },
  fileDate: { fontSize: 12 },
  deleteBtn: { borderTopWidth: 1, backgroundColor: "#FFF5F5", paddingVertical: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  deleteBtnText: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  // Delete confirm modal
  deleteModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  deleteModalContent: { width: "100%", maxWidth: 360, borderRadius: 20, padding: 24, gap: 12, alignItems: "center" },
  deleteIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  deleteModalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  deleteModalDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  deleteModalActions: { flexDirection: "row", gap: 12, marginTop: 8, width: "100%" },
  deleteModalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  deleteModalBtnText: { fontSize: 16, fontWeight: "700" },
  // Upload modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  pickFileBtn: { borderWidth: 1.5, borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, borderStyle: "dashed" },
  pickFileBtnText: { flex: 1, fontSize: 15 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  progressText: { fontSize: 14 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
  brandOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8 },
  brandOptionText: { fontSize: 14, fontWeight: "600" },
});
