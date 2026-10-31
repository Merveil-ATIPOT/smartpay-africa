"use client";

import type { UserProfile } from "@smartpay/contracts";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { portalApi } from "../lib/api";
import { isPortalAdmin } from "../lib/adminGate";
import { portalErrorMessage } from "../lib/errors";
import { ADMIN_HOME_HREF, ADMIN_LOGIN_HREF } from "../lib/nav";
import { validateLoginFields } from "../lib/loginForm";

type AuthStatus = "loading" | "guest" | "admin";

type AuthContextValue = {
  status: AuthStatus;
  user: UserProfile | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    portalApi
      .restore()
      .then((profile) => {
        if (cancelled) {
          return;
        }
        if (profile && isPortalAdmin(profile)) {
          setUser(profile);
          setStatus("admin");
          return;
        }
        setUser(null);
        setStatus("guest");
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(portalErrorMessage(err));
        setUser(null);
        setStatus("guest");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const invalid = validateLoginFields(email, password);
    if (invalid) {
      throw new Error(invalid);
    }
    setError(null);
    const profile = await portalApi.login(email, password);
    setUser(profile);
    setStatus("admin");
  }, []);

  const logout = useCallback(() => {
    portalApi.logout();
    setUser(null);
    setStatus("guest");
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ status, user, error, login, logout }),
    [status, user, error, login, logout],
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

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") {
      router.replace(ADMIN_LOGIN_HREF);
    }
  }, [status, router]);

  if (status === "loading") {
    return <p className="p-8 text-sm text-muted">Vérification de la session…</p>;
  }
  if (status !== "admin") {
    return <p className="p-8 text-sm text-muted">Redirection vers la connexion…</p>;
  }
  return children;
}

export function RequireGuest({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "admin") {
      router.replace(ADMIN_HOME_HREF);
    }
  }, [status, router]);

  if (status === "loading") {
    return <p className="p-8 text-sm text-muted">Vérification de la session…</p>;
  }
  if (status === "admin") {
    return <p className="p-8 text-sm text-muted">Redirection vers le portail…</p>;
  }
  return children;
}
