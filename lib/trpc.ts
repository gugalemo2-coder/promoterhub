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

/**
 * Exportado para compatibilidade com use-auth.ts.
 * Não há mais cache, então esta função não faz nada —
 * mas existe para evitar erros de importação.
 */
export function clearTokenCache() {
  // sem cache para limpar — segurança em primeiro lugar
}

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

/**
 * Cria o cliente tRPC com configuração segura.
 * O token é buscado a cada requisição para garantir que
 * nunca haja mistura de dados entre contas diferentes.
 */
export function createTRPCClient() {
  const dynamicFetch = createDynamicFetch();

  return trpc.createClient({
    links: [
      httpLink({
        url: "/api/trpc",
        transformer: superjson,
        async headers() {
          const token = await Auth.getSessionToken();
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
        fetch: dynamicFetch,
      }),
    ],
  });
}
