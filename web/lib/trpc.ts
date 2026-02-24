"use client";

import type { AppRouter } from "../../server/routers";
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import SuperJSON from "superjson";

export const trpc = createTRPCReact<AppRouter>();

function getApiUrl() {
  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    // If running on port 3001 (web dev), point to 3000 (API)
    const apiHostname = hostname.replace(/^3001-/, "3000-").replace(/^8082-/, "3000-");
    if (apiHostname !== hostname) {
      return `${protocol}//${apiHostname}`;
    }
    // Same host (e.g. vercel deploy), use /api prefix
    return "";
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
            // Cookie is sent automatically by browser
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
