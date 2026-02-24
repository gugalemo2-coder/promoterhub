import { useColors } from "@/hooks/use-colors";
import { useRole, CUSTOM_AUTH_KEY } from "@/lib/role-context";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const { isAuthenticated, loading, refresh } = useAuth();
  const { appRole, isRoleLoading, setAppRole } = useRole();
  const colors = useColors();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedLogin = login.trim().toLowerCase();
    if (!trimmedLogin || !password) {
      Alert.alert("Campos obrigatórios", "Preencha o login e a senha.");
      return;
    }
    try {
      setIsLoading(true);
      const result = await Api.appLogin(trimmedLogin, password);

      // Save session token on native
      if (Platform.OS !== "web" && result.sessionToken) {
        await Auth.setSessionToken(result.sessionToken);
      }

      // Save user info
      const userInfo: Auth.User = {
        id: result.user.id,
        openId: `app_user_${result.user.id}`,
        name: result.user.name,
        email: null,
        loginMethod: "custom",
        lastSignedIn: new Date(),
      };
      await Auth.setUserInfo(userInfo);

      // Store custom auth marker with full user data
      await AsyncStorage.setItem(
        CUSTOM_AUTH_KEY,
        JSON.stringify({ ...result.user, sessionToken: result.sessionToken })
      );

      // Set role
      const role = result.appRole as "promoter" | "manager" | "master";
      await setAppRole(role);

      await refresh();
      router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer login.";
      Alert.alert("Erro", msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || isRoleLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && appRole) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={["#1A56DB", "#0F3A8C"]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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

          {/* Login Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Entrar</Text>

            {/* Login field */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Login"
                placeholderTextColor="#9CA3AF"
                value={login}
                onChangeText={setLogin}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Password field */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Senha"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>

            {/* Entrar button */}
            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                pressed && { opacity: 0.85 },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#1A56DB" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={20} color="#1A56DB" />
                  <Text style={styles.loginBtnText}>Entrar</Text>
                </>
              )}
            </Pressable>

            {/* Separator */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Cadastro button */}
            <Pressable
              style={({ pressed }) => [
                styles.registerBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push("/register")}
            >
              <Ionicons name="person-add-outline" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={styles.registerBtnText}>Criar conta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  logo: {
    width: 64,
    height: 64,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    textAlign: "center",
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 20,
    textAlign: "center",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 52,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#1A56DB",
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A56DB",
  },
  separator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    gap: 10,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  separatorText: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A56DB",
    borderRadius: 12,
    height: 52,
    gap: 8,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
