import Constants from "expo-constants";
import { Platform } from "react-native";

import { defaultApiUrl, rewriteLoopbackToLan } from "../lib/env";
import { ApiError, messageFromBody } from "./errors";
import { STORAGE_KEYS, storageDelete, storageGet, storageSet } from "./storage";

type TokenPair = { access: string; refresh: string };

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(deps: {
  platform?: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  let refreshPromise: Promise<string | null> | null = null;

  function metroHost(): string | undefined {
    return Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri ?? undefined;
  }

  async function getBaseUrl(): Promise<string> {
    const override = await storageGet(STORAGE_KEYS.apiBase);
    if (override) {
      return override.replace(/\/$/, "");
    }
    return rewriteLoopbackToLan(defaultApiUrl(deps.platform ?? "ios"), metroHost());
  }

  async function setApiBaseUrl(url: string): Promise<void> {
    const clean = url.trim().replace(/\/$/, "");
    if (!clean) {
      await storageDelete(STORAGE_KEYS.apiBase);
      return;
    }
    await storageSet(STORAGE_KEYS.apiBase, clean);
  }

  async function getTokens(): Promise<Partial<TokenPair>> {
    const [access, refresh] = await Promise.all([
      storageGet(STORAGE_KEYS.access),
      storageGet(STORAGE_KEYS.refresh),
    ]);
    return { access: access ?? undefined, refresh: refresh ?? undefined };
  }

  async function setTokens(tokens: TokenPair): Promise<void> {
    await storageSet(STORAGE_KEYS.access, tokens.access);
    await storageSet(STORAGE_KEYS.refresh, tokens.refresh);
  }

  async function clearTokens(): Promise<void> {
    await Promise.all([storageDelete(STORAGE_KEYS.access), storageDelete(STORAGE_KEYS.refresh)]);
  }

  async function refreshAccess(): Promise<string | null> {
    if (refreshPromise) {
      return refreshPromise;
    }
    refreshPromise = (async () => {
      const { refresh } = await getTokens();
      if (!refresh) {
        return null;
      }
      const base = await getBaseUrl();
      const response = await fetchImpl(`${base}/api/v1/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) {
        await clearTokens();
        return null;
      }
      const body = (await response.json()) as { access?: string; refresh?: string };
      if (!body.access) {
        await clearTokens();
        return null;
      }
      await storageSet(STORAGE_KEYS.access, body.access);
      if (body.refresh) {
        await storageSet(STORAGE_KEYS.refresh, body.refresh);
      }
      return body.access;
    })().finally(() => {
      refreshPromise = null;
    });
    return refreshPromise;
  }

  async function request<T>(
    path: string,
    options: {
      method?: string;
      body?: unknown;
      auth?: boolean;
      headers?: Record<string, string>;
      retry?: boolean;
    } = {},
  ): Promise<T> {
    const base = await getBaseUrl();
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(options.headers ?? {}),
    };
    if (options.auth !== false) {
      const { access } = await getTokens();
      if (access) {
        headers.Authorization = `Bearer ${access}`;
      }
    }
    let response: Response;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12_000);
      try {
        response = await fetchImpl(`${base}${path}`, {
          method: options.method ?? "GET",
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      throw new ApiError(
        0,
        aborted
          ? `Délai dépassé vers ${base}. Sur un téléphone, l'API doit être http://IP_LAN:8000 (pas localhost).`
          : `Réseau injoignable vers ${base}. Vérifiez Django, le Wi-Fi et le pare-feu (port 8000).`,
      );
    }

    if (response.status === 401 && options.auth !== false && options.retry !== false) {
      const next = await refreshAccess();
      if (next) {
        return request<T>(path, { ...options, retry: false });
      }
    }

    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    if (!response.ok) {
      throw new ApiError(
        response.status,
        messageFromBody(parsed, `Erreur API (${response.status}).`),
        parsed,
      );
    }
    return parsed as T;
  }

  return {
    getBaseUrl,
    setApiBaseUrl,
    getTokens,
    setTokens,
    clearTokens,
    request,
  };
}

export const api = createApiClient({ platform: Platform.OS });
