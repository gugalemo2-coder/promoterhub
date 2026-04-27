"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          console.log("[PWA] Service Worker registrado:", registration.scope);

          // Verifica atualizações periodicamente (a cada 60s)
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60000);

          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log("[PWA] Nova versão disponível, aplicando...");
                  // Pede ao novo SW para assumir controle
                  newWorker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn("[PWA] Falha ao registrar Service Worker:", err);
        });

      // ⚠️ Reload com guard de sessionStorage para evitar loop infinito.
      // Só recarrega UMA vez por sessão quando o SW novo assume controle.
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        const reloadKey = "sw_reload_done";
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, "1");
          console.log("[PWA] Novo Service Worker ativo, recarregando...");
          window.location.reload();
        }
      });
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }, []);

  return null;
}
