"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const TOKEN_KEY = "promoterhub_token";

interface User {
  id: number;
  name: string | null;
  email: string | null;
  openId: string;
  avatarUrl?: string | null;
  appRole?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  demoLogin: (role: "promoter" | "manager") => Promise<void>;
  appLogin: (login: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

/** Get stored auth token */
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Save auth token */
function saveToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/** Remove auth token */
function clearToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
  }
}

/** Build headers with Authorization token */
export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();
      const token = getStoredToken();

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // First try the custom app-me endpoint (for login/password users)
      const appMeRes = await fetch(`${apiUrl}/api/auth/app-me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (appMeRes.ok) {
        const appData = await appMeRes.json();
        if (appData.user) {
          setUser({
            id: appData.user.id,
            name: appData.user.name,
            email: null,
            openId: `app_user_${appData.user.id}`,
            avatarUrl: appData.user.avatarUrl ?? null,
            appRole: appData.user.appRole,
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: try OAuth /api/auth/me
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
        clearToken();
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const logout = async () => {
    try {
      const apiUrl = getApiUrl();
      const token = getStoredToken();
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {}
    clearToken();
    setUser(null);
    window.location.href = "/login";
  };

  const demoLogin = async (role: "promoter" | "manager") => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Erro ao fazer login demo");
    }
    const data = await res.json();
    if (data.app_session_id) {
      saveToken(data.app_session_id);
    }
    await fetchMe();
  };

  const appLogin = async (login: string, password: string) => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/app-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Login ou senha incorretos");
    }
    const data = await res.json();
    if (data.app_session_id) {
      saveToken(data.app_session_id);
    }
    await fetchMe();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        logout,
        refresh: fetchMe,
        demoLogin,
        appLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
