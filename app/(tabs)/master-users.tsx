import { ScreenContainer } from "@/components/screen-container";
import { UserHeader } from "@/components/user-header";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import * as Api from "@/lib/_core/api";
import { useRole } from "@/lib/role-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

// ─── Modal de confirmação genérico (substitui Alert.alert cross-platform) ────
function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  confirmDestructive = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.box, { backgroundColor: colors.surface }]}>
          <Text style={[modalStyles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[modalStyles.message, { color: colors.muted }]}>{message}</Text>
          <View style={modalStyles.row}>
            <TouchableOpacity
              style={[modalStyles.btn, { backgroundColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[modalStyles.btnText, { color: colors.foreground }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.btn,
                { backgroundColor: confirmDestructive ? "#EF4444" : "#1A56DB" },
              ]}
              onPress={onConfirm}
            >
              <Text style={[modalStyles.btnText, { color: "#fff" }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Modal de input de senha (substitui Alert.prompt cross-platform) ──────────
function PasswordModal({
  visible,
  userName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  userName: string;
  onConfirm: (pwd: string) => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  const [value, setValue] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue("");
      setShowPwd(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const handleConfirm = () => {
    const pwd = value.trim();
    if (pwd.length < 4) {
      Alert.alert("Erro", "A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    onConfirm(pwd);
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={modalStyles.overlay}
      >
        <View style={[modalStyles.box, { backgroundColor: colors.surface }]}>
          <Text style={[modalStyles.title, { color: colors.foreground }]}>Redefinir Senha</Text>
          <Text style={[modalStyles.message, { color: colors.muted }]}>
            Nova senha para {userName}:
          </Text>
          <View
            style={[
              modalStyles.inputRow,
              { borderColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[modalStyles.input, { color: colors.foreground }]}
              placeholder="Nova senha (mín. 4 caracteres)"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPwd}
              value={value}
              onChangeText={setValue}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={modalStyles.eyeBtn}>
              <Ionicons
                name={showPwd ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.muted}
              />
            </TouchableOpacity>
          </View>
          <View style={modalStyles.row}>
            <TouchableOpacity
              style={[modalStyles.btn, { backgroundColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[modalStyles.btnText, { color: colors.foreground }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.btn, { backgroundColor: "#D97706" }]}
              onPress={handleConfirm}
            >
              <Text style={[modalStyles.btnText, { color: "#fff" }]}>Redefinir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal de seleção de cargo ────────────────────────────────────────────────
function RoleModal({
  visible,
  user,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  user: AppUser | null;
  onSelect: (role: "promoter" | "manager") => void;
  onCancel: () => void;
}) {
  const colors = useColors();
  if (!user) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.box, { backgroundColor: colors.surface }]}>
          <Text style={[modalStyles.title, { color: colors.foreground }]}>Alterar Função</Text>
          <Text style={[modalStyles.message, { color: colors.muted }]}>
            Selecione a nova função para {user.name}:
          </Text>
          <View style={modalStyles.roleRow}>
            <TouchableOpacity
              style={[
                modalStyles.roleBtn,
                { borderColor: "#1A56DB", backgroundColor: user.appRole === "manager" ? "#1A56DB" : "transparent" },
              ]}
              onPress={() => onSelect("manager")}
            >
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={user.appRole === "manager" ? "#fff" : "#1A56DB"}
              />
              <Text
                style={[
                  modalStyles.roleBtnText,
                  { color: user.appRole === "manager" ? "#fff" : "#1A56DB" },
                ]}
              >
                Gestor
              </Text>
              {user.appRole === "manager" && (
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.roleBtn,
                { borderColor: "#059669", backgroundColor: user.appRole === "promoter" ? "#059669" : "transparent" },
              ]}
              onPress={() => onSelect("promoter")}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={user.appRole === "promoter" ? "#fff" : "#059669"}
              />
              <Text
                style={[
                  modalStyles.roleBtnText,
                  { color: user.appRole === "promoter" ? "#fff" : "#059669" },
                ]}
              >
                Promotor
              </Text>
              {user.appRole === "promoter" && (
                <Ionicons name="checkmark-circle" size={16} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[modalStyles.cancelFullBtn, { backgroundColor: colors.border }]}
            onPress={onCancel}
          >
            <Text style={[modalStyles.btnText, { color: colors.foreground }]}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function MasterUsersScreen() {
  const colors = useColors();
  const { appRole } = useRole();
  const { user, logout } = useAuth();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "promoter" | "manager" | "master">("all");

  // Modal states
  const [roleModal, setRoleModal] = useState<{ visible: boolean; user: AppUser | null }>({
    visible: false,
    user: null,
  });
  const [passwordModal, setPasswordModal] = useState<{ visible: boolean; user: AppUser | null }>({
    visible: false,
    user: null,
  });
  const [toggleModal, setToggleModal] = useState<{ visible: boolean; user: AppUser | null }>({
    visible: false,
    user: null,
  });

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

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRoleSelect = useCallback(async (newRole: "promoter" | "manager") => {
    const target = roleModal.user;
    if (!target) return;
    setRoleModal({ visible: false, user: null });
    try {
      await Api.masterUpdateRole(target.id, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, appRole: newRole } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar função";
      Alert.alert("Erro", msg);
    }
  }, [roleModal.user]);

  const handlePasswordConfirm = useCallback(async (pwd: string) => {
    const target = passwordModal.user;
    if (!target) return;
    setPasswordModal({ visible: false, user: null });
    try {
      const result = await Api.masterResetPassword(target.id, pwd);
      Alert.alert("Sucesso", result.message ?? "Senha redefinida com sucesso!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao redefinir senha";
      Alert.alert("Erro", msg);
    }
  }, [passwordModal.user]);

  const handleToggleConfirm = useCallback(async () => {
    const target = toggleModal.user;
    if (!target) return;
    setToggleModal({ visible: false, user: null });
    try {
      await Api.masterToggleActive(target.id, !target.active);
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, active: !u.active } : u))
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar status";
      Alert.alert("Erro", msg);
    }
  }, [toggleModal.user]);

  // ── Filtro ───────────────────────────────────────────────────────────────────
  const filtered = users.filter((u) => {
    const matchSearch =
      !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.login.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.appRole === filterRole;
    return matchSearch && matchRole;
  });

  // ── Render item ──────────────────────────────────────────────────────────────
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
              {/* Role change */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setRoleModal({ visible: true, user: item })}
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
                onPress={() => setPasswordModal({ visible: true, user: item })}
              >
                <Ionicons name="key-outline" size={16} color="#D97706" />
              </Pressable>

              {/* Active toggle */}
              <Pressable
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: item.active ? "#FEE2E2" : "#D1FAE5" },
                  pressed && { opacity: 0.7 },
                ]}
                onPress={() => setToggleModal({ visible: true, user: item })}
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
    [colors]
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
          const doLogout = async () => {
            try { await logout(); } catch {} finally { router.replace("/"); }
          };
          if (Platform.OS === "web") {
            doLogout();
          } else {
            Alert.alert("Sair da conta", "Deseja sair?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair", style: "destructive", onPress: doLogout },
            ]);
          }
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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

      {/* Modals */}
      <RoleModal
        visible={roleModal.visible}
        user={roleModal.user}
        onSelect={handleRoleSelect}
        onCancel={() => setRoleModal({ visible: false, user: null })}
      />

      <PasswordModal
        visible={passwordModal.visible}
        userName={passwordModal.user?.name ?? ""}
        onConfirm={handlePasswordConfirm}
        onCancel={() => setPasswordModal({ visible: false, user: null })}
      />

      <ConfirmModal
        visible={toggleModal.visible}
        title={toggleModal.user?.active ? "Desativar conta" : "Ativar conta"}
        message={
          toggleModal.user
            ? `Deseja ${toggleModal.user.active ? "desativar" : "ativar"} a conta de ${toggleModal.user.name}?`
            : ""
        }
        confirmLabel={toggleModal.user?.active ? "Desativar" : "Ativar"}
        confirmDestructive={toggleModal.user?.active ?? false}
        onConfirm={handleToggleConfirm}
        onCancel={() => setToggleModal({ visible: false, user: null })}
      />
    </ScreenContainer>
  );
}

// ─── Estilos dos modais ───────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  box: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    fontSize: 15,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: 48,
  },
  eyeBtn: {
    padding: 4,
  },
  roleRow: {
    flexDirection: "row",
    gap: 12,
  },
  roleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  roleBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  cancelFullBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});

// ─── Estilos da tela ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
