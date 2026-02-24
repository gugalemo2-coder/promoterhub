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
import { trpc } from "@/lib/trpc";

// Default values matching the DB defaults
const DEFAULTS = {
  geoRadiusKm: 0.5,
  weightPhotos: 30,
  weightHours: 25,
  weightVisits: 25,
  weightMaterials: 10,
  weightQuality: 10,
  notifyGeoAlert: true,
  notifyLowHours: true,
  notifyMaterialRequest: true,
  notifyPhotoRejected: true,
};

const GEO_RADIUS_OPTIONS = [0.1, 0.25, 0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0];

export default function SettingsScreen() {
  const colors = useColors();
  const { data: savedSettings, isLoading } = trpc.settings.get.useQuery();
  const saveMutation = trpc.settings.save.useMutation();
  const utils = trpc.useUtils();

  const [geoRadiusKm, setGeoRadiusKm] = useState(DEFAULTS.geoRadiusKm);
  const [weightPhotos, setWeightPhotos] = useState(DEFAULTS.weightPhotos);
  const [weightHours, setWeightHours] = useState(DEFAULTS.weightHours);
  const [weightVisits, setWeightVisits] = useState(DEFAULTS.weightVisits);
  const [weightMaterials, setWeightMaterials] = useState(DEFAULTS.weightMaterials);
  const [weightQuality, setWeightQuality] = useState(DEFAULTS.weightQuality);
  const [notifyGeoAlert, setNotifyGeoAlert] = useState(DEFAULTS.notifyGeoAlert);
  const [notifyLowHours, setNotifyLowHours] = useState(DEFAULTS.notifyLowHours);
  const [notifyMaterialRequest, setNotifyMaterialRequest] = useState(DEFAULTS.notifyMaterialRequest);
  const [notifyPhotoRejected, setNotifyPhotoRejected] = useState(DEFAULTS.notifyPhotoRejected);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (savedSettings) {
      setGeoRadiusKm(parseFloat(savedSettings.geoRadiusKm ?? "0.5"));
      setWeightPhotos(savedSettings.weightPhotos);
      setWeightHours(savedSettings.weightHours);
      setWeightVisits(savedSettings.weightVisits);
      setWeightMaterials(savedSettings.weightMaterials);
      setWeightQuality(savedSettings.weightQuality);
      setNotifyGeoAlert(savedSettings.notifyGeoAlert);
      setNotifyLowHours(savedSettings.notifyLowHours);
      setNotifyMaterialRequest(savedSettings.notifyMaterialRequest);
      setNotifyPhotoRejected(savedSettings.notifyPhotoRejected);
    }
  }, [savedSettings]);

  const totalWeight = weightPhotos + weightHours + weightVisits + weightMaterials + weightQuality;
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
        geoRadiusKm: geoRadiusKm.toFixed(2),
        weightPhotos,
        weightHours,
        weightVisits,
        weightMaterials,
        weightQuality,
        notifyGeoAlert,
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
            Geofencing, score e notificações
          </Text>
        </View>

        {/* ── GEOFENCING ── */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Raio de Geofencing</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.muted }]}>
            Distância máxima permitida da loja para registrar ponto.
          </Text>
          <View style={styles.radiusGrid}>
            {GEO_RADIUS_OPTIONS.map((r) => {
              const active = geoRadiusKm === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => { setGeoRadiusKm(r); mark(); }}
                  style={[
                    styles.radiusChip,
                    {
                      backgroundColor: active ? colors.primary : colors.background,
                      borderColor: active ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      { color: active ? "#fff" : colors.foreground },
                    ]}
                  >
                    {r < 1 ? `${r * 1000}m` : `${r}km`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.radiusInfo, { backgroundColor: colors.primary + "15" }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.radiusInfoText, { color: colors.primary }]}>
              Raio atual: <Text style={{ fontWeight: "700" }}>{geoRadiusKm < 1 ? `${geoRadiusKm * 1000}m` : `${geoRadiusKm}km`}</Text>
            </Text>
          </View>
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
            { label: "Alerta de geofencing", value: notifyGeoAlert, setter: setNotifyGeoAlert },
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
  // Notifications
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: { fontSize: 14, flex: 1 },
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
