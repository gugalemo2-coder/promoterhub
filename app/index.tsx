import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/lib/role-context";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useColors } from "@/hooks/use-colors";

/**
 * Root entry point — redireciona para login ou tabs conforme estado de autenticação.
 * Isso garante que ao abrir o link do app, o usuário veja o login se não tiver sessão ativa.
 */
export default function Index() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { appRole, isRoleLoading } = useRole();
  const colors = useColors();

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
    return <Redirect href="/role-select" />;
  }

  return <Redirect href="/(tabs)" />;
}
