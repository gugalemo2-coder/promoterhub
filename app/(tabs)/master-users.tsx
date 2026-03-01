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
  Animated,
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
  appRole: "promoter" | "manager" | "master" | "supervisor";
  active: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  master: "Master",
  manager: "Gestor",
  supervisor: "Supervisor",
  promoter: "Promotor",
};

const ROLE_COLORS: Record<string, string> = {
  master: "#7C3AED",
  manager: "#1A56DB",
  supervisor: "#D97706",
  promoter: "#059669",
};

// ─── Toast de sucesso ─────────────────────────────────────────────────────────
function SuccessToast({ message, visible }: { message: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.delay(2500),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, message]);

  if (!visible) return null;

  return (
    <Animated.View style={[toastStyles.container, { opacity }]}>
      <View style={toastStyles.inner}>
        <Ionicons name="checkmark-circle" size={20} color="#fff" />
        <Text style={toastStyles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#059669",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
});

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
  onSelect: (role: "promoter" | "manager" | "supervisor") => void;
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

          {/* Cargo atual */}
          <View style={[modalStyles.currentRoleRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[modalStyles.currentRoleLabel, { color: colors.muted }]}>Cargo atual:</Text>
            <View style={[modalStyles.currentRoleBadge, { backgroundColor: ROLE_COLORS[user.appRole] + "20" }]}>
              <View style={[modalStyles.roleDot, { backgroundColor: ROLE_COLORS[user.appRole] }]} />
              <Text style={[modalStyles.currentRoleText, { color: ROLE_COLORS[user.appRole] }]}>
                {ROLE_LABELS[user.appRole]}
              </Text>
            </View>
          </View>

          {/* Linha 1: Gestor + Supervisor */}
          <View style={modalStyles.roleRow}>
            <TouchableOpacity
              style={[
                modalStyles.roleBtn,
                { borderColor: "#1A56DB", backgroundColor: user.appRole === "manager" ? "#1A56DB" : "transparent" },
              ]}
              onPress={() => onSelect("manager")}
            >
              <Ionicons name="briefcase-outline" size={20} color={user.appRole === "manager" ? "#fff" : "#1A56DB"} />
              <Text style={[modalStyles.roleBtnText, { color: user.appRole === "manager" ? "#fff" : "#1A56DB" }]}>Gestor</Text>
              {user.appRole === "manager" && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                modalStyles.roleBtn,
                { borderColor: "#D97706", backgroundColor: user.appRole === "supervisor" ? "#D97706" : "transparent" },
              ]}
              onPress={() => onSelect("supervisor")}
            >
              <Ionicons name="eye-outline" size={20} color={user.appRole === "supervisor" ? "#fff" : "#D97706"} />
              <Text style={[modalStyles.roleBtnText, { color: user.appRole === "supervisor" ? "#fff" : "#D97706" }]}>Supervisor</Text>
              {user.appRole === "supervisor" && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
          {/* Linha 2: Promotor (largura total) */}
          <TouchableOpacity
            style={[
              modalStyles.roleBtn,
              modalStyles.roleBtnFull,
              { borderColor: "#059669", backgroundColor: user.appRole === "promoter" ? "#059669" : "transparent" },
            ]}
            onPress={() => onSelect("promoter")}
          >
            <Ionicons name="person-outline" size={20} color={user.appRole === "promoter" ? "#fff" : "#059669"} />
            <Text style={[modalStyles.roleBtnText, { color: user.appRole === "promoter" ? "#fff" : "#059669" }]}>Promotor</Text>
            {user.appRole === "promoter" && <Ionicons name="checkmark-circle" size={16} color="#fff" />}
          </TouchableOpacity>
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
  const [filterRole, setFilterRole] = useState<"all" | "promoter" | "manager" | "master" | "supervisor">("all");

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: "" });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message });
    toastTimer.current = setTimeout(() => {
      setToast({ visible: false, message: "" });
    }, 3200);
  }, []);

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
  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; user: AppUser | null }>({
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
  const handleRoleSelect = useCallback(async (newRole: "promoter" | "manager" | "supervisor") => {
    const target = roleModal.user;
    if (!target) return;

    // If same role, just close
    if (target.appRole === newRole) {
      setRoleModal({ visible: false, user: null });
      return;
    }

    setRoleModal({ visible: false, user: null });
    try {
      const result = await Api.masterUpdateRole(target.id, newRole);
      const updatedUser = result.user as AppUser;
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, appRole: updatedUser.appRole } : u))
      );
      const newRoleLabel = ROLE_LABELS[newRole];
      showToast(`✓ ${target.name} agora é ${newRoleLabel}. O usuário verá o novo cargo no próximo login.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar função";
      Alert.alert("Erro", msg);
    }
  }, [roleModal.user, showToast]);

  const handlePasswordConfirm = useCallback(async (pwd: string) => {
    const target = passwordModal.user;
    if (!target) return;
    setPasswordModal({ visible: false, user: null });
    try {
      await Api.masterResetPassword(target.id, pwd);
      showToast(`✓ Senha de ${target.name} redefinida com sucesso!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao redefinir senha";
      Alert.alert("Erro", msg);
    }
  }, [passwordModal.user, showToast]);

  const handleToggleConfirm = useCallback(async () => {
    const target = toggleModal.user;
    if (!target) return;
    setToggleModal({ visible: false, user: null });
    try {
      const result = await Api.masterToggleActive(target.id, !target.active);
      const updatedUser = result.user as AppUser;
      setUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, active: updatedUser.active } : u))
      );
      const action = updatedUser.active ? "ativada" : "desativada";
      showToast(`✓ Conta de ${target.name} ${action} com sucesso!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao alterar status";
      Alert.alert("Erro", msg);
    }
  }, [toggleModal.user, showToast]);

  const handleDeleteConfirm = useCallback(async () => {
    const target = deleteModal.user;
    if (!target) return;
    setDeleteModal({ visible: false, user: null });
    try {
      const result = await Api.masterDeleteUser(target.id);
      setUsers((prev) => prev.filter((u) => u.id !== target.id));
      showToast(`✓ ${result.message}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir conta";
      Alert.alert("Erro", msg);
    }
  }, [deleteModal.user, showToast]);

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
              {/* Role badge + active status */}
              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: roleColor + "18" }]}>
                  <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
                  <Text style={[styles.roleText, { color: roleColor }]}>
                    {ROLE_LABELS[item.appRole]}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: item.active ? "#D1FAE5" : "#FEE2E2" }]}>
                  <View style={[styles.statusDot, { backgroundColor: item.active ? "#059669" : "#DC2626" }]} />
                  <Text style={[styles.statusText, { color: item.active ? "#059669" : "#DC2626" }]}>
                    {item.active ? "Ativo" : "Inativo"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Actions (not for master account) */}
          {!isMaster && (
            <View style={styles.actions}>
              {/* Role change */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#EEF2FF" }]}
                onPress={() => setRoleModal({ visible: true, user: item })}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={16}
                  color="#4F46E5"
                />
              </TouchableOpacity>

              {/* Reset password */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#FEF3C7" }]}
                onPress={() => setPasswordModal({ visible: true, user: item })}
                activeOpacity={0.7}
              >
                <Ionicons name="key-outline" size={16} color="#D97706" />
              </TouchableOpacity>

              {/* Active toggle */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: item.active ? "#FEE2E2" : "#D1FAE5" },
                ]}
                onPress={() => setToggleModal({ visible: true, user: item })}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.active ? "close-circle-outline" : "checkmark-circle-outline"}
                  size={16}
                  color={item.active ? "#DC2626" : "#059669"}
                />
              </TouchableOpacity>
              {/* Delete account */}
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#FEE2E2" }]}
                onPress={() => setDeleteModal({ visible: true, user: item })}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
              </TouchableOpacity>
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
    supervisors: users.filter((u) => u.appRole === "supervisor").length,
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
            { label: "Superv.", value: stats.supervisors, color: "#FDE68A" },
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
          {(["all", "manager", "supervisor", "promoter"] as const).map((role) => {
              const chipActive = filterRole === role;
              const chipColor = role === "manager" ? "#1A56DB" : role === "supervisor" ? "#D97706" : role === "promoter" ? "#059669" : "#4B5563";
              const chipLabel = role === "all" ? "Todos" : role === "manager" ? "Gestores" : role === "supervisor" ? "Supervisores" : "Promotores";
              return (
                <Pressable
                  key={role}
                  style={[
                    styles.chip,
                    chipActive ? { backgroundColor: chipColor } : { backgroundColor: colors.border },
                  ]}
                  onPress={() => setFilterRole(role)}
                >
                  <Text style={[styles.chipText, chipActive ? { color: "#fff" } : { color: colors.muted }]}>
                    {chipLabel}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      </View>

      {/* Legend */}
      <View style={[styles.legend, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: "#EEF2FF" }]}>
            <Ionicons name="briefcase-outline" size={13} color="#4F46E5" />
          </View>
          <Text style={[styles.legendText, { color: colors.muted }]}>Alterar cargo</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: "#FEF3C7" }]}>
            <Ionicons name="key-outline" size={13} color="#D97706" />
          </View>
          <Text style={[styles.legendText, { color: colors.muted }]}>Redefinir senha</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="close-circle-outline" size={13} color="#DC2626" />
          </View>
          <Text style={[styles.legendText, { color: colors.muted }]}>Ativar/Desativar</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendIcon, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="trash-outline" size={13} color="#DC2626" />
          </View>
          <Text style={[styles.legendText, { color: colors.muted }]}>Excluir conta</Text>
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

      {/* Toast de sucesso */}
      <SuccessToast message={toast.message} visible={toast.visible} />

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
      <ConfirmModal
        visible={deleteModal.visible}
        title="Excluir conta permanentemente"
        message={
          deleteModal.user
            ? `Tem certeza que deseja excluir a conta de ${deleteModal.user.name ?? deleteModal.user.login}?\n\nTodos os dados serão apagados: fotos, registros de ponto, solicitações e relatórios. Esta ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir permanentemente"
        confirmDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteModal({ visible: false, user: null })}
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
  currentRoleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currentRoleLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  currentRoleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentRoleText: {
    fontSize: 13,
    fontWeight: "700",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  roleBtnFull: {
    flex: 0,
    width: "100%",
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
  legend: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 16,
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
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
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
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
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
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
