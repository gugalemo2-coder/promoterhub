import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { Platform } from "react-native";

export type AppRole = "promoter" | "manager" | "master" | "supervisor" | null;

const ROLE_KEY = "promoterhub_app_role";
// Key to store whether the user is using custom auth (login/password)
export const CUSTOM_AUTH_KEY = "promoterhub_custom_auth_user";

interface RoleContextValue {
  appRole: AppRole;
  isRoleLoading: boolean;
  setAppRole: (role: AppRole) => Promise<void>;
  clearRole: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue>({
  appRole: null,
  isRoleLoading: true,
  setAppRole: async () => {},
  clearRole: async () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [appRole, setAppRoleState] = useState<AppRole>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    // Always validate role against the server when there's a valid token.
    // This ensures that role changes made by Master are reflected immediately
    // on the next login, without relying on stale cached values.
    const initRole = async () => {
      try {
        const token = await Auth.getSessionToken();
        if (token) {
          // Token exists: fetch fresh role from server
          const appUser = await Api.appGetMe();
          if (appUser && appUser.appRole) {
            const freshRole = appUser.appRole as AppRole;
            setAppRoleState(freshRole);
            // Update cached role so it stays in sync
            if (freshRole) {
              await AsyncStorage.setItem(ROLE_KEY, freshRole);
            }
            return;
          }
        }
        // No token or server call failed: fall back to cached role
        const stored = await AsyncStorage.getItem(ROLE_KEY);
        if (stored === "promoter" || stored === "manager" || stored === "master" || stored === "supervisor") {
          setAppRoleState(stored);
        }
      } catch {
        // On error, fall back to cached role
        try {
          const stored = await AsyncStorage.getItem(ROLE_KEY);
          if (stored === "promoter" || stored === "manager" || stored === "master" || stored === "supervisor") {
            setAppRoleState(stored);
          }
        } catch {}
      } finally {
        setIsRoleLoading(false);
      }
    };

    initRole();
  }, []);

  const setAppRole = useCallback(async (role: AppRole) => {
    setAppRoleState(role);
    if (role) {
      await AsyncStorage.setItem(ROLE_KEY, role);
    } else {
      await AsyncStorage.removeItem(ROLE_KEY);
    }
  }, []);

  const clearRole = useCallback(async () => {
    setAppRoleState(null);
    await AsyncStorage.removeItem(ROLE_KEY);
    await AsyncStorage.removeItem(CUSTOM_AUTH_KEY);
  }, []);

  return (
    <RoleContext.Provider value={{ appRole, isRoleLoading, setAppRole, clearRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
