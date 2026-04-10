"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
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
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    console.log("[PWA] Nova versão disponível, atualizando...");
                    // Força o novo SW a assumir imediatamente
                    newWorker.postMessage({ type: "SKIP_WAITING" });
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn("[PWA] Falha ao registrar Service Worker:", err);
          });

        // Quando o novo SW assume controle, recarrega a página para usar os novos assets
        let refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true;
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
    }
  }, []);

  return null;
}
