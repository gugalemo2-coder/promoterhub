/**
 * useWebPushNotifications
 *
 * Registra o browser para receber Web Push notifications via VAPID.
 * Funciona em PWA instalado no Android e iOS 16.4+.
 * Substitui o Expo Push que só funcionava em apps nativos.
 */

import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
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
  const registerMutation = trpc.pushTokens.register.useMutation();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) { console.warn("[WebPush] NEXT_PUBLIC_VAPID_PUBLIC_KEY não configurada"); return; }
    registerWebPush();
  }, []);

  async function registerWebPush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { console.log("[WebPush] Permissão negada"); return; }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await registerMutation.mutateAsync({ subscription: JSON.stringify(subscription), platform: "web" });
      console.log("[WebPush] Subscription registrada com sucesso");
    } catch (err) {
      console.warn("[WebPush] Erro ao registrar:", err);
    }
  }
}
