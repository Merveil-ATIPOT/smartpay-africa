import type { UserProfile } from "@smartpay/contracts";

import { api } from "./api";

export async function login(email: string, password: string): Promise<UserProfile> {
  const tokens = await api.request<{ access: string; refresh: string }>("/api/v1/auth/token/", {
    method: "POST",
    auth: false,
    body: { email: email.trim(), password },
  });
  await api.setTokens(tokens);
  return fetchMe();
}

export async function fetchMe(): Promise<UserProfile> {
  return api.request<UserProfile>("/api/v1/me/");
}

export async function logout(): Promise<void> {
  await api.clearTokens();
}
