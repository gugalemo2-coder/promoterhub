/**
 * usePushNotifications
 *
 * Hook para registrar Web Push notifications via VAPID.
 * Expõe requestPermission() para ser chamado por ação do usuário (ex: toque no sino).
 * Funciona em PWA no Android e iOS 16.4+.
 */

import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function usePushNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
  const registerMutation = trpc.pushTokens.register.useMutation();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) { setPermissionStatus("unsupported"); return; }
    setPermissionStatus(Notification.permission);
    // Se já tem permissão, registra silenciosamente
    if (Notification.permission === "granted") {
      registerSubscription().catch(() => {});
    }
  }, []);

  async function registerSubscription(): Promise<void> {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return;
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await registerMutation.mutateAsync({
      subscription: JSON.stringify(subscription),
      platform: "web",
    });
  }

  async function requestPermission(): Promise<void> {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === "granted") {
        await registerSubscription();
      }
    } catch (err) {
      console.warn("[WebPush] Erro ao solicitar permissão:", err);
    }
  }

  return { permissionStatus, requestPermission };
}
