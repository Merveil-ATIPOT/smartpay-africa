import type { UserProfile } from "@smartpay/contracts";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchMe, login as loginRequest, logout as logoutRequest } from "../services/auth";
import { api } from "../services/api";
import { ApiError } from "../services/errors";

type AuthContextValue = {
  loading: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);

  const refreshUser = useCallback(async () => {
    const tokens = await api.getTokens();
    if (!tokens.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await fetchMe());
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        await api.clearTokens();
        setUser(null);
        return;
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await loginRequest(email, password);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ loading, user, login, logout, refreshUser }),
    [loading, user, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth doit être utilisé dans AuthProvider.");
  }
  return value;
}
