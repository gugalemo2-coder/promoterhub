import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const PRESET_COLORS = [
  "#E53E3E", "#DD6B20", "#D69E2E", "#38A169", "#3182CE",
  "#805AD5", "#D53F8C", "#2D3748", "#0D9488", "#7C3AED",
];

type Brand = {
  id: number;
  name: string;
  description?: string | null;
  colorHex?: string | null;
  logoUrl?: string | null;
  iconName?: string | null;
  sortOrder: number;
  status: "active" | "inactive";
};

type FormState = {
  name: string;
  description: string;
  colorHex: string;
  logoUrl: string;
  sortOrder: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  colorHex: "#3182CE",
  logoUrl: "",
  sortOrder: "0",
};

export default function BrandsScreen() {
  const colors = useColors();
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [uploading, setUploading] = useState(false);

  const { data: brands, isLoading, refetch } = trpc.brandsAdmin.listAll.useQuery();

  useFocusEffect(useCallback(() => { refetch(); }, []));

  const createMutation = trpc.brandsAdmin.create.useMutation({
    onSuccess: () => { refetch(); setShowModal(false); setForm(DEFAULT_FORM); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Erro", e.message),
  });

  const updateMutation = trpc.brandsAdmin.update.useMutation({
    onSuccess: () => { refetch(); setShowModal(false); setEditingBrand(null); setForm(DEFAULT_FORM); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
    onError: (e) => Alert.alert("Erro", e.message),
  });

  const toggleMutation = trpc.brandsAdmin.toggleStatus.useMutation({
    onSuccess: () => refetch(),
  });

  const uploadLogoMutation = trpc.brandsAdmin.uploadLogo.useMutation();

  const openCreate = () => {
    setEditingBrand(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      description: brand.description ?? "",
      colorHex: brand.colorHex ?? "#3182CE",
      logoUrl: brand.logoUrl ?? "",
      sortOrder: String(brand.sortOrder),
    });
    setShowModal(true);
  };

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    setUploading(true);
    try {
      const { url } = await uploadLogoMutation.mutateAsync({
        fileBase64: asset.base64,
        fileType: asset.mimeType ?? "image/jpeg",
        fileName: `logo-${Date.now()}.jpg`,
      });
      setForm((f) => ({ ...f, logoUrl: url }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Erro", "Falha ao fazer upload do logo.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) { Alert.alert("Atenção", "O nome da marca é obrigatório."); return; }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      colorHex: form.colorHex,
      logoUrl: form.logoUrl || undefined,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };
    if (editingBrand) {
      updateMutation.mutate({ id: editingBrand.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggle = (brand: Brand) => {
    const next = brand.status === "active" ? "inactive" : "active";
    Alert.alert(
      next === "inactive" ? "Desativar marca" : "Ativar marca",
      `Deseja ${next === "inactive" ? "desativar" : "ativar"} a marca "${brand.name}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            toggleMutation.mutate({ id: brand.id, status: next });
          },
        },
      ]
    );
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.foreground }}>Marcas</Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            {brands?.length ?? 0} marca{(brands?.length ?? 0) !== 1 ? "s" : ""} cadastrada{(brands?.length ?? 0) !== 1 ? "s" : ""}
          </Text>
        </View>
        <Pressable
          onPress={openCreate}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text style={{ fontSize: 24, color: "#fff", lineHeight: 28 }}>+</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (brands ?? []).length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 48 }}>🏷️</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground }}>Nenhuma marca</Text>
          <Text style={{ fontSize: 14, color: colors.muted }}>Toque em + para cadastrar a primeira marca.</Text>
        </View>
      ) : (
        <FlatList
          data={brands}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: item.status === "inactive" ? 0.6 : 1,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                {/* Logo ou cor */}
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    backgroundColor: item.colorHex ?? "#3182CE",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {item.logoUrl ? (
                    <Image source={{ uri: item.logoUrl }} style={{ width: 52, height: 52 }} contentFit="cover" />
                  ) : (
                    <Text style={{ fontSize: 22, color: "#fff", fontWeight: "700" }}>
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>{item.name}</Text>
                  {item.description ? (
                    <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.colorHex ?? "#3182CE" }} />
                    <Text style={{ fontSize: 11, color: colors.muted }}>{item.colorHex ?? "Sem cor"}</Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>· Ordem: {item.sortOrder}</Text>
                  </View>
                </View>

                {/* Ações */}
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  <Switch
                    value={item.status === "active"}
                    onValueChange={() => handleToggle(item as Brand)}
                    trackColor={{ false: colors.border, true: `${colors.primary}60` }}
                    thumbColor={item.status === "active" ? colors.primary : colors.muted}
                  />
                  <Pressable
                    onPress={() => openEdit(item as Brand)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                      borderRadius: 10,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>Editar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Modal de criação/edição */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          {/* Header do modal */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={() => { setShowModal(false); setForm(DEFAULT_FORM); setEditingBrand(null); }}>
              <Text style={{ fontSize: 16, color: colors.muted }}>Cancelar</Text>
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>
              {editingBrand ? "Editar Marca" : "Nova Marca"}
            </Text>
            <Pressable onPress={handleSave} disabled={isSaving}>
              <Text style={{ fontSize: 16, color: isSaving ? colors.muted : colors.primary, fontWeight: "600" }}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Preview */}
            <View style={{ alignItems: "center", marginBottom: 8 }}>
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: form.colorHex,
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  marginBottom: 12,
                }}
              >
                {form.logoUrl ? (
                  <Image source={{ uri: form.logoUrl }} style={{ width: 80, height: 80 }} contentFit="cover" />
                ) : (
                  <Text style={{ fontSize: 32, color: "#fff", fontWeight: "700" }}>
                    {form.name ? form.name.charAt(0).toUpperCase() : "?"}
                  </Text>
                )}
              </View>
              <Pressable
                onPress={handlePickLogo}
                disabled={uploading}
                style={({ pressed }) => ({
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed || uploading ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
                  {uploading ? "Enviando..." : form.logoUrl ? "Trocar Logo" : "Adicionar Logo"}
                </Text>
              </Pressable>
            </View>

            {/* Nome */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>NOME DA MARCA *</Text>
              <TextInput
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Sinhá, LeitBom..."
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            {/* Descrição */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>DESCRIÇÃO</Text>
              <TextInput
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Descrição opcional..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
              />
            </View>

            {/* Cor */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 10 }}>COR DA MARCA</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                {PRESET_COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setForm((f) => ({ ...f, colorHex: c })); }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: c,
                      borderWidth: form.colorHex === c ? 3 : 0,
                      borderColor: colors.foreground,
                    }}
                  />
                ))}
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: form.colorHex }} />
                <TextInput
                  value={form.colorHex}
                  onChangeText={(v) => setForm((f) => ({ ...f, colorHex: v }))}
                  placeholder="#000000"
                  placeholderTextColor={colors.muted}
                  maxLength={7}
                  style={{
                    flex: 1,
                    backgroundColor: colors.surface,
                    borderRadius: 10,
                    padding: 10,
                    fontSize: 15,
                    color: colors.foreground,
                    borderWidth: 1,
                    borderColor: colors.border,
                    fontFamily: "monospace",
                  }}
                />
              </View>
            </View>

            {/* Ordem */}
            <View>
              <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted, marginBottom: 6 }}>ORDEM DE EXIBIÇÃO</Text>
              <TextInput
                value={form.sortOrder}
                onChangeText={(v) => setForm((f) => ({ ...f, sortOrder: v.replace(/\D/g, "") }))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.muted}
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 16,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
