import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { useRouter } from "expo-router";
import { trpc } from "@/lib/trpc";

// Default values matching the DB defaults
const DEFAULTS = {
  weightPhotos: 30,
  weightHours: 25,
  weightVisits: 25,
  weightMaterials: 10,
  weightQuality: 10,
  weightDailyAvg: 0,
  notifyLowHours: true,
  notifyMaterialRequest: true,
  notifyPhotoRejected: true,
};

export default function SettingsScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const router = useRouter();
  const isMaster = appRole === "master";
  const accentColor = isMaster ? "#7C3AED" : colors.primary;
  const { data: savedSettings, isLoading } = trpc.settings.get.useQuery();
  const saveMutation = trpc.settings.save.useMutation();
  const utils = trpc.useUtils();

  const [weightPhotos, setWeightPhotos] = useState(DEFAULTS.weightPhotos);
  const [weightHours, setWeightHours] = useState(DEFAULTS.weightHours);
  const [weightVisits, setWeightVisits] = useState(DEFAULTS.weightVisits);
  const [weightMaterials, setWeightMaterials] = useState(DEFAULTS.weightMaterials);
  const [weightQuality, setWeightQuality] = useState(DEFAULTS.weightQuality);
  const [weightDailyAvg, setWeightDailyAvg] = useState(DEFAULTS.weightDailyAvg);
  const [notifyLowHours, setNotifyLowHours] = useState(DEFAULTS.notifyLowHours);
  const [notifyMaterialRequest, setNotifyMaterialRequest] = useState(DEFAULTS.notifyMaterialRequest);
  const [notifyPhotoRejected, setNotifyPhotoRejected] = useState(DEFAULTS.notifyPhotoRejected);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setWeightPhotos(savedSettings.weightPhotos);
      setWeightHours(savedSettings.weightHours);
      setWeightVisits(savedSettings.weightVisits);
      setWeightMaterials(savedSettings.weightMaterials);
      setWeightQuality(savedSettings.weightQuality);
      setWeightDailyAvg(savedSettings.weightDailyAvg ?? 0);
      setNotifyLowHours(savedSettings.notifyLowHours);
      setNotifyMaterialRequest(savedSettings.notifyMaterialRequest);
      setNotifyPhotoRejected(savedSettings.notifyPhotoRejected);
    }
  }, [savedSettings]);

  const totalWeight = weightPhotos + weightHours + weightVisits + weightMaterials + weightQuality + weightDailyAvg;
  const weightsValid = totalWeight === 100;

  const handleSave = async () => {
    if (!weightsValid) {
      Alert.alert(
        "Pesos inválidos",
        `A soma dos pesos deve ser 100%. Atualmente está em ${totalWeight}%.`
      );
      return;
    }
    setSaving(true);
    try {
      await saveMutation.mutateAsync({
        weightPhotos,
        weightHours,
        weightVisits,
        weightMaterials,
        weightQuality,
        weightDailyAvg,
        notifyLowHours,
        notifyMaterialRequest,
        notifyPhotoRejected,
      });
      await utils.settings.get.invalidate();
      setDirty(false);
      Alert.alert("Salvo", "Configurações atualizadas com sucesso!");
    } catch {
      Alert.alert("Erro", "Não foi possível salvar as configurações.");
    } finally {
      setSaving(false);
    }
  };

  const mark = () => setDirty(true);

  const adjustWeight = (
    setter: (v: number) => void,
    current: number,
    delta: number
  ) => {
    const next = Math.max(0, Math.min(100, current + delta));
    setter(next);
    mark();
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Configurações</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Score e notificações
          </Text>
        </View>

        {/* ── PESOS DO SCORE ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pesos do Score</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Defina a importância de cada métrica no score composto. A soma deve ser 100%.
          </Text>

          {[
            { label: "Fotos Aprovadas", value: weightPhotos, setter: setWeightPhotos, icon: "camera-outline" as const },
            { label: "Horas Trabalhadas", value: weightHours, setter: setWeightHours, icon: "time-outline" as const },
            { label: "Visitas a PDVs", value: weightVisits, setter: setWeightVisits, icon: "storefront-outline" as const },
            { label: "Materiais Solicitados", value: weightMaterials, setter: setWeightMaterials, icon: "cube-outline" as const },
            { label: "Qualidade das Fotos", value: weightQuality, setter: setWeightQuality, icon: "star-outline" as const },
            { label: "Média Diária de Horas", value: weightDailyAvg, setter: setWeightDailyAvg, icon: "calendar-outline" as const },
          ].map(({ label, value, setter, icon }) => (
            <View key={label} style={styles.weightRow}>
              <View style={styles.weightLabel}>
                <Ionicons name={icon} size={16} color={colors.muted} />
                <Text style={[styles.weightLabelText, { color: colors.foreground }]}>{label}</Text>
              </View>
              <View style={styles.weightControls}>
                <TouchableOpacity
                  onPress={() => adjustWeight(setter, value, -5)}
                  style={[styles.weightBtn, { backgroundColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={16} color={colors.foreground} />
                </TouchableOpacity>
                <Text style={[styles.weightValue, { color: colors.foreground }]}>{value}%</Text>
                <TouchableOpacity
                  onPress={() => adjustWeight(setter, value, 5)}
                  style={[styles.weightBtn, { backgroundColor: colors.border }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={16} color={colors.foreground} />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Daily avg info note */}
          {weightDailyAvg > 0 && (
            <View style={[styles.infoNote, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
              <Text style={[styles.infoNoteText, { color: colors.muted }]}>
                Média Diária: referência de 8h/dia (dias úteis). Pontuação proporcional à média atingida.
              </Text>
            </View>
          )}

          {/* Total indicator */}
          <View
            style={[
              styles.totalRow,
              {
                backgroundColor: weightsValid ? colors.success + "15" : colors.error + "15",
                borderColor: weightsValid ? colors.success : colors.error,
              },
            ]}
          >
            <Ionicons
              name={weightsValid ? "checkmark-circle-outline" : "warning-outline"}
              size={16}
              color={weightsValid ? colors.success : colors.error}
            />
            <Text
              style={[
                styles.totalText,
                { color: weightsValid ? colors.success : colors.error },
              ]}
            >
              Total: {totalWeight}% {weightsValid ? "✓ Válido" : `— faltam ${100 - totalWeight}%`}
            </Text>
          </View>
        </View>

        {/* ── NOTIFICAÇÕES ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="notifications-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notificações</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Escolha quais eventos geram notificações push.
          </Text>

          {[
            { label: "Horas insuficientes", value: notifyLowHours, setter: setNotifyLowHours },
            { label: "Solicitação de material", value: notifyMaterialRequest, setter: setNotifyMaterialRequest },
            { label: "Foto rejeitada", value: notifyPhotoRejected, setter: setNotifyPhotoRejected },
          ].map(({ label, value, setter }) => (
            <View key={label} style={[styles.toggleRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.toggleLabel, { color: colors.foreground }]}>{label}</Text>
              <Switch
                value={value}
                onValueChange={(v) => { setter(v); mark(); }}
                trackColor={{ false: colors.border, true: colors.primary + "80" }}
                thumbColor={value ? colors.primary : colors.muted}
              />
            </View>
          ))}
        </View>

        {/* ── GESTÃO ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people-outline" size={20} color={accentColor} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Gestão</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Gerencie equipe, lojas e marcas cadastradas.
          </Text>
          {[
            { label: "Equipe", icon: "people-outline" as const, route: "/(tabs)/team", desc: "Promotores e gestores" },
            { label: "Lojas", icon: "storefront-outline" as const, route: "/(tabs)/stores", desc: "Pontos de venda cadastrados" },
            { label: "Marcas", icon: "pricetag-outline" as const, route: "/(tabs)/brands", desc: "Marcas gerenciadas" },
          ].map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.navRow, { borderTopColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIcon, { backgroundColor: accentColor + "15" }]}>
                <Ionicons name={item.icon} size={20} color={accentColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.navDesc, { color: colors.muted }]}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          ))}
          {isMaster && (
            <TouchableOpacity
              style={[styles.navRow, { borderTopColor: colors.border }]}
              onPress={() => router.push("/(tabs)/master-users" as any)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIcon, { backgroundColor: "#7C3AED15" }]}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.navLabel, { color: colors.foreground }]}>Usuários</Text>
                <Text style={[styles.navDesc, { color: colors.muted }]}>Gerenciar contas e permissões</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !dirty}
          style={[
            styles.saveBtn,
            {
              backgroundColor: dirty ? colors.primary : colors.border,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {dirty ? "Salvar Configurações" : "Sem alterações"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 16, gap: 16 },
  header: { paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 28, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 2 },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionDesc: { fontSize: 13, lineHeight: 18 },
  // Geo radius
  radiusGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  radiusChipText: { fontSize: 13, fontWeight: "600" },
  radiusInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  radiusInfoText: { fontSize: 13 },
  // Score weights
  weightRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  weightLabel: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  weightLabelText: { fontSize: 14 },
  weightControls: { flexDirection: "row", alignItems: "center", gap: 8 },
  weightBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  weightValue: { fontSize: 15, fontWeight: "700", width: 42, textAlign: "center" },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  totalText: { fontSize: 13, fontWeight: "600" },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  infoNoteText: { fontSize: 12, flex: 1, lineHeight: 17 },
  // Notifications
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 14, flex: 1 },
  // Nav rows (Gestão section)
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontSize: 15, fontWeight: "600" },
  navDesc: { fontSize: 12, marginTop: 1 },
  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
