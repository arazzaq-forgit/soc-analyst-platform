import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { fetchMe, loginRequest } from "../api/auth";
import { AUTH_LOGOUT_EVENT, clearTokens, hasTokens, setTokens } from "../lib/tokens";
import { queryClient } from "../lib/queryClient";
import type { User } from "../types";
import { AuthContext } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => hasTokens());

  // On first load: if tokens exist, find out who the user is.
  useEffect(() => {
    if (!hasTokens()) return;
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        clearTokens();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  // The API client fires this event when a token refresh fails.
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onForcedLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const tokens = await loginRequest(email, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    try {
      setUser(await fetchMe());
    } catch (err) {
      clearTokens();
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
    queryClient.clear();
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === "admin", loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
