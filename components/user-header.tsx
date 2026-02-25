import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
        {/* Avatar circle */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials || "?"}</Text>
        </View>

        {/* Logout button */}
        {onLogout && (
          <Pressable
            onPress={onLogout}
            style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  logoutBtn: {
    padding: 4,
  },
});
