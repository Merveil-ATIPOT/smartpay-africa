export type ClientPlatform = "ios" | "android" | "web" | "windows" | "macos" | string;

export function defaultApiUrl(platform: ClientPlatform = "ios"): string {
  const fromEnv = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (platform === "android") {
    return "http://10.0.2.2:8000";
  }
  return "http://127.0.0.1:8000";
}

export function isLoopbackHost(host: string): boolean {
  const value = host.trim().toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "0.0.0.0" || value === "::1" || value === "[::1]";
}

/** Sur un téléphone physique, localhost pointe vers le téléphone, pas vers Django. */
export function rewriteLoopbackToLan(apiUrl: string, metroHost?: string | null): string {
  const clean = apiUrl.trim().replace(/\/$/, "");
  if (!metroHost) {
    return clean;
  }
  const lan = metroHost.split(":")[0]?.trim();
  if (!lan || isLoopbackHost(lan)) {
    return clean;
  }
  try {
    const parsed = new URL(clean);
    if (!isLoopbackHost(parsed.hostname)) {
      return clean;
    }
    parsed.hostname = lan;
    return parsed.origin;
  } catch {
    return clean;
  }
}

export const NETWORK = "regtest" as const;
