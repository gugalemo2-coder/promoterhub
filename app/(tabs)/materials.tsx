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
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type RequestPriority = "low" | "medium" | "high";

export default function MaterialsScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const isManager = appRole === "manager" || appRole === "master";

  const [activeTab, setActiveTab] = useState<"catalog" | "requests">("catalog");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [priority, setPriority] = useState<RequestPriority>("medium");
  const [notes, setNotes] = useState("");
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialDesc, setNewMaterialDesc] = useState("");
  const [newMaterialQty, setNewMaterialQty] = useState("0");
  const [newMaterialBrandId, setNewMaterialBrandId] = useState<number | null>(null);
  const [newMaterialPhotoUri, setNewMaterialPhotoUri] = useState<string | null>(null);
  const [newMaterialPhotoBase64, setNewMaterialPhotoBase64] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Reject modal state (replaces Alert.prompt which doesn't work on web)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);

  // Delete confirm modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deleteTargetName, setDeleteTargetName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const uploadMaterialPhotoMutation = trpc.materials.uploadPhoto.useMutation();

  const displayRequests = isManager ? allRequests : myRequests;

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

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      refetchAllRequests();
    } catch {
      Alert.alert("Erro", "Não foi possível aprovar.");
    }
  };

  // Opens the custom reject modal (replaces Alert.prompt)
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

  const handlePickMaterialPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setNewMaterialPhotoUri(result.assets[0].uri);
      setNewMaterialPhotoBase64(result.assets[0].base64 ?? null);
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterialName.trim()) {
      Alert.alert("Nome obrigatório", "Informe o nome do material.");
      return;
    }
    if (!newMaterialBrandId) {
      Alert.alert("Marca obrigatória", "Selecione uma marca.");
      return;
    }
    try {
      let photoUrl: string | undefined;
      if (newMaterialPhotoBase64) {
        setPhotoUploading(true);
        const uploadResult = await uploadMaterialPhotoMutation.mutateAsync({
          fileBase64: newMaterialPhotoBase64,
          fileType: "image/jpeg",
          fileName: `${newMaterialName.trim().replace(/\s+/g, "-").toLowerCase()}.jpg`,
        });
        photoUrl = uploadResult.url;
        setPhotoUploading(false);
      }
      await createMaterialMutation.mutateAsync({
        brandId: newMaterialBrandId,
        name: newMaterialName.trim(),
        description: newMaterialDesc.trim() || undefined,
        quantityAvailable: parseInt(newMaterialQty) || 0,
        photoUrl,
      });
      setShowAddMaterialModal(false);
      setNewMaterialName("");
      setNewMaterialDesc("");
      setNewMaterialQty("0");
      setNewMaterialBrandId(null);
      setNewMaterialPhotoUri(null);
      setNewMaterialPhotoBase64(null);
      setPhotoUploading(false);
      refetchMaterials();
      Alert.alert("Material criado!", "Material adicionado ao catálogo.");
    } catch {
      setPhotoUploading(false);
      Alert.alert("Erro", "Não foi possível criar o material.");
    }
  };

  // Opens the custom delete confirm modal
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
    const map: Record<string, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Recusado", delivered: "Entregue", cancelled: "Cancelado" };
    return map[s] ?? s;
  };

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Materiais</Text>
        {isManager && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddMaterialModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
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
                      <TouchableOpacity
                        style={styles.deleteMatBtn}
                        onPress={() => handleDeleteMaterial(item.id, item.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
        />
      ) : (
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

      {/* ── Request Modal ── */}
      <Modal visible={showRequestModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Solicitar Material</Text>
            <Text style={[styles.modalLabel, { color: colors.muted }]}>Quantidade</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              returnKeyType="done"
            />
            <Text style={[styles.modalLabel, { color: colors.muted }]}>Prioridade</Text>
            <View style={styles.priorityRow}>
              {(["low", "medium", "high"] as RequestPriority[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityOption, priority === p && { backgroundColor: priorityColor(p) + "20", borderColor: priorityColor(p) }, { borderColor: colors.border }]}
                  onPress={() => setPriority(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.priorityOptionText, { color: priority === p ? priorityColor(p) : colors.muted }]}>
                    {p === "high" ? "Alta" : p === "medium" ? "Média" : "Baixa"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.modalLabel, { color: colors.muted }]}>Observações (opcional)</Text>
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

      {/* ── Reject Modal (replaces Alert.prompt) ── */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Recusar Solicitação</Text>
            <Text style={[styles.modalLabel, { color: colors.muted }]}>Motivo da recusa *</Text>
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

      {/* ── Delete Confirm Modal ── */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: colors.background }]}>
            <View style={styles.deleteIconWrap}>
              <Ionicons name="trash-outline" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.deleteModalTitle, { color: colors.foreground }]}>Excluir material?</Text>
            <Text style={[styles.deleteModalDesc, { color: colors.muted }]}>
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

      {/* ── Add Material Modal (Manager) ── */}
      <Modal visible={showAddMaterialModal} transparent animationType="slide">
        <View style={styles.modalOverlayFull}>
          <View style={[styles.modalSheetFull, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 8, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Novo Material</Text>
              <Text style={[styles.modalLabel, { color: colors.muted }]}>Marca *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {brands?.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.brandOption, newMaterialBrandId === b.id && { backgroundColor: (b.colorHex ?? "#3B82F6") + "20", borderColor: b.colorHex ?? "#3B82F6" }, { borderColor: colors.border }]}
                    onPress={() => setNewMaterialBrandId(b.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.brandOptionText, { color: newMaterialBrandId === b.id ? (b.colorHex ?? "#3B82F6") : colors.muted }]}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Text style={[styles.modalLabel, { color: colors.muted }]}>Nome *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={newMaterialName}
                onChangeText={setNewMaterialName}
                placeholder="Nome do material"
                placeholderTextColor={colors.muted}
                returnKeyType="next"
              />
              <Text style={[styles.modalLabel, { color: colors.muted }]}>Descrição</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={newMaterialDesc}
                onChangeText={setNewMaterialDesc}
                multiline
                numberOfLines={3}
                placeholder="Descrição do material..."
                placeholderTextColor={colors.muted}
              />
              <Text style={[styles.modalLabel, { color: colors.muted }]}>Imagem do produto (opcional)</Text>
              <TouchableOpacity
                style={[styles.photoPickerBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={handlePickMaterialPhoto}
                activeOpacity={0.7}
              >
                {newMaterialPhotoUri ? (
                  <Image source={{ uri: newMaterialPhotoUri }} style={styles.photoPreview} contentFit="cover" />
                ) : (
                  <View style={styles.photoPickerPlaceholder}>
                    <Ionicons name="camera-outline" size={28} color={colors.muted} />
                    <Text style={[styles.photoPickerText, { color: colors.muted }]}>Toque para selecionar foto</Text>
                  </View>
                )}
              </TouchableOpacity>
              {newMaterialPhotoUri && (
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => { setNewMaterialPhotoUri(null); setNewMaterialPhotoBase64(null); }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                  <Text style={[styles.removePhotoText, { color: "#EF4444" }]}>Remover foto</Text>
                </TouchableOpacity>
              )}
              <Text style={[styles.modalLabel, { color: colors.muted }]}>Quantidade disponível</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground }]}
                value={newMaterialQty}
                onChangeText={setNewMaterialQty}
                keyboardType="numeric"
                returnKeyType="done"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.border }]} onPress={() => setShowAddMaterialModal(false)} activeOpacity={0.8}>
                  <Text style={[styles.modalBtnText, { color: colors.foreground }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: colors.primary, opacity: (photoUploading || createMaterialMutation.isPending) ? 0.6 : 1 }]}
                  onPress={handleAddMaterial}
                  activeOpacity={0.8}
                  disabled={photoUploading || createMaterialMutation.isPending}
                >
                  <Text style={[styles.modalBtnText, { color: "#FFFFFF" }]}>
                    {photoUploading ? "Enviando foto..." : createMaterialMutation.isPending ? "Criando..." : "Criar"}
                  </Text>
                </TouchableOpacity>
              </View>
          </ScrollView>
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
  deleteMatBtn: { padding: 6, borderRadius: 8, backgroundColor: "#FFF5F5" },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalOverlayFull: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalSheetFull: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "92%" },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 8 },
  modalLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16 },
  textArea: { height: 90, textAlignVertical: "top" },
  priorityRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  priorityOption: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  priorityOptionText: { fontSize: 14, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalBtnText: { fontSize: 16, fontWeight: "700" },
  brandOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, marginRight: 8 },
  brandOptionText: { fontSize: 14, fontWeight: "600" },
  // Photo picker
  photoPickerBtn: { borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed", overflow: "hidden", marginBottom: 8 },
  photoPreview: { width: "100%", height: 160 },
  photoPickerPlaceholder: { height: 120, alignItems: "center", justifyContent: "center", gap: 8 },
  photoPickerText: { fontSize: 13, fontWeight: "500" },
  removePhotoBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  removePhotoText: { fontSize: 13, fontWeight: "600" },
  // Delete confirm modal
  deleteModalContent: { margin: 24, borderRadius: 20, padding: 24, gap: 12, alignItems: "center" },
  deleteIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  deleteModalTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  deleteModalDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
