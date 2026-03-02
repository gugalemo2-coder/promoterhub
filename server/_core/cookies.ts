import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

/**
 * Get the real public hostname from the request.
 * In production behind Cloudflare + Google Cloud Run proxy:
 * - req.hostname returns the internal .run.app hostname
 * - x-forwarded-host is NOT forwarded by the proxy
 * - cf-worker contains the public domain (e.g., "manus.space")
 *
 * Priority order:
 * 1. x-forwarded-host (standard proxy header, if present)
 * 2. cf-worker (Cloudflare worker domain — contains the public domain like "manus.space")
 * 3. req.hostname (fallback — may be internal .run.app hostname)
 */
function getPublicHostname(req: Request): string {
  // 1. Try x-forwarded-host first (standard proxy header)
  const forwardedHost = req.headers["x-forwarded-host"];
  if (forwardedHost) {
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    return host.split(":")[0].trim();
  }

  // 2. Try cf-worker header (Cloudflare sets this to the public domain)
  // e.g., "manus.space" — we combine with the subdomain from the Host header
  const cfWorker = req.headers["cf-worker"];
  if (cfWorker) {
    const workerDomain = Array.isArray(cfWorker) ? cfWorker[0] : cfWorker;
    // cf-worker contains the root domain (e.g., "manus.space")
    // The actual hostname (e.g., "promomanage-csf363ub.manus.space") is in the Host header
    // but Host also points to the internal .run.app hostname in this setup.
    // We use cf-worker as the domain root and reconstruct from the internal hostname's subdomain prefix.
    const internalHost = req.hostname; // e.g., "uke7454vnd-i6tsq2wa5a-uk.a.run.app"
    // Extract the subdomain prefix from the internal host (everything before the first dot)
    // This won't match the public subdomain, so we return the cf-worker domain directly
    // and rely on getParentDomain to extract ".manus.space" from it
    return workerDomain.trim();
  }

  // 3. Fallback to req.hostname (may be internal)
  return req.hostname;
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * e.g., "promomanage-csf363ub.manus.space" -> ".manus.space"
 * e.g., "manus.space" -> ".manus.space" (when cf-worker provides root domain)
 * This allows cookies set by the backend to be read by the frontend on the same domain.
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // For a root domain like "manus.space" (2 parts), set cookie for ".manus.space"
  // This covers all subdomains including "promomanage-csf363ub.manus.space"
  if (parts.length === 2) {
    return "." + hostname;
  }

  // Need at least 3 parts for a subdomain (e.g., "promomanage-csf363ub.manus.space")
  if (parts.length < 3) {
    return undefined;
  }

  // Return parent domain with leading dot (e.g., ".manus.space")
  // This allows cookie to be shared across all subdomains
  return "." + parts.slice(-2).join(".");
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = getPublicHostname(req);
  const domain = getParentDomain(hostname);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
