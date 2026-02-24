import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

type NotifType =
  | "geo_alert"
  | "material_request"
  | "material_approved"
  | "material_rejected"
  | "new_file"
  | "photo_approved"
  | "photo_rejected"
  | "system";

type FilterType = "all" | "unread" | NotifType;

const TYPE_CONFIG: Record<NotifType, { icon: string; color: string; label: string }> = {
  geo_alert:          { icon: "📍", color: "#EF4444", label: "Alerta de Geo" },
  material_request:   { icon: "📦", color: "#F59E0B", label: "Solicitação" },
  material_approved:  { icon: "✅", color: "#22C55E", label: "Aprovado" },
  material_rejected:  { icon: "❌", color: "#EF4444", label: "Rejeitado" },
  new_file:           { icon: "📄", color: "#3B82F6", label: "Novo Arquivo" },
  photo_approved:     { icon: "🖼️", color: "#22C55E", label: "Foto Aprovada" },
  photo_rejected:     { icon: "🖼️", color: "#EF4444", label: "Foto Rejeitada" },
  system:             { icon: "🔔", color: "#6B7280", label: "Sistema" },
};

function timeAgo(date: Date): string {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState<FilterType>("all");
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications, isLoading, refetch } = trpc.notifications.list.useQuery({ limit: 100 });
  const { data: unreadCount, refetch: refetchCount } = trpc.notifications.unreadCount.useQuery();

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => { refetch(); refetchCount(); },
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => { refetch(); refetchCount(); },
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchCount();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    await refetchCount();
    setRefreshing(false);
  };

  const handleMarkRead = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markReadMutation.mutate({ id });
  };

  const handleMarkAllRead = () => {
    Alert.alert("Marcar todas como lidas", "Deseja marcar todas as notificações como lidas?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Confirmar",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          markAllReadMutation.mutate();
        },
      },
    ]);
  };

  const filtered = (notifications ?? []).filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "all") return true;
    return n.type === filter;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todas" },
    { key: "unread", label: `Não lidas${unreadCount ? ` (${unreadCount})` : ""}` },
    { key: "geo_alert", label: "📍 Geo" },
    { key: "material_request", label: "📦 Material" },
    { key: "new_file", label: "📄 Arquivos" },
  ];

  return (
    <ScreenContainer>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 0.5,
          borderBottomColor: colors.border,
        }}
      >
        <View>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.foreground }}>
            Notificações
          </Text>
          {unreadCount ? (
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
            </Text>
          ) : (
            <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              Tudo em dia
            </Text>
          )}
        </View>
        {(unreadCount ?? 0) > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, color: colors.primary, fontWeight: "600" }}>
              Marcar todas
            </Text>
          </Pressable>
        )}
      </View>

      {/* Filtros */}
      <View>
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          renderItem={({ item }) => {
            const active = filter === item.key;
            return (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setFilter(item.key);
                }}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: active ? colors.primary : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: active ? "#fff" : colors.foreground,
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Lista */}
      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Text style={{ fontSize: 48 }}>🔕</Text>
          <Text style={{ fontSize: 18, fontWeight: "600", color: colors.foreground }}>
            Nenhuma notificação
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center", paddingHorizontal: 40 }}>
            {filter === "unread" ? "Você está em dia com tudo!" : "Nenhuma notificação nesta categoria."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const config = TYPE_CONFIG[item.type as NotifType] ?? TYPE_CONFIG.system;
            return (
              <Pressable
                onPress={() => !item.isRead && handleMarkRead(item.id)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingHorizontal: 20,
                  paddingVertical: 14,
                  backgroundColor: !item.isRead
                    ? `${config.color}10`
                    : colors.background,
                  borderBottomWidth: 0.5,
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                {/* Ícone */}
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: `${config.color}20`,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 14,
                    flexShrink: 0,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                </View>

                {/* Conteúdo */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: item.isRead ? "500" : "700",
                        color: colors.foreground,
                        flex: 1,
                        marginRight: 8,
                      }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, flexShrink: 0 }}>
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      color: item.isRead ? colors.muted : colors.foreground,
                      lineHeight: 18,
                    }}
                    numberOfLines={2}
                  >
                    {item.body}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 8 }}>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        backgroundColor: `${config.color}20`,
                      }}
                    >
                      <Text style={{ fontSize: 11, color: config.color, fontWeight: "600" }}>
                        {config.label}
                      </Text>
                    </View>
                    {!item.isRead && (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: config.color,
                        }}
                      />
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
