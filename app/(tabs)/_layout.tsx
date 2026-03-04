import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { Redirect, Tabs, useRouter } from "expo-router";
import { ActivityIndicator, Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { appRole, isRoleLoading } = useRole();
  const router = useRouter();

  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  if (authLoading || isRoleLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!appRole) {
    router.replace("/role-select" as any);
    return null;
  }

  const isManager = appRole === "manager" || appRole === "master";
  const isMaster = appRole === "master";
  const isPromoter = appRole === "promoter";
  const isSupervisor = appRole === "supervisor";

  const activeTint = isMaster ? "#7C3AED" : isSupervisor ? "#D97706" : colors.primary;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
        },
      }}
    >
      {/* ─── HOME / PAINEL ──────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: isPromoter ? "Início" : isSupervisor ? "Fotos" : "Painel",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name={isSupervisor ? "camera.fill" : "house.fill"} color={color} />
          ),
        }}
      />

      {/* ─── PROMOTER: Ponto ────────────────────────────────────────────── */}
      <Tabs.Screen
        name="clock"
        options={{
          title: "Ponto",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="clock.fill" color={color} />
          ),
          href: isPromoter ? undefined : null,
        }}
      />

      {/* ─── SUPERVISOR: Fotos (somente leitura) ─ hidden from tab bar ─── */}
      <Tabs.Screen
        name="supervisor-photos"
        options={{
          title: "Fotos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="photo.on.rectangle.angled" color={color} />
          ),
          href: null,
        }}
      />

      {/* ─── PROMOTER: Fotos ────────────────────────────────────────────── */}
      <Tabs.Screen
        name="photos"
        options={{
          title: "Fotos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="camera.fill" color={color} />
          ),
          href: isPromoter ? undefined : null,
        }}
      />

      {/* ─── SHARED TABS (promoter + manager, NOT supervisor) ───────────── */}
      <Tabs.Screen
        name="materials"
        options={{
          title: "Materiais",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="cube.box.fill" color={color} />
          ),
          href: isSupervisor ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: "Arquivos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="doc.fill" color={color} />
          ),
          href: isSupervisor ? null : undefined,
        }}
      />

      {/* ─── MANAGER/MASTER: Vencimento de Produtos ────────────────────── */}
      <Tabs.Screen
        name="manager-product-expiration"
        options={{
          title: "Vencimento",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="exclamationmark.triangle.fill" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />

      {/* ─── MANAGER/MASTER: Config (hidden — acessível pelo Menu) ───────────── */}
      <Tabs.Screen
        name="settings"
        options={{
          title: "Config",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="gear" color={color} />
          ),
          href: null,
        }}
      />

      {/* ─── MANAGER/MASTER: Menu ≡ ──────────────────────────────────────── */}
      <Tabs.Screen
        name="more-menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="line.3.horizontal" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />

      {/* ─── PROMOTER: Meu Perfil (ÚLTIMO) ──────────────────────────────── */}
      <Tabs.Screen
        name="my-profile"
        options={{
          title: "Meu Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.crop.circle.fill" color={color} />
          ),
          href: isPromoter ? undefined : null,
        }}
      />

      {/* ─── HIDDEN TABS (accessible via more-menu or direct navigation) ── */}
      <Tabs.Screen
        name="alerts"
        options={{ title: "Alertas", href: null }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: "Equipe", href: null }}
      />
      <Tabs.Screen
        name="stores"
        options={{ title: "Lojas", href: null }}
      />
      <Tabs.Screen
        name="brands"
        options={{ title: "Marcas", href: null }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: "Relatórios", href: null }}
      />
      <Tabs.Screen
        name="sign-report"
        options={{ title: "Assinar", href: null }}
      />
      <Tabs.Screen
        name="store-dashboard"
        options={{ title: "PDVs", href: null }}
      />
      <Tabs.Screen
        name="promoter-ranking"
        options={{ title: "Ranking", href: null }}
      />
      <Tabs.Screen
        name="store-visits"
        options={{ title: "Visitas", href: null }}
      />
      <Tabs.Screen
        name="master-users"
        options={{ title: "Usuários", href: null }}
      />
      <Tabs.Screen
        name="manager-photos"
        options={{ title: "Fotos Gestor", href: null }}
      />
      <Tabs.Screen
        name="offline-queue"
        options={{ title: "Offline", href: null }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: "Avisos", href: null }}
      />
      <Tabs.Screen
        name="audit-clock"
        options={{ title: "Auditoria de Ponto", href: null }}
      />
      <Tabs.Screen
        name="store-time"
        options={{ title: "Tempo por Loja", href: null }}
      />
      <Tabs.Screen
        name="product-expiration"
        options={{ title: "Vencimento Produtos", href: isPromoter ? undefined : null }}
      />
    </Tabs>
  );
}
