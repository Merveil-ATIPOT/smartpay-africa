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

/** IPv4 privée LAN (hors loopback / émulateur 10.0.2.2). */
export function isPrivateLanIpv4(host: string): boolean {
  const value = host.trim().toLowerCase();
  if (isLoopbackHost(value) || value === "10.0.2.2") {
    return false;
  }
  const parts = value.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  if (parts[0] === 10) {
    return true;
  }
  if (parts[0] === 192 && parts[1] === 168) {
    return true;
  }
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
    return true;
  }
  return false;
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

/**
 * Sans marque « user », une ancienne URL SecureStore cède la place à
 * EXPO_PUBLIC_API_URL. Une URL enregistrée explicitement est conservée.
 */
export function resolveApiBaseUrl(options: {
  override?: string | null;
  /** true seulement si l'utilisateur a enregistré l'URL (pas un ancien SecureStore). */
  explicit?: boolean;
  envUrl: string;
  metroHost?: string | null;
}): {
  base: string;
  replacedStaleOverride: boolean;
  previousOverride?: string;
  persistReplacement: boolean;
} {
  const envBase = rewriteLoopbackToLan(options.envUrl.trim().replace(/\/$/, ""), options.metroHost);
  const unchanged = {
    replacedStaleOverride: false,
    persistReplacement: false,
  } as const;
  const overrideRaw = (options.override ?? "").trim().replace(/\/$/, "");
  if (!overrideRaw) {
    return { base: envBase, ...unchanged };
  }
  const overrideBase = rewriteLoopbackToLan(overrideRaw, options.metroHost);
  if (!options.explicit && overrideBase !== envBase) {
    return {
      base: envBase,
      replacedStaleOverride: true,
      previousOverride: overrideBase,
      persistReplacement: false,
    };
  }
  return { base: options.explicit ? overrideBase : envBase, ...unchanged };
}

export const NETWORK = "regtest" as const;
