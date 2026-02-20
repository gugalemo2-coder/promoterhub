import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ROLE_KEY = "promoterhub_app_role";

export default function RoleSelectScreen() {
  const { isAuthenticated, loading } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const setRoleMutation = trpc.auth.setRole.useMutation();

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  const handleSelectRole = async (role: "promoter" | "manager") => {
    setSelecting(true);
    try {
      await setRoleMutation.mutateAsync({ appRole: role });
      await AsyncStorage.setItem(ROLE_KEY, role);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Error setting role:", err);
      // Even if server fails, store locally and proceed
      await AsyncStorage.setItem(ROLE_KEY, role);
      router.replace("/(tabs)");
    } finally {
      setSelecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#1A56DB", "#0F3A8C"]} style={StyleSheet.absoluteFillObject} />

      <View style={styles.content}>
        <Text style={styles.title}>Como você vai usar o PromoterHub?</Text>
        <Text style={styles.subtitle}>Escolha seu perfil de acesso</Text>

        <View style={styles.cards}>
          {/* Promotor Card */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => handleSelectRole("promoter")}
            disabled={selecting}
          >
            <View style={[styles.cardIcon, { backgroundColor: "#EBF5FF" }]}>
              <Ionicons name="person-outline" size={36} color="#1A56DB" />
            </View>
            <Text style={styles.cardTitle}>Sou Promotor</Text>
            <Text style={styles.cardDesc}>
              Registro de ponto, envio de fotos, solicitação de materiais e acesso a arquivos
            </Text>
            <View style={styles.cardFeatures}>
              {["Registro de ponto", "Envio de fotos", "Solicitar materiais", "Ver arquivos"].map((f) => (
                <View key={f} style={styles.featureChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#0E9F6E" />
                  <Text style={styles.featureChipText}>{f}</Text>
                </View>
              ))}
            </View>
          </Pressable>

          {/* Gestor Card */}
          <Pressable
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
            onPress={() => handleSelectRole("manager")}
            disabled={selecting}
          >
            <View style={[styles.cardIcon, { backgroundColor: "#F0FFF4" }]}>
              <Ionicons name="briefcase-outline" size={36} color="#0E9F6E" />
            </View>
            <Text style={styles.cardTitle}>Sou Gestor</Text>
            <Text style={styles.cardDesc}>
              Painel completo de gestão, monitoramento de equipe, aprovações e alertas
            </Text>
            <View style={styles.cardFeatures}>
              {["Painel de gestão", "Controle de ponto", "Aprovar solicitações", "Alertas geo"].map((f) => (
                <View key={f} style={styles.featureChip}>
                  <Ionicons name="checkmark-circle" size={14} color="#0E9F6E" />
                  <Text style={styles.featureChipText}>{f}</Text>
                </View>
              ))}
            </View>
          </Pressable>
        </View>

        {selecting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Configurando seu perfil...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: "800", color: "#FFFFFF", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 16, color: "rgba(255,255,255,0.75)", textAlign: "center", marginBottom: 32 },
  cards: { gap: 16 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  cardIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  cardTitle: { fontSize: 22, fontWeight: "700", color: "#111827", marginBottom: 8 },
  cardDesc: { fontSize: 14, color: "#6B7280", lineHeight: 21, marginBottom: 16 },
  cardFeatures: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#F0FFF4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  featureChipText: { fontSize: 12, color: "#0E9F6E", fontWeight: "500" },
  loadingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", gap: 16, borderRadius: 20 },
  loadingText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
