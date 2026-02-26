import { Platform } from "react-native";
import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  // Always try to use stored session token as Bearer auth (works on both native and web)
  // Web also sends cookies automatically (credentials: "include") as fallback
  const sessionToken = await Auth.getSessionToken();
  if (sessionToken) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const baseUrl = getApiBaseUrl();
  // Ensure no double slashes between baseUrl and endpoint
  const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${cleanBaseUrl}${cleanEndpoint}` : endpoint;
  console.log("[API] Full URL:", url);

  try {
    console.log("[API] Making request...");
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });

    console.log("[API] Response status:", response.status, response.statusText);
    const responseHeaders = Object.fromEntries(response.headers.entries());
    console.log("[API] Response headers:", responseHeaders);

    // Check if Set-Cookie header is present (cookies are automatically handled in React Native)
    const setCookie = response.headers.get("Set-Cookie");
    if (setCookie) {
      console.log("[API] Set-Cookie header received:", setCookie);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[API] Error response:", errorText);
      let errorMessage = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        // Not JSON, use text as is
      }
      throw new Error(errorMessage || `API call failed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const data = await response.json();
      console.log("[API] JSON response received");
      return data as T;
    }

    const text = await response.text();
    console.log("[API] Text response received");
    return (text ? JSON.parse(text) : {}) as T;
  } catch (error) {
    console.error("[API] Request failed:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Unknown error occurred");
  }
}

// OAuth callback handler - exchange code for session token
// Calls /api/oauth/mobile endpoint which returns JSON with app_session_id and user
export async function exchangeOAuthCode(
  code: string,
  state: string,
): Promise<{ sessionToken: string; user: any }> {
  console.log("[API] exchangeOAuthCode called");
  // Use GET with query params
  const params = new URLSearchParams({ code, state });
  const endpoint = `/api/oauth/mobile?${params.toString()}`;
  console.log("[API] Calling OAuth mobile endpoint:", endpoint);
  const result = await apiCall<{ app_session_id: string; user: any }>(endpoint);

  // Convert app_session_id to sessionToken for compatibility
  const sessionToken = result.app_session_id;
  console.log("[API] OAuth exchange result:", {
    hasSessionToken: !!sessionToken,
    hasUser: !!result.user,
    sessionToken: sessionToken ? `${sessionToken.substring(0, 50)}...` : null,
  });

  return {
    sessionToken,
    user: result.user,
  };
}

// Demo login — creates a session for a demo user without OAuth
export async function demoLogin(role: "promoter" | "manager"): Promise<{ sessionToken: string; user: any; appRole: string }> {
  const result = await apiCall<{ app_session_id: string; user: any; appRole: string }>("/api/auth/demo-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  return { sessionToken: result.app_session_id, user: result.user, appRole: result.appRole };
}

// Custom auth — app-login (login/password)
export async function appLogin(login: string, password: string): Promise<{ sessionToken: string; user: any; appRole: string }> {
  const result = await apiCall<{ app_session_id: string; user: any; appRole: string }>("/api/auth/app-login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
  return { sessionToken: result.app_session_id, user: result.user, appRole: result.appRole };
}

// Custom auth — app-register (name + password)
export async function appRegister(name: string, password: string): Promise<{ sessionToken: string; user: any; appRole: string; generatedLogin: string }> {
  const result = await apiCall<{ app_session_id: string; user: any; appRole: string; generatedLogin: string }>("/api/auth/app-register", {
    method: "POST",
    body: JSON.stringify({ name, password }),
  });
  return { sessionToken: result.app_session_id, user: result.user, appRole: result.appRole, generatedLogin: result.generatedLogin };
}

// Custom auth — get current app user
export async function appGetMe(): Promise<{ user: any; appRole: string } | null> {
  try {
    return await apiCall<{ user: any; appRole: string }>("/api/auth/app-me");
  } catch {
    return null;
  }
}

// Custom auth — list all users (master only)
export async function masterListUsers(): Promise<{ users: any[] }> {
  return apiCall<{ users: any[] }>("/api/master/users");
}

// Custom auth — update user role (master only)
export async function masterUpdateRole(userId: number, appRole: "promoter" | "manager"): Promise<{ user: any }> {
  return apiCall<{ user: any }>(`/api/master/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ appRole }),
  });
}

// Custom auth — toggle user active (master only)
export async function masterToggleActive(userId: number, active: boolean): Promise<{ user: any }> {
  return apiCall<{ user: any }>(`/api/master/users/${userId}/active`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}

export async function masterResetPassword(userId: number, newPassword: string): Promise<{ success: boolean; message: string }> {
  return apiCall<{ success: boolean; message: string }>(`/api/master/users/${userId}/password`, {
    method: "PATCH",
    body: JSON.stringify({ newPassword }),
  });
}

// Custom auth — delete user account and all data (master only)
export async function masterDeleteUser(userId: number): Promise<{ success: boolean; message: string }> {
  return apiCall<{ success: boolean; message: string }>(`/api/master/users/${userId}`, {
    method: "DELETE",
  });
}

// Upload avatar de perfil (base64)
export async function appUploadAvatar(fileBase64: string, fileType: string, fileName: string): Promise<{ avatarUrl: string; user: any }> {
  return apiCall<{ avatarUrl: string; user: any }>("/api/auth/app-upload-avatar", {
    method: "POST",
    body: JSON.stringify({ fileBase64, fileType, fileName }),
  });
}

// Logout
export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", {
    method: "POST",
  });
}

// Get current authenticated user (web uses cookie-based auth)
export async function getMe(): Promise<{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: string;
} | null> {
  try {
    const result = await apiCall<{ user: any }>("/api/auth/me");
    return result.user || null;
  } catch (error) {
    console.error("[API] getMe failed:", error);
    return null;
  }
}

// Establish session cookie on the backend (3000-xxx domain)
// Called after receiving token via postMessage to get a proper Set-Cookie from the backend
export async function establishSession(token: string): Promise<boolean> {
  try {
    console.log("[API] establishSession: setting cookie on backend...");
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/auth/session`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      credentials: "include", // Important: allows Set-Cookie to be stored
    });

    if (!response.ok) {
      console.error("[API] establishSession failed:", response.status);
      return false;
    }

    console.log("[API] establishSession: cookie set successfully");
    return true;
  } catch (error) {
    console.error("[API] establishSession error:", error);
    return false;
  }
}
