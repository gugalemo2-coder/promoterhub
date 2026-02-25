import { ScreenContainer } from "@/components/screen-container";
import { UserHeader } from "@/components/user-header";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import { useRole } from "@/lib/role-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type AppUser = {
  id: number;
  name: string;
  login: string;
  appRole: "promoter" | "manager" | "master";
  active: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  manager: "Gestor",
  promoter: "Promotor",
};

const ROLE_COLORS: Record<string, string> = {
  master: "#7C3AED",
  manager: "#1A56DB",
  promoter: "#059669",
};

export default function MasterUsersScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const { user, logout } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "promoter" | "manager" | "master">("all");

  // Guard: only master can access
  useEffect(() => {
    if (appRole !== "master") {
      router.replace("/(tabs)");
    }
  }, [appRole]);

  const fetchUsers = useCallback(async () => {
    try {
      const result = await Api.masterListUsers();
      setUsers(result.users as AppUser[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar usuários";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = useCallback(
    async (user: AppUser, newRole: "promoter" | "manager") => {
      const label = ROLE_LABELS[newRole];
      Alert.alert(
        "Alterar função",
        `Deseja alterar ${user.name} para ${label}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: async () => {
              try {
                await Api.masterUpdateRole(user.id, newRole);
                setUsers((prev) =>
                  prev.map((u) => (u.id === user.id ? { ...u, appRole: newRole } : u))
                );
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Erro ao alterar função";
                Alert.alert("Erro", msg);
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleResetPassword = useCallback(
    (user: AppUser) => {
      let newPassword = "";
      Alert.prompt(
        "Redefinir Senha",
        `Digite a nova senha para ${user.name}:`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Redefinir",
            style: "destructive",
            onPress: async (value: string | undefined) => {
              const pwd = (value ?? "").trim();
              if (pwd.length < 4) {
                Alert.alert("Erro", "A senha deve ter pelo menos 4 caracteres.");
                return;
              }
              try {
                const result = await Api.masterResetPassword(user.id, pwd);
                Alert.alert("Sucesso", result.message);
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Erro ao redefinir senha";
                Alert.alert("Erro", msg);
              }
            },
          },
        ],
        "secure-text"
      );
    },
    []
  );

  const handleToggleActive = useCallback(
    async (user: AppUser) => {
      const action = user.active ? "desativar" : "ativar";
      Alert.alert(
        `${user.active ? "Desativar" : "Ativar"} conta`,
        `Deseja ${action} a conta de ${user.name}?`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            style: user.active ? "destructive" : "default",
            onPress: async () => {
              try {
                await Api.masterToggleActive(user.id, !user.active);
                setUsers((prev) =>
                  prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u))
                );
              } catch (err) {
                const msg = err instanceof Error ? err.message : "Erro ao alterar status";
                Alert.alert("Erro", msg);
              }
            },
          },
        ]
      );
    },
    []
  );

  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.login.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.appRole === filterRole;
    return matchSearch && matchRole;
  });

  const renderUser = useCallback(
    ({ item }: { item: AppUser }) => {
      const roleColor = ROLE_COLORS[item.appRole] || "#6B7280";
      const isMaster = item.appRole === "master";

      return (
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Avatar + Info */}
          <View style={styles.userLeft}>
            <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
              <Text style={[styles.avatarText, { color: roleColor }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.userName, { color: colors.foreground }]} numberOfLines={1}>
                  {item.name}
                </Text>
                {!item.active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Inativo</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.userLogin, { color: colors.muted }]}>@{item.login}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
                <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                <Text style={[styles.roleText, { color: roleColor }]}>
                  {ROLE_LABELS[item.appRole]}
                </Text>
              </View>
            </View>
          </View>

          {/* Actions (not for master account) */}
          {!isMaster && (
            <View style={styles.actions}>
              {/* Role toggle */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() =>
                  handleRoleChange(
                    item,
                    item.appRole === "manager" ? "promoter" : "manager"
                  )
                }
              >
                <Ionicons
                  name={item.appRole === "manager" ? "person-outline" : "briefcase-outline"}
                  size={16}
                  color={colors.foreground}
                />
              </Pressable>

              {/* Reset password */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: "#FEF3C7" },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleResetPassword(item)}
              >
                <Ionicons name="key-outline" size={16} color="#D97706" />
              </Pressable>

              {/* Active toggle */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  {
                    backgroundColor: item.active
                      ? "#FEE2E2"
                      : "#D1FAE5",
                  },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => handleToggleActive(item)}
              >
                <Ionicons
                  name={item.active ? "close-circle-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={item.active ? "#DC2626" : "#059669"}
                />
              </Pressable>
            </View>
          )}
        </View>
      );
    },
    [colors, handleRoleChange, handleResetPassword, handleToggleActive]
  );

  const stats = {
    total: users.length,
    masters: users.filter((u) => u.appRole === "master").length,
    managers: users.filter((u) => u.appRole === "manager").length,
    promoters: users.filter((u) => u.appRole === "promoter").length,
    inactive: users.filter((u) => !u.active).length,
  };

  return (
    <ScreenContainer>
      <UserHeader
        name={user?.name}
        subtitle="Gerenciamento de usuários"
        onLogout={() => {
          Alert.alert("Sair da conta", "Deseja sair?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: async () => { try { await logout(); } catch {} finally { router.replace("/"); } } },
          ]);
        }}
        backgroundColor="#7C3AED"
      />
      {/* Stats row */}
      <View style={[styles.header, { backgroundColor: "#7C3AED" }]}>
        <View style={styles.statsRow}>
          {[
            { label: "Total", value: stats.total, color: "#fff" },
            { label: "Gestores", value: stats.managers, color: "#93C5FD" },
            { label: "Promotores", value: stats.promoters, color: "#6EE7B7" },
            { label: "Inativos", value: stats.inactive, color: "#FCA5A5" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Search + Filter */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            style={[styles.searchText, { color: colors.foreground }]}
            placeholder="Buscar por nome ou login..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        {/* Role filter chips */}
        <View style={styles.filterChips}>
          {(["all", "manager", "promoter"] as const).map((role) => (
            <Pressable
              key={role}
              style={[
                styles.chip,
                filterRole === role && { backgroundColor: "#1A56DB" },
                filterRole !== role && { backgroundColor: colors.border },
              ]}
              onPress={() => setFilterRole(role)}
            >
              <Text
                style={[
                  styles.chipText,
                  filterRole === role ? { color: "#fff" } : { color: colors.muted },
                ]}
              >
                {role === "all" ? "Todos" : role === "manager" ? "Gestores" : "Promotores"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1A56DB" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, index) => `user-${item.id}-${index}`}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Nenhum usuário encontrado
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  masterBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  masterBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  searchInput: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchText: {
    flex: 1,
    fontSize: 15,
  },
  filterChips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  userLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  inactiveBadge: {
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: {
    fontSize: 11,
    color: "#DC2626",
    fontWeight: "600",
  },
  userLogin: {
    fontSize: 13,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
    marginTop: 2,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});
