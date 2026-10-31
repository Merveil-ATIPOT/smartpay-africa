import type { UserProfile } from "@smartpay/contracts";

import {
  createRegisterApiCall,
  type RegisterFormValues,
  type RegisterResponse,
} from "../lib/registerForm";
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

/** Inscription anonyme. Aucun JWT n'est lu ni stocké. */
export async function registerAccount(values: RegisterFormValues): Promise<RegisterResponse> {
  const call = createRegisterApiCall(values);
  return api.request<RegisterResponse>(call.path, {
    method: call.method,
    auth: call.auth,
    body: call.body,
  });
}

export async function fetchMe(): Promise<UserProfile> {
  return api.request<UserProfile>("/api/v1/me/");
}

export async function logout(): Promise<void> {
  await api.clearTokens();
}
