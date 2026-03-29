import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { clearTokenCache } from "@/lib/trpc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Web platform: check for custom app token first, then fall back to OAuth cookie
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: checking session...");

        // First: check if there's a custom app token in localStorage
        const sessionToken = await Auth.getSessionToken();
        if (sessionToken) {
          console.log("[useAuth] Web: found custom app token, verifying via app-me...");
          const appUser = await Api.appGetMe();
          if (appUser) {
            const userInfo: Auth.User = {
              id: appUser.user.id,
              openId: `app_user_${appUser.user.id}`,
              name: appUser.user.name,
              email: null,
              loginMethod: "custom",
              lastSignedIn: new Date(),
            };
            setUser(userInfo);
            await Auth.setUserInfo(userInfo);
            console.log("[useAuth] Web user set from custom token:", userInfo);
            return;
          } else {
            // Token invalid, clear it
            console.log("[useAuth] Web: custom token invalid, clearing...");
            await Auth.removeSessionToken();
          }
        }

        // Fallback: OAuth cookie-based auth
        console.log("[useAuth] Web: no custom token, trying OAuth cookie...");
        const apiUser = await Api.getMe();
        console.log("[useAuth] API user response:", apiUser);

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from OAuth:", userInfo);
        } else {
          console.log("[useAuth] Web: No authenticated user");
          setUser(null);
          await Auth.clearUserInfo();
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing",
      );
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);
      } else {
        console.log("[useAuth] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      // FIX: limpa o cache do token em memória para evitar que o token
      // antigo seja reutilizado em requisições após o logout
      clearTokenCache();

      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);

      // On web: clear ALL localStorage (role, user info, session) and force a full page reload
      // This destroys all in-memory React state and ensures a clean login screen
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.localStorage.clear();
        window.location.href = "/login";
      }
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: fetch user from API directly (user will login manually if needed)
        console.log("[useAuth] Web: fetching user from API...");
        fetchUser();
      } else {
        // Native: check for cached user info first for faster initial load
        Auth.getUserInfo().then((cachedUser) => {
          console.log("[useAuth] Native cached user check:", cachedUser);
          if (cachedUser) {
            console.log("[useAuth] Native: setting cached user immediately");
            setUser(cachedUser);
            setLoading(false);
          } else {
            // No cached user, check session token
            fetchUser();
          }
        });
      }
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
