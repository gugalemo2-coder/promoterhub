import { useColors } from "@/hooks/use-colors";
import { useRole, CUSTOM_AUTH_KEY } from "@/lib/role-context";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/hooks/use-auth";

export default function RegisterScreen() {
  const { refresh } = useAuth();
  const { setAppRole } = useRole();
  const colors = useColors();

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Preview the generated login
  const previewLogin = name
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const handleRegister = async () => {
    if (name.trim().length < 2) {
      Alert.alert("Nome inválido", "O nome deve ter pelo menos 2 caracteres.");
      return;
    }
    if (password.length < 4) {
      Alert.alert("Senha inválida", "A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Senhas diferentes", "As senhas não coincidem.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await Api.appRegister(name.trim(), password);

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

      // Store custom auth marker
      await AsyncStorage.setItem(
        CUSTOM_AUTH_KEY,
        JSON.stringify({ ...result.user, sessionToken: result.sessionToken })
      );

      // Set role (always promoter for new accounts)
      await setAppRole("promoter");

      await refresh();

      Alert.alert(
        "Conta criada!",
        `Seu login é: ${result.generatedLogin}\n\nGuarde esse login para acessar o app.`,
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }]
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar conta.";
      Alert.alert("Erro", msg);
    } finally {
      setIsLoading(false);
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Criar conta</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Novo cadastro</Text>
            <Text style={styles.formSubtitle}>
              Seu login será gerado automaticamente a partir do seu nome.
            </Text>

            {/* Name field */}
            <Text style={styles.label}>Nome completo</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: João Silva"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            {/* Login preview */}
            {previewLogin.length >= 2 && (
              <View style={styles.loginPreview}>
                <Ionicons name="information-circle-outline" size={16} color="#1A56DB" />
                <Text style={styles.loginPreviewText}>
                  Seu login será: <Text style={styles.loginPreviewValue}>{previewLogin}</Text>
                </Text>
              </View>
            )}

            {/* Password field */}
            <Text style={[styles.label, { marginTop: 12 }]}>Senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Mínimo 4 caracteres"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>

            {/* Confirm password */}
            <Text style={[styles.label, { marginTop: 4 }]}>Confirmar senha</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Repita a senha"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />
              <Pressable onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6B7280"
                />
              </Pressable>
            </View>

            {/* Cadastrar button */}
            <Pressable
              style={({ pressed }) => [
                styles.registerBtn,
                pressed && { opacity: 0.85 },
                isLoading && { opacity: 0.7 },
              ]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                  <Text style={styles.registerBtnText}>Criar conta</Text>
                </>
              )}
            </Pressable>

            {/* Back to login */}
            <Pressable
              style={({ pressed }) => [styles.backToLoginBtn, pressed && { opacity: 0.7 }]}
              onPress={() => router.back()}
            >
              <Text style={styles.backToLoginText}>Já tenho conta — Entrar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
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
    marginBottom: 6,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    height: 52,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
  },
  eyeBtn: { padding: 4 },
  loginPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
    gap: 6,
  },
  loginPreviewText: {
    fontSize: 13,
    color: "#374151",
  },
  loginPreviewValue: {
    fontWeight: "700",
    color: "#1A56DB",
  },
  registerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A56DB",
    borderRadius: 12,
    height: 52,
    gap: 8,
    marginTop: 8,
  },
  registerBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  backToLoginBtn: {
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  },
  backToLoginText: {
    fontSize: 14,
    color: "#1A56DB",
    fontWeight: "600",
  },
});
