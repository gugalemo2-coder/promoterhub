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
    // Navigate to role selection using router to avoid type issues
    router.replace("/role-select" as any);
    return null;
  }

  const isManager = appRole === "manager";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
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
      {/* ─── PROMOTER TABS ─────────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{
          title: isManager ? "Painel" : "Início",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="clock"
        options={{
          title: "Ponto",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="clock.fill" color={color} />
          ),
          href: isManager ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="photos"
        options={{
          title: isManager ? "Fotos" : "Fotos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="camera.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="materials"
        options={{
          title: isManager ? "Materiais" : "Materiais",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="cube.box.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: "Arquivos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="doc.fill" color={color} />
          ),
        }}
      />
      {/* ─── MANAGER-ONLY TABS ─────────────────────────────────────────────── */}
      <Tabs.Screen
        name="team"
        options={{
          title: "Equipe",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="person.3.fill" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bell.fill" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="stores"
        options={{
          title: "Lojas",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="storefront.fill" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Relatórios",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chart.line.uptrend.xyaxis" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="brands"
        options={{
          title: "Marcas",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="tag.circle.fill" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="sign-report"
        options={{
          title: "Assinar",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="signature" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="store-dashboard"
        options={{
          title: "PDVs",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="chart.bar.xaxis.ascending" color={color} />
          ),
          href: isManager ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="offline-queue"
        options={{
          title: "Offline",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="arrow.triangle.2.circlepath" color={color} />
          ),
          href: isManager ? null : undefined,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Avisos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="bell.badge.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
