import { useColors } from "@/hooks/use-colors";
import { useRole, CUSTOM_AUTH_KEY } from "@/lib/role-context";
import { appUploadAvatar } from "@/lib/_core/api";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ROLE_CONFIG = {
  master: { label: "Master", bg: "#7C3AED", light: "#EDE9FE" },
  manager: { label: "Gestor", bg: "#1A56DB", light: "#DBEAFE" },
  promoter: { label: "Promotor", bg: "#059669", light: "#D1FAE5" },
} as const;

const AVATAR_COLORS = [
  "#1A56DB", "#059669", "#7C3AED", "#D97706", "#DC2626",
  "#0891B2", "#BE185D", "#4F46E5", "#B45309", "#0F766E",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface UserHeaderProps {
  /** Nome completo do usuário logado */
  name: string | null | undefined;
  /** Saudação personalizada (ex: "Bom dia") */
  greeting?: string;
  /** Subtítulo abaixo da saudação */
  subtitle?: string;
  /** Callback para o botão de logout */
  onLogout?: () => void;
  /** Cor de fundo do cabeçalho */
  backgroundColor?: string;
}

export function UserHeader({
  name,
  greeting,
  subtitle,
  onLogout,
  backgroundColor,
}: UserHeaderProps) {
  const colors = useColors();
  const { appRole } = useRole();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Load avatar from stored custom auth user data
  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_AUTH_KEY).then((raw) => {
      if (!raw) return;
      try {
        const user = JSON.parse(raw);
        if (user?.avatarUrl) setAvatarUrl(user.avatarUrl);
      } catch { /* ignore */ }
    });
  }, []);

  const displayName = name ?? "Usuário";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  const avatarColor = getAvatarColor(displayName);
  const role = (appRole ?? "promoter") as keyof typeof ROLE_CONFIG;
  const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.promoter;
  const bg = backgroundColor ?? roleConfig.bg;

  const greetingText = greeting ?? (() => {
    const h = new Date().getHours();
    return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  })();

  const handleAvatarPress = useCallback(() => {
    Alert.alert(
      "Foto de Perfil",
      "Escolha uma opção",
      [
        {
          text: "Câmera",
          onPress: () => pickImage("camera"),
        },
        {
          text: "Galeria",
          onPress: () => pickImage("gallery"),
        },
        ...(avatarUrl ? [{ text: "Remover foto", style: "destructive" as const, onPress: handleRemoveAvatar }] : []),
        { text: "Cancelar", style: "cancel" as const },
      ]
    );
  }, [avatarUrl]);

  const pickImage = useCallback(async (source: "camera" | "gallery") => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === "camera") {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão necessária", "Precisamos de acesso à câmera para tirar a foto.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permissão necessária", "Precisamos de acesso à galeria para escolher a foto.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: "images",
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
          base64: true,
        });
      }

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Erro", "Não foi possível ler a imagem.");
        return;
      }

      setIsUploading(true);
      const fileType = asset.mimeType ?? "image/jpeg";
      const fileName = asset.fileName ?? `avatar_${Date.now()}.jpg`;

      const response = await appUploadAvatar(asset.base64, fileType, fileName);
      setAvatarUrl(response.avatarUrl);

      // Update stored user data with new avatarUrl
      const raw = await AsyncStorage.getItem(CUSTOM_AUTH_KEY);
      if (raw) {
        const user = JSON.parse(raw);
        await AsyncStorage.setItem(CUSTOM_AUTH_KEY, JSON.stringify({ ...user, avatarUrl: response.avatarUrl }));
      }

      Alert.alert("Sucesso", "Foto de perfil atualizada!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao fazer upload.";
      Alert.alert("Erro", msg);
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleRemoveAvatar = useCallback(async () => {
    setAvatarUrl(null);
    const raw = await AsyncStorage.getItem(CUSTOM_AUTH_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      await AsyncStorage.setItem(CUSTOM_AUTH_KEY, JSON.stringify({ ...user, avatarUrl: null }));
    }
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Left: greeting + name */}
      <View style={styles.left}>
        <Text style={styles.greeting} numberOfLines={1}>
          {greetingText}, {firstName}!
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        ) : (
          <View style={[styles.roleBadge, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Text style={styles.roleBadgeText}>{roleConfig.label}</Text>
          </View>
        )}
      </View>

      {/* Right: avatar + logout */}
      <View style={styles.right}>
        {/* Avatar circle — tappable to change photo */}
        <TouchableOpacity
          onPress={handleAvatarPress}
          activeOpacity={0.8}
          disabled={isUploading}
        >
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials || "?"}</Text>
            )}
            {/* Camera icon overlay */}
            {!isUploading && (
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={10} color="#fff" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Logout button */}
        {onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  left: {
    flex: 1,
    gap: 4,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
    overflow: "hidden",
    position: "relative",
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    padding: 4,
  },
});
