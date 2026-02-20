import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { startOAuthLogin } from "@/constants/oauth";

export default function LoginScreen() {
  const { isAuthenticated, loading } = useAuth();
  const colors = useColors();

  const handleSignIn = async () => {
    await startOAuthLogin();
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#1A56DB", "#0F3A8C"]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Logo & Brand */}
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <Text style={styles.appName}>PromoterHub</Text>
        <Text style={styles.tagline}>Gestão inteligente de equipe de promotores</Text>
      </View>

      {/* Features */}
      <View style={styles.features}>
        {[
          { icon: "location-outline", text: "Registro de ponto com geolocalização" },
          { icon: "camera-outline", text: "Envio de fotos por marca" },
          { icon: "cube-outline", text: "Controle de materiais e estoques" },
          { icon: "shield-checkmark-outline", text: "Monitoramento inteligente" },
        ].map((feat, i) => (
          <View key={i} style={styles.featureRow}>
            <Ionicons name={feat.icon as any} size={20} color="rgba(255,255,255,0.8)" />
            <Text style={styles.featureText}>{feat.text}</Text>
          </View>
        ))}
      </View>

      {/* Login Button */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.85 }]}
          onPress={handleSignIn}
        >
          <Ionicons name="log-in-outline" size={22} color="#1A56DB" />
          <Text style={styles.loginBtnText}>Entrar com Manus</Text>
        </Pressable>
        <Text style={styles.disclaimer}>
          Acesso seguro via autenticação OAuth
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  logo: { width: 80, height: 80 },
  appName: { fontSize: 34, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.5 },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.75)", marginTop: 8, textAlign: "center", paddingHorizontal: 40 },
  features: { paddingHorizontal: 40, paddingBottom: 32, gap: 14 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  featureText: { fontSize: 15, color: "rgba(255,255,255,0.85)" },
  footer: { paddingHorizontal: 32, paddingBottom: 48, gap: 12 },
  loginBtn: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  loginBtnText: { fontSize: 17, fontWeight: "700", color: "#1A56DB" },
  disclaimer: { textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.55)" },
});
