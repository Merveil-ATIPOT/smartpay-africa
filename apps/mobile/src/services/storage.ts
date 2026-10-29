import * as SecureStore from "expo-secure-store";

const memory = new Map<string, string>();

async function canUseSecureStore(): Promise<boolean> {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function storageGet(key: string): Promise<string | null> {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }
  return memory.get(key) ?? null;
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
    });
    return;
  }
  memory.set(key, value);
}

export async function storageDelete(key: string): Promise<void> {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  memory.delete(key);
}

export const STORAGE_KEYS = {
  access: "smartpay.jwt.access",
  refresh: "smartpay.jwt.refresh",
  apiBase: "smartpay.api.base",
} as const;
