"use client";

import type { AppRouter } from "../../server/routers";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

export const trpc = createTRPCReact<AppRouter>();

function getApiUrl() {
  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    // Local development: point to local API server
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }

    // Production: point to Railway API
    return "https://api-production-bbc3e.up.railway.app";
  }

  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getApiUrl()}/api/trpc`,
        transformer: SuperJSON,
        headers() {
          if (typeof document !== "undefined") {
            return {};
          }
          return {};
        },
        fetch(url, options) {
          return fetch(url, {
            ...options,
            credentials: "include",
          });
        },
      }),
    ],
  });
}
