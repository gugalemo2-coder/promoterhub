import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type RequestPriority = "low" | "medium" | "high";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const priorityColor = (p: string) => {
  if (p === "high") return "#EF4444";
  if (p === "medium") return "#F59E0B";
  return "#6B7280";
};

const statusColor = (s: string) => {
  if (s === "approved" || s === "delivered") return "#0E9F6E";
  if (s === "rejected" || s === "cancelled") return "#E02424";
  return "#D97706";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Recusado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return map[s] ?? s;
};

// ─── Componente de seleção de foto ────────────────────────────────────────────
function PhotoPicker({
  uri,
  onPick,
  onRemove,
  label = "Imagem do produto (opcional)",
}: {
  uri: string | null;
  onPick: () => void;
  onRemove: () => void;
  label?: string;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[pickerStyles.label, { color: colors.muted }]}>{label}</Text>
      <TouchableOpacity
        style={[pickerStyles.container, { borderColor: colors.primary, backgroundColor: colors.surface }]}
        onPress={onPick}
        activeOpacity={0.8}
      >
        {uri ? (
          <Image source={{ uri }} style={pickerStyles.preview} contentFit="cover" />
        ) : (
          <View style={pickerStyles.placeholder}>
            <View style={[pickerStyles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
              <Ionicons name="camera" size={32} color={colors.primary} />
            </View>
            <Text style={[pickerStyles.placeholderText, { color: colors.foreground }]}>
              Toque para selecionar foto
            </Text>
            <Text style={[pickerStyles.placeholderSub, { color: colors.muted }]}>
              Galeria · JPG ou PNG
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {uri && (
        <TouchableOpacity style={pickerStyles.removeBtn} onPress={onRemove} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={16} color="#EF4444" />
          <Text style={pickerStyles.removeText}>Remover foto</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600" },
  container: {
    borderWidth: 2,
    borderRadius: 14,
    borderStyle: "dashed",
    overflow: "hidden",
    minHeight: 140,
  },
  preview: { width: "100%", height: 180 },
  placeholder: {
    minHeight: 140,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: { fontSize: 15, fontWeight: "600" },
  placeholderSub: { fontSize: 12 },
  removeBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  removeText: { fontSize: 13, fontWeight: "600", color: "#EF4444" },
});

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function MaterialsScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager" || appRole === "master";

  // ── Tab ──────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"catalog" | "requests">("catalog");

  // ── Modal: solicitar material ─────────────────────────────────────────────
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [notes, setNotes] = useState("");

  // ── Modal: criar material ─────────────────────────────────────────────────
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addQty, setAddQty] = useState("0");
  const [addBrandId, setAddBrandId] = useState<number | null>(null);
  const [addPhotoUri, setAddPhotoUri] = useState<string | null>(null);
  const [addPhotoBase64, setAddPhotoBase64] = useState<string | null>(null);
  const [addUploading, setAddUploading] = useState(false);

  // ── Modal: editar material ────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editQty, setEditQty] = useState("0");
  const [editPhotoUri, setEditPhotoUri] = useState<string | null>(null);
  const [editPhotoBase64, setEditPhotoBase64] = useState<string | null>(null);
  const [editCurrentPhotoUrl, setEditCurrentPhotoUrl] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);

  // ── Modal: recusar solicitação ────────────────────────────────────────────
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // ── Modal: excluir material ───────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: materials, refetch: refetchMaterials } = trpc.materials.list.useQuery({});
  const { data: brands } = trpc.brands.list.useQuery();
  const { data: stores } = trpc.stores.list.useQuery();
  const { data: myRequests, refetch: refetchMyRequests } = trpc.materialRequests.list.useQuery({}, { enabled: !isManager });
  const { data: allRequests, refetch: refetchAllRequests } = trpc.materialRequests.listAll.useQuery({}, { enabled: isManager });

  const createRequestMutation = trpc.materialRequests.create.useMutation();
  const approveMutation = trpc.materialRequests.approve.useMutation();
  const rejectMutation = trpc.materialRequests.reject.useMutation();
  const deliverMutation = trpc.materialRequests.deliver.useMutation();
  const createMaterialMutation = trpc.materials.create.useMutation();
  const deleteMaterialMutation = trpc.materials.delete.useMutation();
  const updateMaterialMutation = trpc.materials.update.useMutation();
  const uploadPhotoMutation = trpc.materials.uploadPhoto.useMutation();

  const displayRequests = isManager ? allRequests : myRequests;

  // ── Handlers: solicitar ───────────────────────────────────────────────────
  const handleRequestMaterial = (materialId: number) => {
    setSelectedMaterialId(materialId);
    setQuantity("1");
    setPriority("medium");
    setNotes("");
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedMaterialId || !stores || stores.length === 0) {
      Alert.alert("Erro", "Nenhuma loja disponível.");
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      Alert.alert("Quantidade inválida", "Informe uma quantidade válida.");
      return;
    }
    try {
      await createRequestMutation.mutateAsync({
        materialId: selectedMaterialId,
        storeId: stores[0].id,
        quantityRequested: qty,
        priority,
        notes: notes.trim() || undefined,
      });
      setShowRequestModal(false);
      Alert.alert("Solicitação enviada!", "Sua solicitação foi enviada ao gestor.");
      refetchMyRequests();
    } catch {
      Alert.alert("Erro", "Não foi possível enviar a solicitação.");
    }
  };

  // ── Handlers: aprovar / recusar / entregar ────────────────────────────────
  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      refetchAllRequests();
    } catch {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  };

  const handleReject = (id: number) => {
    setRejectTargetId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectTargetId) return;
    if (!rejectReason.trim()) {
      Alert.alert("Motivo obrigatório", "Informe o motivo da recusa.");
      return;
    }
    setRejectLoading(true);
    try {
      await rejectMutation.mutateAsync({ id: rejectTargetId, rejectionReason: rejectReason.trim() });
      setShowRejectModal(false);
      setRejectTargetId(null);
      setRejectReason("");
      refetchAllRequests();
    } catch {
      Alert.alert("Erro", "Não foi possível recusar a solicitação.");
    } finally {
      setRejectLoading(false);
    }
  };

  const handleDeliver = async (id: number) => {
    try {
      await deliverMutation.mutateAsync({ id });
      refetchAllRequests();
      Alert.alert("Entregue!", "Material marcado como entregue.");
    } catch {
      Alert.alert("Erro", "Não foi possível marcar como entregue.");
    }
  };

  // ── Handlers: foto ────────────────────────────────────────────────────────
  const pickPhoto = async (): Promise<{ uri: string; base64: string } | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      return { uri: result.assets[0].uri, base64: result.assets[0].base64 ?? "" };
    }
    return null;
  };

  const handlePickAddPhoto = async () => {
    const photo = await pickPhoto();
    if (photo) {
      setAddPhotoUri(photo.uri);
      setAddPhotoBase64(photo.base64);
    }
  };

  const handlePickEditPhoto = async () => {
    const photo = await pickPhoto();
    if (photo) {
      setEditPhotoUri(photo.uri);
      setEditPhotoBase64(photo.base64);
    }
  };

  // ── Handlers: criar material ──────────────────────────────────────────────
  const resetAddForm = () => {
    setAddName("");
    setAddDesc("");
    setAddQty("0");
    setAddBrandId(null);
    setAddPhotoUri(null);
    setAddPhotoBase64(null);
    setAddUploading(false);
  };

  const handleAddMaterial = async () => {
    if (!addName.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do material.");
      return;
    }
    if (!addBrandId) {
      Alert.alert("Marca obrigatória", "Selecione uma marca.");
      return;
    }
    try {
      let photoUrl: string | undefined;
      if (addPhotoBase64) {
        setAddUploading(true);
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          fileBase64: addPhotoBase64,
          fileType: "image/jpeg",
          fileName: `${addName.trim().replace(/\s+/g, "-").toLowerCase()}.jpg`,
        });
        photoUrl = uploadResult.url;
      }
      setAddUploading(false);
      await createMaterialMutation.mutateAsync({
        brandId: addBrandId,
        name: addName.trim(),
        description: addDesc.trim() || undefined,
        quantityAvailable: parseInt(addQty) || 0,
        photoUrl,
      });
      setShowAddModal(false);
      resetAddForm();
      refetchMaterials();
      Alert.alert("Material criado!", "Material adicionado ao catálogo.");
    } catch {
      setAddUploading(false);
      Alert.alert("Erro", "Não foi possível criar o material.");
    }
  };

  // ── Handlers: editar material ─────────────────────────────────────────────
  const handleOpenEdit = (item: { id: number; name: string; description?: string | null; quantityAvailable: number; photoUrl?: string | null }) => {
    setEditId(item.id);
    setEditName(item.name);
    setEditDesc(item.description ?? "");
    setEditQty(String(item.quantityAvailable));
    setEditPhotoUri(null);
    setEditPhotoBase64(null);
    setEditCurrentPhotoUrl(item.photoUrl ?? null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    if (!editName.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do material.");
      return;
    }
    try {
      let photoUrl: string | undefined;
      if (editPhotoBase64) {
        setEditUploading(true);
        const uploadResult = await uploadPhotoMutation.mutateAsync({
          fileBase64: editPhotoBase64,
          fileType: "image/jpeg",
          fileName: `${editName.trim().replace(/\s+/g, "-").toLowerCase()}.jpg`,
        });
        photoUrl = uploadResult.url;
      }
      setEditUploading(false);
      await updateMaterialMutation.mutateAsync({
        id: editId,
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        quantityAvailable: parseInt(editQty) || 0,
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      });
      setShowEditModal(false);
      setEditId(null);
      refetchMaterials();
      Alert.alert("Material atualizado!", "As informações foram salvas.");
    } catch {
      setEditUploading(false);
      Alert.alert("Erro", "Não foi possível atualizar o material.");
    }
  };

  // ── Handlers: excluir material ────────────────────────────────────────────
  const handleDeleteMaterial = (id: number, name: string) => {
    setDeleteTargetId(id);
    setDeleteTargetName(name);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await deleteMaterialMutation.mutateAsync({ id: deleteTargetId });
      setShowDeleteModal(false);
      setDeleteTargetId(null);
      setDeleteTargetName("");
      refetchMaterials();
    } catch (err: any) {
      Alert.alert("Erro", err?.message ?? "Não foi possível excluir o material.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <ScreenContainer>
      {/* Cabeçalho */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Materiais</Text>
        {isManager && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Abas */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(["catalog", "requests"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, { color: activeTab === tab ? colors.primary : colors.muted }]}>
              {tab === "catalog" ? "Catálogo" : "Solicitações"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Catálogo */}
      {activeTab === "catalog" ? (
        <FlatList
          data={materials}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhum material</Text>
              <Text style={[styles.emptyDesc, { color: colors.muted }]}>
                {isManager ? "Adicione materiais ao catálogo" : "Aguardando cadastro pelo gestor"}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const brand = brands?.find((b) => b.id === item.brandId);
            return (
              <View style={[styles.materialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.materialPhoto} contentFit="cover" />
                ) : (
                  <View style={[styles.materialPhotoPlaceholder, { backgroundColor: colors.border }]}>
                    <Ionicons name="cube-outline" size={28} color={colors.muted} />
                  </View>
                )}
                <View style={styles.materialInfo}>
                  <View style={styles.materialHeader}>
                    <Text style={[styles.materialName, { color: colors.foreground }]}>{item.name}</Text>
                    {brand && (
                      <View style={[styles.brandBadge, { backgroundColor: (brand.colorHex ?? "#3B82F6") + "20" }]}>
                        <Text style={[styles.brandBadgeText, { color: brand.colorHex ?? "#3B82F6" }]}>{brand.name}</Text>
                      </View>
                    )}
                  </View>
                  {item.description && (
                    <Text style={[styles.materialDesc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text>
                  )}
                  <View style={styles.materialFooter}>
                    <View style={styles.stockInfo}>
                      <Ionicons name="layers-outline" size={14} color={colors.muted} />
                      <Text style={[styles.stockText, { color: item.quantityAvailable > 0 ? colors.success : colors.error }]}>
                        {item.quantityAvailable} {item.unit}
                      </Text>
                    </View>
                    {!isManager && item.quantityAvailable > 0 && (
                      <TouchableOpacity
                        style={[styles.requestBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleRequestMaterial(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.requestBtnText}>Solicitar</Text>
                      </TouchableOpacity>
                    )}
                    {isManager && (
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                          onPress={() => handleOpenEdit(item)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="create-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: "#FFF5F5", borderColor: "#FEE2E2" }]}
                          onPress={() => handleDeleteMaterial(item.id, item.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      ) : (
        /* Solicitações */
        <FlatList
          data={displayRequests}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={56} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Nenhuma solicitação</Text>
            </View>
          }
          renderItem={({ item }) => {
            const material = materials?.find((m) => m.id === item.materialId);
            return (
              <View style={[styles.requestCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.requestHeader}>
                  <Text style={[styles.requestMaterial, { color: colors.foreground }]}>{material?.name ?? "Material"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) + "20" }]}>
                    <Text style={[styles.statusText, { color: statusColor(item.status) }]}>{statusLabel(item.status)}</Text>
                  </View>
                </View>
                <View style={styles.requestMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: priorityColor(item.priority) + "20" }]}>
                    <Text style={[styles.priorityText, { color: priorityColor(item.priority) }]}>
                      {item.priority === "high" ? "Alta" : item.priority === "medium" ? "Média" : "Baixa"}
                    </Text>
                  </View>
                  <Text style={[styles.requestQty, { color: colors.muted }]}>Qtd: {item.quantityRequested}</Text>
                  <Text style={[styles.requestDate, { color: colors.muted }]}>
                    {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                {item.notes && <Text style={[styles.requestNotes, { color: colors.muted }]}>{item.notes}</Text>}
                {isManager && item.status === "pending" && (
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#0E9F6E20" }]}
                      onPress={() => handleApprove(item.id)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="checkmark" size={16} color="#0E9F6E" />
                      <Text style={[styles.actionBtnText, { color: "#0E9F6E" }]}>Aprovar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: "#E0242420" }]}
                      onPress={() => handleReject(item.id)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="close" size={16} color="#E02424" />
                      <Text style={[styles.actionBtnText, { color: "#E02424" }]}>Recusar</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isManager && item.status === "approved" && (
                  <TouchableOpacity
                    style={[styles.deliverBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleDeliver(item.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                    <Text style={styles.deliverBtnText}>Marcar como Entregue</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Solicitar Material
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Solicitar Material</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Quantidade</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={[styles.label, { color: colors.muted }]}>Prioridade</Text>
            <View style={styles.priorityRow}>
              {(["low", "medium", "high"] as RequestPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityOption,
                    { borderColor: priority === p ? priorityColor(p) : colors.border },
                    priority === p && { backgroundColor: priorityColor(p) + "20" },
                  ]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.priorityOptionText, { color: priority === p ? priorityColor(p) : colors.muted }]}>
                    {p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.label, { color: colors.muted }]}>Observações (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              placeholder="Informe detalhes adicionais..."
              placeholderTextColor={colors.muted}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowRequestModal(false)} activeOpacity={0.8}>
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSubmitRequest} activeOpacity={0.8}>
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Recusar Solicitação
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Recusar Solicitação</Text>
            <Text style={[styles.label, { color: colors.muted }]}>Motivo da recusa *</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              placeholder="Informe o motivo da recusa..."
              placeholderTextColor={colors.muted}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => { setShowRejectModal(false); setRejectReason(""); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#E02424", opacity: rejectLoading ? 0.6 : 1 }]}
                onPress={handleConfirmReject}
                disabled={rejectLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>
                  {rejectLoading ? "Recusando..." : "Recusar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Excluir Material
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.deleteBox, { backgroundColor: colors.background }]}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.deleteTitle, { color: colors.foreground }]}>Excluir material?</Text>
            <Text style={[styles.deleteDesc, { color: colors.muted }]}>
              "{deleteTargetName}" será removido do catálogo e os promotores não poderão mais visualizá-lo.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.border }]}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: "#EF4444", opacity: deleteLoading ? 0.6 : 1 }]}
                onPress={handleConfirmDelete}
                disabled={deleteLoading}
                activeOpacity={0.8}
              >
                <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Criar Material (com upload de foto)
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.fullOverlay}
        >
          <View style={[styles.fullSheet, { backgroundColor: colors.background, maxHeight: SCREEN_HEIGHT * 0.93 }]}>
            {/* Barra de título */}
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Novo Material</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Foto do produto — PRIMEIRO CAMPO */}
              <PhotoPicker
                uri={addPhotoUri}
                onPick={handlePickAddPhoto}
                onRemove={() => { setAddPhotoUri(null); setAddPhotoBase64(null); }}
              />

              {/* Marca */}
              <Text style={[styles.label, { color: colors.muted }]}>Marca *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {brands?.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.brandOption,
                      { borderColor: addBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.border },
                      addBrandId === b.id && { backgroundColor: (b.colorHex ?? "#3B82F6") + "20" },
                    ]}
                    onPress={() => setAddBrandId(b.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.brandOptionText, { color: addBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.muted }]}>
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Nome */}
              <Text style={[styles.label, { color: colors.muted }]}>Nome *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={addName}
                onChangeText={setAddName}
                placeholder="Nome do material"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />

              {/* Descrição */}
              <Text style={[styles.label, { color: colors.muted }]}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={addDesc}
                onChangeText={setAddDesc}
                multiline
                numberOfLines={3}
                placeholder="Descrição do material..."
                placeholderTextColor={colors.muted}
              />

              {/* Quantidade */}
              <Text style={[styles.label, { color: colors.muted }]}>Quantidade disponível</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={addQty}
                onChangeText={setAddQty}
                keyboardType="numeric"
                returnKeyType="done"
              />

              {/* Botões */}
              <View style={[styles.modalActions, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setShowAddModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: (addUploading || createMaterialMutation.isPending) ? 0.6 : 1 }]}
                  onPress={handleAddMaterial}
                  activeOpacity={0.8}
                  disabled={addUploading || createMaterialMutation.isPending}
                >
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>
                    {addUploading ? "Enviando foto..." : createMaterialMutation.isPending ? "Criando..." : "Criar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════
          MODAL: Editar Material (com upload de foto)
      ════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.fullOverlay}
        >
          <View style={[styles.fullSheet, { backgroundColor: colors.background, maxHeight: SCREEN_HEIGHT * 0.93 }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Editar Material</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.sheetBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Foto — mostra a atual se existir, ou picker vazio */}
              <PhotoPicker
                uri={editPhotoUri ?? editCurrentPhotoUrl}
                onPick={handlePickEditPhoto}
                onRemove={() => { setEditPhotoUri(null); setEditPhotoBase64(null); setEditCurrentPhotoUrl(null); }}
                label="Imagem do produto"
              />

              {/* Nome */}
              <Text style={[styles.label, { color: colors.muted }]}>Nome *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome do material"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />

              {/* Descrição */}
              <Text style={[styles.label, { color: colors.muted }]}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={editDesc}
                onChangeText={setEditDesc}
                multiline
                numberOfLines={3}
                placeholder="Descrição opcional"
                placeholderTextColor={colors.muted}
              />

              {/* Quantidade */}
              <Text style={[styles.label, { color: colors.muted }]}>Quantidade disponível</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={editQty}
                onChangeText={setEditQty}
                keyboardType="numeric"
                returnKeyType="done"
              />

              {/* Botões */}
              <View style={[styles.modalActions, { marginTop: 8 }]}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.border }]}
                  onPress={() => setShowEditModal(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: (editUploading || updateMaterialMutation.isPending) ? 0.6 : 1 }]}
                  onPress={handleSaveEdit}
                  activeOpacity={0.8}
                  disabled={editUploading || updateMaterialMutation.isPending}
                >
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>
                    {editUploading ? "Enviando foto..." : updateMaterialMutation.isPending ? "Salvando..." : "Salvar"}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  addBtn: { padding: 8 },
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 15, fontWeight: "600" },
  list: { padding: 16, gap: 12 },
  materialCard: { flexDirection: "row", borderRadius: 16, overflow: "hidden", borderWidth: 1 },
  materialPhoto: { width: 80, height: 80 },
  materialPhotoPlaceholder: { width: 80, height: 80, alignItems: "center", justifyContent: "center" },
  materialInfo: { flex: 1, padding: 12, gap: 6 },
  materialHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  materialName: { flex: 1, fontSize: 15, fontWeight: "700" },
  brandBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  brandBadgeText: { fontSize: 11, fontWeight: "700" },
  materialDesc: { fontSize: 13, lineHeight: 18 },
  materialFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stockInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  stockText: { fontSize: 13, fontWeight: "600" },
  requestBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  requestBtnText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  iconBtn: { padding: 6, borderRadius: 8, borderWidth: 1 },
  requestCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 8 },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  requestMaterial: { flex: 1, fontSize: 15, fontWeight: "700" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 12, fontWeight: "700" },
  requestMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: "700" },
  requestQty: { fontSize: 13 },
  requestDate: { fontSize: 12 },
  requestNotes: { fontSize: 13, fontStyle: "italic" },
  requestActions: { flexDirection: "row", gap: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { fontSize: 14, fontWeight: "600" },
  deliverBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, borderRadius: 10 },
  deliverBtnText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 40, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 21 },
  // Modais simples (bottom sheet)
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  // Modais full (com scroll e foto)
  fullOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  fullSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  closeBtn: { padding: 4 },
  sheetBody: { padding: 20, gap: 12, paddingBottom: 48 },
  // Formulário
  label: { fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: { height: 90, textAlignVertical: "top" },
  priorityRow: { flexDirection: "row", gap: 10 },
  priorityOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  priorityOptionText: { fontSize: 14, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  brandOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8 },
  brandOptionText: { fontSize: 14, fontWeight: "600" },
  // Excluir
  deleteBox: { margin: 24, borderRadius: 20, padding: 24, gap: 12, alignItems: "center" },
  deleteIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" },
  deleteTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  deleteDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
