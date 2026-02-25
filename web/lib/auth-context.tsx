"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

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
    const { protocol, hostname } = window.location;
    const apiHostname = hostname.replace(/^3001-/, "3000-").replace(/^8082-/, "3000-");
    if (apiHostname !== hostname) return `${protocol}//${apiHostname}`;
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const apiUrl = getApiUrl();

      // First try the custom app-me endpoint (for login/password users)
      const appMeRes = await fetch(`${apiUrl}/api/auth/app-me`, {
        credentials: "include",
      });

      if (appMeRes.ok) {
        const appData = await appMeRes.json();
        if (appData.user) {
          // Map app user to User interface
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
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
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
      await fetch(`${apiUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const demoLogin = async (role: "promoter" | "manager") => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/demo-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Erro ao fazer login demo");
    }
    await fetchMe();
  };

  const appLogin = async (login: string, password: string) => {
    const apiUrl = getApiUrl();
    const res = await fetch(`${apiUrl}/api/auth/app-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Login ou senha incorretos");
    }
    // Cookie is set by the server automatically via res.cookie()
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
