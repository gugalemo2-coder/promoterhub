import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type AppRole = "promoter" | "manager" | null;

const ROLE_KEY = "promoterhub_app_role";

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
    AsyncStorage.getItem(ROLE_KEY)
      .then((stored) => {
        if (stored === "promoter" || stored === "manager") {
          setAppRoleState(stored);
        }
      })
      .finally(() => setIsRoleLoading(false));
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
