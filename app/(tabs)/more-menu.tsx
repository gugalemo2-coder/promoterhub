import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";
import { trpc } from "@/lib/trpc";

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color?: string;
  description: string;
  badge?: number;
};

export default function MoreMenuScreen() {
  const colors = useColors();
  const router = useRouter();
  const { appRole } = useRole();
  const isMaster = appRole === "master";
  const accentColor = isMaster ? "#7C3AED" : colors.primary;

  // Contador de fotos pendentes — atualiza a cada 30s
  const { data: pendingCount } = trpc.photos.countPending.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const MENU_ITEMS: MenuItem[] = [
    {
      label: "Fotos dos Promotores",
      icon: "images-outline",
      route: "/(tabs)/manager-photos",
      description: "Galeria com filtros por marca, loja, promotor e data",
      badge: pendingCount ?? 0,
    },
    {
      label: "Relatórios",
      icon: "bar-chart-outline",
      route: "/(tabs)/reports",
      description: "Relatórios de desempenho e produtividade",
    },
    {
      label: "Dashboard PDVs",
      icon: "storefront-outline",
      route: "/(tabs)/store-dashboard",
      description: "Visão geral de todos os pontos de venda",
    },
    {
      label: "Ranking de Promotores",
      icon: "trophy-outline",
      route: "/(tabs)/promoter-ranking",
      description: "Classificação por score de desempenho",
    },
    {
      label: "Histórico de Visitas",
      icon: "time-outline",
      route: "/(tabs)/store-visits",
      description: "Registro de todas as visitas a PDVs",
    },
  ];

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Menu</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Ferramentas e relatórios avançados
          </Text>
        </View>

        {/* Menu Items */}
        <View style={styles.list}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
            >
              {/* Icon with optional badge */}
              <View style={styles.iconContainer}>
                <View style={[styles.iconWrap, { backgroundColor: accentColor + "18" }]}>
                  <Ionicons name={item.icon} size={26} color={accentColor} />
                </View>
                {(item.badge ?? 0) > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {(item.badge ?? 0) > 99 ? "99+" : String(item.badge)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.cardText}>
                <View style={styles.labelRow}>
                  <Text style={[styles.cardLabel, { color: colors.foreground }]}>{item.label}</Text>
                  {(item.badge ?? 0) > 0 && (
                    <View style={styles.inlineBadge}>
                      <Text style={styles.inlineBadgeText}>
                        {(item.badge ?? 0) > 99 ? "99+" : item.badge} pendente{item.badge !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDesc, { color: colors.muted }]}>{item.description}</Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 0 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14 },
  list: { gap: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconContainer: {
    position: "relative",
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E02424",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
  },
  cardText: { flex: 1 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    flexWrap: "wrap",
  },
  cardLabel: { fontSize: 16, fontWeight: "600" },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  inlineBadge: {
    backgroundColor: "#E02424",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  inlineBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
