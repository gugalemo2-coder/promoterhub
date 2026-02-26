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
 * A custom fetch wrapper that dynamically resolves the API base URL on every request.
 *
 * This is necessary because on native (iOS/Android), Constants.expoConfig.hostUri
 * may not be available at app initialization time, so we must resolve the URL
 * at request time rather than at client creation time.
 */
function createDynamicFetch(): typeof fetch {
  return async (input, init) => {
    const apiBase = getApiBaseUrl();
    // Replace the placeholder base URL with the dynamically resolved one
    let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    // If the URL starts with "/api/trpc" (relative), prepend the base
    if (url.startsWith("/api/trpc")) {
      url = `${apiBase}${url}`;
    } else if (url.includes("__DYNAMIC_BASE__")) {
      // Replace our placeholder with the real base
      url = url.replace("__DYNAMIC_BASE__", apiBase);
    }

    return fetch(url, {
      ...init,
      credentials: "include",
    });
  };
}

/**
 * Creates the tRPC client with proper configuration.
 * Call this once in your app's root layout.
 */
export function createTRPCClient() {
  const dynamicFetch = createDynamicFetch();

  return trpc.createClient({
    links: [
      httpLink({
        // Use a relative URL — the custom fetch will prepend the base dynamically
        url: "/api/trpc",
        // tRPC v11: transformer MUST be inside httpLink, not at root
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
