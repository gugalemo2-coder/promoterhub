import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useRole } from "@/lib/role-context";

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color?: string;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  {
    label: "Fotos dos Promotores",
    icon: "images-outline",
    route: "/(tabs)/manager-photos",
    description: "Galeria com filtros por marca, loja, promotor e data",
  },
  {
    label: "Relatórios",
    icon: "bar-chart-outline",
    route: "/(tabs)/reports",
    description: "Relatórios de desempenho e produtividade",
  },
  {
    label: "Assinar Relatório",
    icon: "create-outline",
    route: "/(tabs)/sign-report",
    description: "Assinar digitalmente relatórios de visita",
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

export default function MoreMenuScreen() {
  const colors = useColors();
  const router = useRouter();
  const { appRole } = useRole();
  const isMaster = appRole === "master";

  const accentColor = isMaster ? "#7C3AED" : colors.primary;

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
              <View style={[styles.iconWrap, { backgroundColor: accentColor + "18" }]}>
                <Ionicons name={item.icon} size={26} color={accentColor} />
              </View>
              <View style={styles.cardText}>
                <Text style={[styles.cardLabel, { color: colors.foreground }]}>{item.label}</Text>
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
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardText: { flex: 1 },
  cardLabel: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
  cardDesc: { fontSize: 13, lineHeight: 18 },
});
