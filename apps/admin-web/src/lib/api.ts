import type { UserProfile } from "@smartpay/contracts";

import { ADMIN_FORBIDDEN_MESSAGE, isPortalAdmin } from "./adminGate";
import { PortalApiError, sanitizePortalMessage } from "./errors";
import { loginUserFacingError } from "./loginForm";
import { createSessionStore, sessionStore, type TokenPair } from "./session";

export const TOKEN_PATH = "/api/v1/auth/token/";
export const TOKEN_REFRESH_PATH = "/api/v1/auth/token/refresh/";
export const ME_PATH = "/api/v1/me/";

type JsonMap = Record<string, unknown>;

type ApiDeps = {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  session?: ReturnType<typeof createSessionStore>;
};

function defaultBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
}

function readDetail(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const detail = (body as JsonMap).detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail.trim();
  }
  return null;
}

export function createPortalApi(deps: ApiDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const session = deps.session ?? sessionStore;
  const baseUrl = (deps.baseUrl ?? defaultBaseUrl()).replace(/\/$/, "");
  let refreshInFlight: Promise<boolean> | null = null;

  async function parseBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return null;
    }
  }

  async function rawRequest(path: string, init: RequestInit, access?: string): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }
    try {
      return await fetchImpl(`${baseUrl}${path}`, { ...init, headers });
    } catch {
      throw new PortalApiError(0, loginUserFacingError(0));
    }
  }

  async function tryRefresh(): Promise<boolean> {
    if (refreshInFlight) {
      return refreshInFlight;
    }
    refreshInFlight = (async () => {
      const { refresh } = session.read();
      if (!refresh) {
        return false;
      }
      const response = await rawRequest(TOKEN_REFRESH_PATH, {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
      const body = (await parseBody(response)) as JsonMap | null;
      if (!response.ok || !body || typeof body.access !== "string") {
        session.clear();
        return false;
      }
      const nextRefresh = typeof body.refresh === "string" ? body.refresh : refresh;
      session.write({ access: body.access, refresh: nextRefresh });
      return true;
    })();
    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const tokens = session.read();
    let response = await rawRequest(path, init, auth ? tokens.access : undefined);
    if (auth && response.status === 401) {
      const refreshed = await tryRefresh();
      if (refreshed) {
        response = await rawRequest(path, init, session.read().access);
      }
    }
    const body = await parseBody(response);
    if (!response.ok) {
      if (response.status === 401 && auth) {
        session.clear();
      }
      const detail = readDetail(body);
      throw new PortalApiError(
        response.status,
        sanitizePortalMessage(detail ?? loginUserFacingError(response.status), response.status),
      );
    }
    return body as T;
  }

  async function login(email: string, password: string): Promise<UserProfile> {
    const response = await rawRequest(TOKEN_PATH, {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const body = (await parseBody(response)) as JsonMap | null;
    if (!response.ok) {
      throw new PortalApiError(response.status, loginUserFacingError(response.status));
    }
    if (!body || typeof body.access !== "string" || typeof body.refresh !== "string") {
      throw new PortalApiError(500, loginUserFacingError(500));
    }
    const tokens: TokenPair = { access: body.access, refresh: body.refresh };
    const meResponse = await rawRequest(ME_PATH, { method: "GET" }, tokens.access);
    const profile = (await parseBody(meResponse)) as UserProfile | null;
    if (!meResponse.ok || !profile) {
      throw new PortalApiError(meResponse.status || 500, loginUserFacingError(meResponse.status || 500));
    }
    if (!isPortalAdmin(profile)) {
      throw new PortalApiError(403, ADMIN_FORBIDDEN_MESSAGE);
    }
    session.write(tokens);
    return profile;
  }

  async function fetchMe(): Promise<UserProfile> {
    return request<UserProfile>(ME_PATH, { method: "GET" });
  }

  async function restore(): Promise<UserProfile | null> {
    const { access, refresh } = session.read();
    if (!access && !refresh) {
      return null;
    }
    try {
      const profile = await fetchMe();
      if (!isPortalAdmin(profile)) {
        session.clear();
        return null;
      }
      return profile;
    } catch (error) {
      if (error instanceof PortalApiError && (error.status === 401 || error.status === 403)) {
        session.clear();
        return null;
      }
      throw error;
    }
  }

  function logout(): void {
    session.clear();
  }

  return { login, fetchMe, restore, logout, request, baseUrl };
}

export const portalApi = createPortalApi();
