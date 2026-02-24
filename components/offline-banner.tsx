/**
 * OfflineBanner
 *
 * Faixa persistente exibida no topo do app quando o dispositivo está offline
 * ou quando há ações pendentes na fila de sincronização.
 */

import { useOfflineQueue } from "@/hooks/use-offline-queue";
import { useColors } from "@/hooks/use-colors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, Animated } from "react-native";
import { useEffect, useRef } from "react";

export function OfflineBanner() {
  const colors = useColors();
  const { isOnline, isSyncing, pendingCount, failedCount, syncQueue, retryFailed, clearFailed } =
    useOfflineQueue();

  const slideAnim = useRef(new Animated.Value(-60)).current;
  const visible = !isOnline || pendingCount > 0 || failedCount > 0;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!visible) return null;

  const bgColor = !isOnline
    ? "#374151"
    : failedCount > 0
    ? colors.error
    : colors.warning;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: bgColor, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.left}>
        <Ionicons
          name={!isOnline ? "cloud-offline-outline" : isSyncing ? "sync-outline" : "warning-outline"}
          size={16}
          color="#fff"
        />
        <Text style={styles.text}>
          {!isOnline
            ? `Sem conexão${pendingCount > 0 ? ` · ${pendingCount} ação${pendingCount > 1 ? "ões" : ""} na fila` : ""}`
            : isSyncing
            ? "Sincronizando..."
            : failedCount > 0
            ? `${failedCount} ação${failedCount > 1 ? "ões" : ""} com erro`
            : `${pendingCount} ação${pendingCount > 1 ? "ões" : ""} pendente${pendingCount > 1 ? "s" : ""}`}
        </Text>
      </View>

      <View style={styles.right}>
        {isOnline && pendingCount > 0 && !isSyncing && (
          <Pressable
            onPress={syncQueue}
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.btnText}>Sincronizar</Text>
          </Pressable>
        )}
        {failedCount > 0 && (
          <>
            <Pressable
              onPress={retryFailed}
              style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.btnText}>Tentar novamente</Text>
            </Pressable>
            <Pressable
              onPress={clearFailed}
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="trash-outline" size={14} color="#fff" />
            </Pressable>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 40,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btn: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  btnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  btnGhost: {
    padding: 4,
  },
});
