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

export const NETWORK = "regtest" as const;
