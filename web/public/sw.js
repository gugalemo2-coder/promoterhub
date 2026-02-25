// PromoterHub Service Worker
// Cache-first para assets estáticos, Network-first para API

const CACHE_NAME = "promoterhub-v2";
const STATIC_CACHE = "promoterhub-static-v2";
const API_CACHE = "promoterhub-api-v2";

// Assets para pré-cachear na instalação
const PRECACHE_ASSETS = [
  "/",
  "/login",
  "/dashboard",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-touch-icon.png",
];

// Instalação: pré-cacheia assets essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn("[SW] Falha ao pré-cachear alguns assets:", err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name !== CACHE_NAME &&
                name !== STATIC_CACHE &&
                name !== API_CACHE
            )
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: estratégia por tipo de request
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requests não-HTTP
  if (!url.protocol.startsWith("http")) return;

  // API calls: Network-first, fallback para cache
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/trpc/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Assets estáticos (_next/static): Cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Páginas e outros: Network-first, fallback para cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Fallback para a página principal quando offline
          return caches.match("/");
        });
      })
  );
});
