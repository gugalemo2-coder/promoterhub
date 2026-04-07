"use client";

import { useEffect } from "react";
import { trpc } from "@/lib/trpc";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function WebPushSetup() {
  const registerMutation = trpc.pushTokens.register.useMutation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    async function register() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

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

        console.log("[WebPush] Registrado com sucesso");
      } catch (err) {
        console.warn("[WebPush] Erro ao registrar:", err);
      }
    }

    // Pequeno delay para garantir que o service worker está pronto
    const timer = setTimeout(register, 2000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
