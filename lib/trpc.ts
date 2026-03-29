import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "@/server/routers";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "@/lib/_core/auth";

/**
 * tRPC React client for type-safe API calls.
 *
 * Uses httpLink (non-batched) to avoid payload size issues with large file uploads.
 */
export const trpc = createTRPCReact<AppRouter>();

// ── Token cache ────────────────────────────────────────────────────────────────
// Ao invés de ler o token do storage a cada requisição, guardamos em memória.
// Só busca do storage novamente após 5 minutos ou quando limpo manualmente (logout).
let _cachedToken: string | null = null;
let _tokenFetchedAt: number = 0;
const TOKEN_CACHE_MS = 5 * 60 * 1000; // 5 minutos

async function getCachedToken(): Promise<string | null> {
  const now = Date.now();
  if (_cachedToken && now - _tokenFetchedAt < TOKEN_CACHE_MS) {
    return _cachedToken;
  }
  _cachedToken = await Auth.getSessionToken();
  _tokenFetchedAt = now;
  return _cachedToken;
}

/** Chame isso no logout para limpar o cache do token */
export function clearTokenCache() {
  _cachedToken = null;
  _tokenFetchedAt = 0;
}

// ── Dynamic fetch ──────────────────────────────────────────────────────────────
/**
 * Custom fetch que resolve a URL base dinamicamente a cada requisição.
 * Necessário para native (iOS/Android) onde a URL pode não estar disponível
 * no momento de inicialização do app.
 */
function createDynamicFetch(): typeof fetch {
  return async (input, init) => {
    const apiBase = getApiBaseUrl();
    let url =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    if (url.startsWith("/api/trpc")) {
      url = `${apiBase}${url}`;
    } else if (url.includes("__DYNAMIC_BASE__")) {
      url = url.replace("__DYNAMIC_BASE__", apiBase);
    }

    return fetch(url, { ...init, credentials: "include" });
  };
}

// ── Client factory ─────────────────────────────────────────────────────────────
/**
 * Cria o cliente tRPC com configuração otimizada.
 * Chame uma vez no layout raiz do app.
 */
export function createTRPCClient() {
  const dynamicFetch = createDynamicFetch();

  return trpc.createClient({
    links: [
      httpLink({
        url: "/api/trpc",
        transformer: superjson,
        // FIX: token agora vem do cache em memória — não lê o storage a cada requisição
        async headers() {
          const token = await getCachedToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch: dynamicFetch,
      }),
    ],
  });
}
