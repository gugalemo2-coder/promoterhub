import React, { createContext, useContext, useEffect, useState } from "react";
import { trpc } from "./trpc";

export type AppRole = "promoter" | "manager" | null;

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  appRole: AppRole;
  setAppRole: (role: AppRole) => void;
}

const AuthContext = createContext<AuthContextValue>({
  isLoading: true,
  isAuthenticated: false,
  userId: null,
  userName: null,
  userEmail: null,
  appRole: null,
  setAppRole: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [appRole, setAppRole] = useState<AppRole>(null);
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  useEffect(() => {
    if (user && !appRole) {
      // Try to restore role from profile
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!user,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        appRole,
        setAppRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
