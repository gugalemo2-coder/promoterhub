"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

interface User {
  id: number;
  name: string | null;
  email: string | null;
  openId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  demoLogin: (role: "promoter" | "manager") => Promise<void>;
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
      const res = await fetch(`${getApiUrl()}/api/auth/me`, {
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
      await fetch(`${getApiUrl()}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  const demoLogin = async (role: "promoter" | "manager") => {
    const res = await fetch(`${getApiUrl()}/api/auth/demo-login`, {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        logout,
        refresh: fetchMe,
        demoLogin,
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
