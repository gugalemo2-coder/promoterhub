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
 * In production behind a proxy (e.g., Google Cloud Run), req.hostname may return
 * the internal hostname (e.g., xxx.run.app). We use X-Forwarded-Host to get the
 * real public hostname (e.g., promomanage-csf363ub.manus.space).
 */
function getPublicHostname(req: Request): string {
  const forwardedHost = req.headers["x-forwarded-host"];
  if (forwardedHost) {
    const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost;
    // X-Forwarded-Host may contain port, strip it
    return host.split(":")[0].trim();
  }
  return req.hostname;
}

/**
 * Extract parent domain for cookie sharing across subdomains.
 * e.g., "promomanage-csf363ub.manus.space" -> ".manus.space"
 * This allows cookies set by the backend to be read by the frontend on the same domain.
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain (e.g., "promomanage-csf363ub.manus.space")
  // For "manus.space", we can't set a parent domain
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
