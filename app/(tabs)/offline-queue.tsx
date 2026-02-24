/**
 * OfflineQueueScreen
 *
 * Tela para o Promotor visualizar e gerenciar a fila de ações offline.
 * Acessível via aba "Offline" quando há ações pendentes ou falhas.
 */

import { ScreenContainer } from "@/components/screen-container";
import { useOfflineQueue, type OfflineAction } from "@/hooks/use-offline-queue";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/use-auth";

// ─── Action type labels ───────────────────────────────────────────────────────
const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  clock_entry: { label: "Registro de entrada", icon: "log-in-outline", color: "#10B981" },
  clock_exit: { label: "Registro de saída", icon: "log-out-outline", color: "#F59E0B" },
  photo_upload: { label: "Envio de foto", icon: "camera-outline", color: "#8B5CF6" },
  material_request: { label: "Solicitação de material", icon: "cube-outline", color: "#3B82F6" },
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, colors }: { status: OfflineAction["status"]; colors: ReturnType<typeof useColors> }) {
  const config = {
    pending: { label: "Pendente", bg: colors.warning + "22", text: colors.warning },
    syncing: { label: "Sincronizando", bg: colors.primary + "22", text: colors.primary },
    failed: { label: "Falhou", bg: colors.error + "22", text: colors.error },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

// ─── Action card ──────────────────────────────────────────────────────────────
function ActionCard({
  item,
  colors,
  onDelete,
}: {
  item: OfflineAction;
  colors: ReturnType<typeof useColors>;
  onDelete: (id: string) => void;
}) {
  const meta = ACTION_LABELS[item.type] ?? { label: item.type, icon: "help-outline", color: colors.muted };
  const createdAt = new Date(item.createdAt);
  const timeStr = createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dateStr = createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: meta.color + "18" }]}>
        <Ionicons name={meta.icon as any} size={22} color={meta.color} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{meta.label}</Text>
        <Text style={[styles.cardTime, { color: colors.muted }]}>
          {dateStr} às {timeStr} · {item.retries > 0 ? `${item.retries} tentativa${item.retries > 1 ? "s" : ""}` : "Aguardando"}
        </Text>
        {item.errorMessage && (
          <Text style={[styles.errorMsg, { color: colors.error }]} numberOfLines={2}>
            {item.errorMessage}
          </Text>
        )}
      </View>
      <View style={styles.cardRight}>
        <StatusBadge status={item.status} colors={colors} />
        {item.status === "failed" && (
          <Pressable
            onPress={() => onDelete(item.id)}
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function OfflineQueueScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const {
    queue,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    syncQueue,
    dequeue,
    retryFailed,
    clearFailed,
  } = useOfflineQueue();

  const totalCount = queue.length;

  return (
    <ScreenContainer>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isOnline ? colors.primary : "#374151" }]}>
        <View style={styles.headerRow}>
          <Ionicons
            name={isOnline ? "wifi-outline" : "cloud-offline-outline"}
            size={22}
            color="#fff"
          />
          <Text style={styles.headerTitle}>
            {isOnline ? "Fila de Sincronização" : "Modo Offline"}
          </Text>
        </View>
        <Text style={styles.headerSub}>
          {isOnline
            ? "Conectado — as ações serão sincronizadas automaticamente"
            : "Sem conexão — as ações serão salvas e enviadas quando reconectar"}
        </Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{pendingCount}</Text>
          <Text style={[styles.statKey, { color: colors.muted }]}>pendentes</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.error }]}>{failedCount}</Text>
          <Text style={[styles.statKey, { color: colors.muted }]}>com erro</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: colors.foreground }]}>{totalCount}</Text>
          <Text style={[styles.statKey, { color: colors.muted }]}>total</Text>
        </View>
      </View>

      {/* Action buttons */}
      {(pendingCount > 0 || failedCount > 0) && isOnline && (
        <View style={[styles.actionsBar, { borderBottomColor: colors.border }]}>
          {pendingCount > 0 && (
            <Pressable
              onPress={syncQueue}
              disabled={isSyncing}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, opacity: pressed || isSyncing ? 0.7 : 1 },
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="sync-outline" size={16} color="#fff" />
              )}
              <Text style={styles.actionBtnText}>
                {isSyncing ? "Sincronizando..." : "Sincronizar agora"}
              </Text>
            </Pressable>
          )}
          {failedCount > 0 && (
            <>
              <Pressable
                onPress={retryFailed}
                style={({ pressed }) => [
                  styles.actionBtn,
                  { backgroundColor: colors.warning, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="refresh-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Tentar novamente</Text>
              </Pressable>
              <Pressable
                onPress={clearFailed}
                style={({ pressed }) => [
                  styles.actionBtnOutline,
                  { borderColor: colors.error, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.actionBtnText, { color: colors.error }]}>Limpar erros</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Queue list */}
      {totalCount === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Tudo sincronizado!</Text>
          <Text style={[styles.emptySub, { color: colors.muted }]}>
            Não há ações pendentes na fila.{"\n"}Continue trabalhando normalmente.
          </Text>
        </View>
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ActionCard item={item} colors={colors} onDelete={dequeue} />
          )}
          ListHeaderComponent={
            <Text style={[styles.listHeader, { color: colors.muted }]}>
              As ações são processadas em ordem cronológica
            </Text>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
  },
  statKey: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "80%",
    alignSelf: "center",
  },
  actionsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionBtnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  actionBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  listHeader: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardTime: {
    fontSize: 12,
  },
  errorMsg: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  deleteBtn: {
    padding: 4,
  },
});
