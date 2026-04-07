"use client";

import { useEffect, useState } from "react";
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
  const [showBanner, setShowBanner] = useState(false);
  const [registering, setRegistering] = useState(false);
  const registerMutation = trpc.pushTokens.register.useMutation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    // Verifica se já tem permissão ou se já recusou
    const permission = Notification.permission;
    if (permission === "granted") {
      // Já tem permissão — registra silenciosamente
      registerSilently();
      return;
    }
    if (permission === "denied") return;

    // Verifica se já foi dispensado pelo usuário anteriormente
    const dismissed = localStorage.getItem("push_banner_dismissed");
    if (dismissed) return;

    // Mostra banner após 3 segundos
    const timer = setTimeout(() => setShowBanner(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  async function registerSilently() {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
        });
      }
      await registerMutation.mutateAsync({
        subscription: JSON.stringify(subscription),
        platform: "web",
      });
    } catch (err) {
      console.warn("[WebPush] Erro ao registrar:", err);
    }
  }

  async function handleEnable() {
    setRegistering(true);
    try {
      // iOS/Chrome exige que o pedido seja feito por ação do usuário
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await registerSilently();
        setShowBanner(false);
      } else {
        setShowBanner(false);
        localStorage.setItem("push_banner_dismissed", "1");
      }
    } catch (err) {
      console.warn("[WebPush] Erro:", err);
    } finally {
      setRegistering(false);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    localStorage.setItem("push_banner_dismissed", "1");
  }

  if (!showBanner) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: 16,
      right: 16,
      zIndex: 9999,
      background: "#1A56DB",
      borderRadius: 16,
      padding: "14px 16px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      boxShadow: "0 8px 32px rgba(26,86,219,0.35)",
      maxWidth: 480,
      margin: "0 auto",
    }}>
      <span style={{ fontSize: 24 }}>🔔</span>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: "#fff", fontWeight: 700, fontSize: 14 }}>
          Ativar notificações
        </p>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>
          Receba alertas de ponto, fotos e materiais
        </p>
      </div>
      <button
        onClick={handleEnable}
        disabled={registering}
        style={{
          background: "#fff",
          color: "#1A56DB",
          border: "none",
          borderRadius: 10,
          padding: "8px 16px",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {registering ? "..." : "Ativar"}
      </button>
      <button
        onClick={handleDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          fontSize: 18,
          padding: 4,
        }}
      >
        ✕
      </button>
    </div>
  );
}
